import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import {
  EXIT_STAGES,
  PROSPECTOR_CREATE,
  PROSPECTOR_EDITABLE,
  cityAllowed,
  isStage,
  leadChannel,
  loadRules,
  moveLead,
  phoneKey,
  requireBot,
  type Stage,
} from "../../_lib/prospectFunnel.js";
import { mapProspect, sanitizeProspect, type ProspectInput } from "../../_lib/prospects.js";

type BotLeadBody = ProspectInput & {
  stage?: string;
  /** Motivo, obrigatório para descartado / banco_b / revisar. */
  note?: string;
  score?: number;
  scoreBreakdown?: { label: string; points: number; max: number }[];
  phoneSources?: string[];
  siteCheck?: string;
  activity?: string;
  detail?: string;
  projectType?: string;
};

const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

/** Acha o lead pelo nome + cidade ou pelo mesmo WhatsApp. */
async function findExisting(
  db: Parameters<Parameters<typeof withAuth>[0]>[0],
  name: string,
  city: string,
  whatsapp: string,
) {
  const key = phoneKey(whatsapp);
  const { rows } = await db.query(
    `SELECT id, stage FROM prospect_leads
     WHERE (lower(name) = lower($1) AND lower(city) = lower($2))
        OR ($3 <> '' AND regexp_replace(whatsapp, '\\D', '', 'g') IN ($3, '55' || $3))
     ORDER BY created_at LIMIT 1`,
    [name, city, key.length >= 10 ? key : ""],
  );
  return rows[0] as { id: string; stage: Stage } | undefined;
}

/**
 * Leads de uma etapa com a mensagem final (a que Pedro aprovou) e a que o bot escreveu,
 * para o bot comparar as edições. `since` filtra pela data em que o lead entrou na etapa.
 */
async function listStage(req: VercelRequest, res: VercelResponse, stage: Stage) {
  const limit = Math.max(1, Math.min(200, Number.parseInt(String(req.query.limit ?? "50"), 10) || 50));
  const sinceRaw = clip(req.query.since, 40);
  const since = sinceRaw ? new Date(sinceRaw) : null;
  if (since && Number.isNaN(since.getTime())) return json(res, 400, { error: "since inválido (use ISO 8601)" });

  const rows = await withAuth(async (db) => {
    const { rows } = await db.query(
      `SELECT l.id, l.name, l.niche, l.city, l.stage, l.email, l.whatsapp, l.message,
              coalesce(to_jsonb(l.*) ->> 'bot_message', '') AS bot_message,
              l.stage_changed_at,
              (SELECT max(e.created_at) FROM prospect_events e
                WHERE e.lead_id = l.id AND e.to_stage = 'aprovado') AS approved_at
       FROM prospect_leads l
       WHERE l.stage = $1 AND ($2::timestamptz IS NULL OR l.stage_changed_at >= $2)
       ORDER BY l.stage_changed_at DESC
       LIMIT $3`,
      [stage, since, limit],
    );
    return rows;
  });

  const leads = rows.map((r) => {
    const message = String(r.message ?? "");
    const botMessage = String(r.bot_message ?? "");
    return {
      id: String(r.id),
      name: String(r.name ?? ""),
      niche: String(r.niche ?? ""),
      city: String(r.city ?? ""),
      stage: String(r.stage),
      channel: leadChannel({ whatsapp: String(r.whatsapp ?? ""), email: String(r.email ?? "") }),
      email: String(r.email ?? ""),
      whatsapp: String(r.whatsapp ?? ""),
      /** Texto final, como Pedro aprovou. */
      message,
      /** Texto como o bot mandou ("" em leads antigos, de antes do registro). */
      botMessage,
      edited: Boolean(botMessage) && botMessage.trim() !== message.trim(),
      approvedAt: r.approved_at ?? null,
      stageChangedAt: r.stage_changed_at ?? null,
    };
  });
  return json(res, 200, { stage, count: leads.length, leads });
}

/**
 * GET ?stage=aprovado[&since=&limit=] → leads da etapa com e-mail, WhatsApp e mensagem final
 *   (chaves com funil ou mensagens).
 * Bot Dev Bossle (chave com funil):
 * GET ?name=&city=&whatsapp= → { exists, stage } para checar duplicado antes de pesquisar.
 * POST { ...lead, stage, note?, score, ... } → cria ou atualiza o lead (só em Encontrado/Aguardando).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const listing = req.method === "GET" && req.query.stage !== undefined;
  const bot = await requireBot(req, res, listing ? ["funil", "mensagens"] : ["funil"]);
  if (!bot) return;

  try {
    if (listing) {
      if (!isStage(req.query.stage)) return json(res, 400, { error: "Etapa inválida" });
      return await listStage(req, res, req.query.stage);
    }

    if (req.method === "GET") {
      const hit = await withAuth((db) =>
        findExisting(db, clip(req.query.name, 200), clip(req.query.city, 120), clip(req.query.whatsapp, 40)),
      );
      return json(res, 200, { exists: Boolean(hit), stage: hit?.stage ?? null });
    }

    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = readBody<BotLeadBody>(req);
    if (!body) return json(res, 400, { error: "JSON inválido" });
    const clean = sanitizeProspect({ ...body, source: "bot", sent: false, replied: false });
    if (!clean.name || !clean.city) return json(res, 400, { error: "Nome e cidade são obrigatórios" });

    const stage: Stage = isStage(body.stage) ? body.stage : "encontrado";
    if (!PROSPECTOR_CREATE.includes(stage)) {
      return json(res, 403, { error: `O Dev Bossle não pode registrar na etapa ${stage}` });
    }
    const note = clip(body.note, 500);
    if ((EXIT_STAGES as readonly string[]).includes(stage) && !note) {
      return json(res, 400, { error: "Informe o motivo (note) para descartado, banco_b ou revisar" });
    }

    const score =
      typeof body.score === "number" && Number.isFinite(body.score)
        ? Math.max(0, Math.min(100, Math.round(body.score)))
        : null;
    const phoneSources = Array.isArray(body.phoneSources)
      ? body.phoneSources.map((s) => clip(s, 80)).filter(Boolean).slice(0, 6)
      : [];
    const extra = {
      score,
      breakdown: JSON.stringify(Array.isArray(body.scoreBreakdown) ? body.scoreBreakdown.slice(0, 12) : []),
      phoneSources,
      siteCheck: clip(body.siteCheck, 500),
      activity: clip(body.activity, 500),
      detail: clip(body.detail, 300),
      projectType: body.projectType === "sistema" ? "sistema" : "landing",
    };

    const result = await withAuth(async (db) => {
      // Regras editáveis no painel (Funil → Regras do funil)
      const rules = await loadRules(db);
      const fail = (error: string) => ({ status: 400, body: { error } });
      if (!cityAllowed(rules, clean.city)) {
        return fail(`Cidade fora da área configurada no painel: ${rules.cities.join(", ")}`);
      }

      // Regras garantidas no servidor: só lead A, confirmado, vai para aprovação
      if (stage === "aguardando") {
        if (clean.website && !rules.allowWebsite) return fail("Lead com site não entra no funil (regra do painel)");
        if (!extra.siteCheck) return fail("Descreva as checagens de site (siteCheck)");
        if (score == null || score < 70) return fail("Só lead A (nota 70 ou mais)");
        if (!clean.message) return fail("Lead A precisa da mensagem pronta");
        const channel = leadChannel(clean);
        if (channel === "none") return fail("Lead precisa de WhatsApp ou e-mail válido");
        if (channel === "whatsapp" && phoneSources.length < 2) return fail("Telefone precisa de 2 fontes oficiais");
      }

      const existing = await findExisting(db, clean.name, clean.city, clean.whatsapp);
      if (existing && !PROSPECTOR_EDITABLE.includes(existing.stage)) {
        return { status: 409, body: { error: "duplicado", id: existing.id, stage: existing.stage } };
      }

      const cols = `name = $2, niche = $3, city = $4, address = $5, neighborhood = $6, website = $7,
        email = $8, whatsapp = $9, phone = $10, instagram = $11, problems = $12, pitch = $13,
        message = $14, maps_url = $15, score = $16, score_breakdown = $17::jsonb,
        phone_sources = $18, site_check = $19, activity = $20, detail = $21, project_type = $22`;
      const params = [
        clean.name, clean.niche, clean.city, clean.address, clean.neighborhood, clean.website,
        clean.email, clean.whatsapp, clean.phone, clean.instagram, clean.problems, clean.pitch,
        clean.message, clean.mapsUrl, extra.score, extra.breakdown, extra.phoneSources,
        extra.siteCheck, extra.activity, extra.detail, extra.projectType,
      ];

      let id: string;
      if (existing) {
        id = existing.id;
        await db.query(`UPDATE prospect_leads SET ${cols}, updated_at = now() WHERE id = $1`, [id, ...params]);
        if (existing.stage !== stage) {
          const moved = await moveLead(db, { id, to: stage, actor: "prospector", note });
          if (!moved.ok) return { status: moved.status, body: { error: moved.error } };
        }
      } else {
        const { rows } = await db.query(
          `INSERT INTO prospect_leads (
             name, niche, city, address, neighborhood, website, email, whatsapp, phone,
             instagram, problems, pitch, message, maps_url, score, score_breakdown,
             phone_sources, site_check, activity, detail, project_type,
             source, stage, exit_reason
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19,$20,$21,
             'bot', $22, $23)
           RETURNING id`,
          [...params, stage, (EXIT_STAGES as readonly string[]).includes(stage) ? note : ""],
        );
        id = String(rows[0].id);
        await db.query(
          `INSERT INTO prospect_events (lead_id, from_stage, to_stage, actor, note)
           VALUES ($1, '', $2, 'bot:dev-bossle', $3)`,
          [id, stage, note],
        );
      }

      // Guarda o texto do bot para comparar com o aprovado (savepoint: não quebra sem o 021)
      await db.query("SAVEPOINT bot_message");
      try {
        await db.query(`UPDATE prospect_leads SET bot_message = $2 WHERE id = $1`, [id, clean.message]);
        await db.query("RELEASE SAVEPOINT bot_message");
      } catch {
        await db.query("ROLLBACK TO SAVEPOINT bot_message");
      }

      const { rows } = await db.query(`SELECT * FROM prospect_leads WHERE id = $1`, [id]);
      return { status: existing ? 200 : 201, body: { lead: mapProspect(rows[0] as Record<string, unknown>) } };
    });

    return json(res, result.status, result.body);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao registrar o lead" });
  }
}
