import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json } from "./auth.js";
import { withAuth } from "./db.js";
import { clientIp, rateLimit } from "./rateLimit.js";

// ---------- Etapas ----------

/** Etapas do funil, na ordem. "resultado" guarda fechado/perdido em `result`. */
export const FUNNEL_STAGES = [
  "encontrado",
  "aguardando",
  "aprovado",
  "enviado",
  "followup",
  "respondeu",
  "proposta",
  "resultado",
] as const;

/** Saídas do funil (o lead para de andar, mas fica registrado para não repetir). */
export const EXIT_STAGES = [
  "descartado",
  "banco_b",
  "revisar",
  "nao_contatar",
  "sem_resposta",
  "invalido",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];
export type ExitStage = (typeof EXIT_STAGES)[number];
export type Stage = FunnelStage | ExitStage;

export const ALL_STAGES: readonly Stage[] = [...FUNNEL_STAGES, ...EXIT_STAGES];

export const isStage = (v: unknown): v is Stage =>
  typeof v === "string" && (ALL_STAGES as readonly string[]).includes(v);

// ---------- Quem pode mover o quê ----------

export type Actor = "pedro" | "prospector" | "executor";
export type BotRole = Exclude<Actor, "pedro">;

export const ACTOR_LABEL: Record<Actor, string> = {
  pedro: "pedro",
  prospector: "bot:dev-bossle",
  executor: "bot:whatsapp",
};

/**
 * Transições permitidas para cada bot. Pedro pode mover qualquer lead para
 * qualquer etapa pelo painel; os bots só seguem estas setas.
 * Aprovar (aguardando → aprovado) é exclusivo do Pedro.
 */
const BOT_TRANSITIONS: Record<BotRole, Partial<Record<Stage, readonly Stage[]>>> = {
  prospector: {
    encontrado: ["aguardando", "descartado", "banco_b", "revisar"],
    aguardando: ["descartado", "banco_b", "revisar"],
    revisar: ["aguardando", "descartado", "banco_b"],
  },
  executor: {
    aprovado: ["enviado", "invalido"],
    enviado: ["followup", "respondeu", "nao_contatar", "invalido"],
    followup: ["respondeu", "nao_contatar", "sem_resposta", "invalido"],
  },
};

/** Etapas em que o Dev Bossle pode criar ou reescrever um lead. */
export const PROSPECTOR_EDITABLE: readonly Stage[] = ["encontrado", "aguardando", "revisar"];

/** Etapas em que o Dev Bossle pode criar um lead novo. */
export const PROSPECTOR_CREATE: readonly Stage[] = [
  "encontrado",
  "aguardando",
  "descartado",
  "banco_b",
  "revisar",
];

export function canMove(actor: Actor, from: Stage, to: Stage): boolean {
  // Pedro pode trocar fechado ↔ perdido sem sair do Resultado
  if (actor === "pedro") return from !== to || to === "resultado";
  if (from === to) return false;
  return (BOT_TRANSITIONS[actor][from] ?? []).includes(to);
}

/**
 * O que impede o movimento, ou null. Para todos: saída exige motivo, aprovar exige
 * mensagem e canal, resultado exige fechado/perdido. Só para os bots: nota 70+ para
 * ir à aprovação (Pedro decide sozinho o que manda para a fila dele).
 */
export function validateMove(
  lead: { whatsapp: string; email?: string; message: string; score: number | null },
  to: Stage,
  opts: { note: string; result?: string; actor?: Actor },
): string | null {
  if ((EXIT_STAGES as readonly string[]).includes(to) && !opts.note.trim()) {
    return "Informe o motivo da saída do funil";
  }
  if (to === "aguardando" && opts.actor !== "pedro" && (lead.score == null || lead.score < 70)) {
    return "Só lead A (nota 70 ou mais) vai para aprovação";
  }
  if (to === "aprovado") {
    if (!lead.message.trim()) return "Escreva a mensagem antes de aprovar";
    if (leadChannel(lead) === "none") return "Lead sem WhatsApp nem e-mail válido: edite o contato antes de aprovar";
  }
  if (to === "resultado" && opts.result !== "fechado" && opts.result !== "perdido") {
    return "Escolha fechado ou perdido";
  }
  return null;
}

// ---------- Mudança de etapa ----------

export type MoveInput = {
  id: string;
  to: Stage;
  actor: Actor;
  note?: string;
  result?: string;
  /** Pedro aprova o texto que está vendo na tela. */
  message?: string;
  replyText?: string;
};

export type MoveResult =
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; status: number; error: string };

/** Move um lead de etapa com trava de linha, validação e registro no histórico. */
export async function moveLead(db: PoolClient, input: MoveInput): Promise<MoveResult> {
  const { rows } = await db.query(
    `SELECT id, stage, whatsapp, email, message, score, followup_approved_at
     FROM prospect_leads WHERE id = $1 FOR UPDATE`,
    [input.id],
  );
  const cur = rows[0] as
    | {
        id: string;
        stage: Stage;
        whatsapp: string;
        email: string;
        message: string;
        score: number | null;
        followup_approved_at: unknown;
      }
    | undefined;
  if (!cur) return { ok: false, status: 404, error: "Lead não encontrado" };
  // O bot só manda follow-up aprovado; Pedro pode registrar um que mandou por fora
  if (input.to === "followup" && input.actor !== "pedro" && !cur.followup_approved_at) {
    return { ok: false, status: 409, error: "Follow-up ainda não aprovado por Pedro" };
  }

  if (!canMove(input.actor, cur.stage, input.to)) {
    return {
      ok: false,
      status: 409,
      error: `Movimento não permitido: ${cur.stage} → ${input.to}`,
    };
  }

  const note = String(input.note ?? "").trim().slice(0, 500);
  const message =
    input.actor === "pedro" && typeof input.message === "string"
      ? input.message.trim().slice(0, 2000)
      : cur.message;
  const problem = validateMove({ ...cur, message }, input.to, { note, result: input.result, actor: input.actor });
  if (problem) return { ok: false, status: 400, error: problem };

  const now = "now()";
  const sets = [`stage = $2`, `stage_changed_at = ${now}`, `updated_at = ${now}`, `message = $3`];
  const params: unknown[] = [input.id, input.to, message];

  if ((EXIT_STAGES as readonly string[]).includes(input.to)) {
    params.push(note);
    sets.push(`exit_reason = $${params.length}`);
  } else {
    // Voltou para o funil: o motivo da saída antiga não vale mais
    sets.push(`exit_reason = ''`);
  }
  // Saiu do Resultado: limpa fechado/perdido para não mostrar selo antigo
  if (input.to !== "resultado") sets.push(`result = ''`);
  if (input.to === "resultado") {
    params.push(input.result);
    sets.push(`result = $${params.length}`);
  }
  // Mantém as colunas antigas (sent/replied) coerentes para a tela atual
  if (input.to === "enviado") sets.push(`sent = true`, `sent_at = coalesce(sent_at, ${now})`);
  if (input.to === "followup") sets.push(`followup_at = ${now}`);
  if (input.to === "respondeu") {
    sets.push(`replied = true`, `replied_at = coalesce(replied_at, ${now})`);
    if (input.replyText) {
      params.push(String(input.replyText).slice(0, 2000));
      sets.push(`reply_text = $${params.length}`);
    }
  }

  const upd = await db.query(
    `UPDATE prospect_leads SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params,
  );
  await db.query(
    `INSERT INTO prospect_events (lead_id, from_stage, to_stage, actor, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.id, cur.stage, input.to, ACTOR_LABEL[input.actor], note],
  );
  return { ok: true, row: upd.rows[0] as Record<string, unknown> };
}

// ---------- Tokens dos bots ----------

export const hashToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

/** Gera um token novo. Só o hash vai para o banco; o texto aparece uma única vez. */
export function newBotToken() {
  const token = `dbb_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hashToken(token), last4: token.slice(-4) };
}

/** Grupos de rotas que uma chave pode liberar (escolhidos no painel ao criar). */
export const BOT_SCOPES = ["funil", "mensagens", "instagram"] as const;
export type BotScope = (typeof BOT_SCOPES)[number];
export const isBotScope = (v: unknown): v is BotScope =>
  typeof v === "string" && (BOT_SCOPES as readonly string[]).includes(v);

/** Chaves criadas antes do 021 só têm papel: funil (prospector) ou mensagens (executor). */
const ROLE_SCOPE: Record<BotRole, BotScope> = { prospector: "funil", executor: "mensagens" };

export type BotIdentity = { id: string; name: string; scopes: BotScope[] };

/** Lê `Authorization: Bearer dbb_…` e devolve o bot, ou null. */
export async function readBot(req: VercelRequest): Promise<BotIdentity | null> {
  const header = String(req.headers.authorization ?? "");
  const m = header.match(/^Bearer\s+(dbb_[A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const hash = hashToken(m[1]);
  return withAuth(async (db) => {
    // to_jsonb(...)->'scopes' não quebra se o 021 ainda não rodou (vem null)
    const { rows } = await db.query(
      `UPDATE bot_tokens SET last_used_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL
       RETURNING id, name, role, token_hash, to_jsonb(bot_tokens.*) -> 'scopes' AS scopes`,
      [hash],
    );
    const row = rows[0] as
      | { id: string; name: string; role: BotRole | null; token_hash: string; scopes: unknown }
      | undefined;
    if (!row) return null;
    const a = Buffer.from(row.token_hash, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    let scopes = (Array.isArray(row.scopes) ? row.scopes : []).filter(isBotScope);
    if (!scopes.length && row.role && ROLE_SCOPE[row.role]) scopes = [ROLE_SCOPE[row.role]];
    return { id: row.id, name: row.name, scopes };
  });
}

/** Papel no funil que este bot usa para mover um lead de `from` para `to`, ou null. */
export function botActorFor(bot: BotIdentity, from: Stage, to: Stage): BotRole | null {
  if (bot.scopes.includes("funil") && canMove("prospector", from, to)) return "prospector";
  if (bot.scopes.includes("mensagens") && canMove("executor", from, to)) return "executor";
  return null;
}

/** Diz se a requisição traz uma chave de bot (para rotas que também aceitam a sessão do Pedro). */
export const hasBotToken = (req: VercelRequest) =>
  /^Bearer\s+dbb_/.test(String(req.headers.authorization ?? ""));

/** Só dígitos, sem o 55 do país: usado para achar o mesmo WhatsApp escrito de jeitos diferentes. */
export function phoneKey(raw: string): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

// ---------- Autenticação dos bots nas rotas ----------


/** Exige chave de bot com pelo menos uma das permissões. Responde 401/403/429 e devolve null quando falha. */
export async function requireBot(
  req: VercelRequest,
  res: VercelResponse,
  scopes: readonly BotScope[],
): Promise<BotIdentity | null> {
  const limit = rateLimit(`bot:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    json(res, 429, { error: "Muitas requisições" });
    return null;
  }
  const bot = await readBot(req);
  if (!bot) {
    json(res, 401, { error: "Token de bot ausente ou revogado" });
    return null;
  }
  if (!bot.scopes.some((s) => scopes.includes(s))) {
    json(res, 403, { error: `Esta chave não tem permissão para esta rota (precisa de: ${scopes.join(" ou ")})` });
    return null;
  }
  return bot;
}

// ---------- Regras editáveis (019) ----------

export type ProspectRules = { cities: string[]; allowWebsite: boolean };

/** Padrão quando a tabela ainda não existe: qualquer cidade, aceita site ruim. */
export const DEFAULT_RULES: ProspectRules = { cities: [], allowWebsite: true };

type Queryable = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> };

export async function loadRules(db: Queryable): Promise<ProspectRules> {
  try {
    const { rows } = await db.query(`SELECT cities, allow_website FROM prospect_rules WHERE id`);
    const r = rows[0];
    if (!r) return DEFAULT_RULES;
    return { cities: (r.cities as string[]) ?? [], allowWebsite: r.allow_website !== false };
  } catch {
    return DEFAULT_RULES;
  }
}

const cityKey = (c: string) =>
  c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s*[-/,]\s*rs$/i, "").trim().toLowerCase();

/** Lista vazia aceita qualquer cidade; senão compara sem acento e ignora "- RS". */
export function cityAllowed(rules: ProspectRules, city: string): boolean {
  if (!rules.cities.length) return true;
  const k = cityKey(city);
  return rules.cities.some((c) => cityKey(c) === k);
}

/** Canal do primeiro contato: WhatsApp quando há número válido, senão e-mail. */
export function leadChannel(lead: { whatsapp: string; email?: string }): "whatsapp" | "email" | "none" {
  if (lead.whatsapp.replace(/\D/g, "").length >= 10) return "whatsapp";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((lead.email ?? "").trim())) return "email";
  return "none";
}

/** Janela de envio: seg–sex, 9h–11h30 e 14h–17h30 em Brasília. */
export function inSendWindow(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = get("weekday");
  if (wd === "Sat" || wd === "Sun") return false;
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  return (mins >= 540 && mins < 690) || (mins >= 840 && mins < 1050);
}

/** Limite de primeiros contatos por dia (regra do prompt dos bots). */
export const DAILY_FIRST_CONTACTS = 15;
