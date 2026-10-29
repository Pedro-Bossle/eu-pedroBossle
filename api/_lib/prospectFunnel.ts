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
  },
  executor: {
    aprovado: ["enviado", "invalido"],
    enviado: ["followup", "respondeu", "nao_contatar", "invalido"],
    followup: ["respondeu", "nao_contatar", "sem_resposta", "invalido"],
  },
};

/** Etapas em que o Dev Bossle pode criar ou reescrever um lead. */
export const PROSPECTOR_EDITABLE: readonly Stage[] = ["encontrado", "aguardando"];

/** Etapas em que o Dev Bossle pode criar um lead novo. */
export const PROSPECTOR_CREATE: readonly Stage[] = [
  "encontrado",
  "aguardando",
  "descartado",
  "banco_b",
  "revisar",
];

export function canMove(actor: Actor, from: Stage, to: Stage): boolean {
  if (from === to) return false;
  if (actor === "pedro") return true;
  return (BOT_TRANSITIONS[actor][from] ?? []).includes(to);
}

/** Saídas exigem motivo; aprovação exige mensagem e WhatsApp. */
export function validateMove(
  lead: { whatsapp: string; message: string; score: number | null },
  to: Stage,
  opts: { note: string; result?: string },
): string | null {
  if ((EXIT_STAGES as readonly string[]).includes(to) && !opts.note.trim()) {
    return "Informe o motivo da saída do funil";
  }
  if (to === "aguardando" && (lead.score == null || lead.score < 70)) {
    return "Só lead A (nota 70 ou mais) vai para aprovação";
  }
  if (to === "aprovado") {
    if (!lead.message.trim()) return "Lead sem mensagem para aprovar";
    if (lead.whatsapp.replace(/\D/g, "").length < 10) return "Lead sem WhatsApp válido";
  }
  if (to === "resultado" && opts.result !== "fechado" && opts.result !== "perdido") {
    return "Resultado deve ser fechado ou perdido";
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
    `SELECT id, stage, whatsapp, message, score, followup_approved_at
     FROM prospect_leads WHERE id = $1 FOR UPDATE`,
    [input.id],
  );
  const cur = rows[0] as
    | {
        id: string;
        stage: Stage;
        whatsapp: string;
        message: string;
        score: number | null;
        followup_approved_at: unknown;
      }
    | undefined;
  if (!cur) return { ok: false, status: 404, error: "Lead não encontrado" };
  if (input.to === "followup" && !cur.followup_approved_at) {
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
  const problem = validateMove({ ...cur, message }, input.to, { note, result: input.result });
  if (problem) return { ok: false, status: 400, error: problem };

  const now = "now()";
  const sets = [`stage = $2`, `stage_changed_at = ${now}`, `updated_at = ${now}`, `message = $3`];
  const params: unknown[] = [input.id, input.to, message];

  if ((EXIT_STAGES as readonly string[]).includes(input.to)) {
    params.push(note);
    sets.push(`exit_reason = $${params.length}`);
  }
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

export type BotIdentity = { id: string; name: string; role: BotRole };

/** Lê `Authorization: Bearer dbb_…` e devolve o bot, ou null. */
export async function readBot(req: VercelRequest): Promise<BotIdentity | null> {
  const header = String(req.headers.authorization ?? "");
  const m = header.match(/^Bearer\s+(dbb_[A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const hash = hashToken(m[1]);
  return withAuth(async (db) => {
    const { rows } = await db.query(
      `UPDATE bot_tokens SET last_used_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL
       RETURNING id, name, role, token_hash`,
      [hash],
    );
    const row = rows[0] as
      | { id: string; name: string; role: BotRole; token_hash: string }
      | undefined;
    if (!row) return null;
    const a = Buffer.from(row.token_hash, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { id: row.id, name: row.name, role: row.role };
  });
}

/** Só dígitos, sem o 55 do país: usado para achar o mesmo WhatsApp escrito de jeitos diferentes. */
export function phoneKey(raw: string): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

// ---------- Autenticação dos bots nas rotas ----------


/** Exige token de bot com o papel certo. Responde 401/403/429 e devolve null quando falha. */
export async function requireBot(
  req: VercelRequest,
  res: VercelResponse,
  roles: readonly BotRole[],
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
  if (!roles.includes(bot.role)) {
    json(res, 403, { error: "Este bot não tem permissão para esta rota" });
    return null;
  }
  return bot;
}

/** Cidades atendidas pela prospecção. */
export const ALLOWED_CITIES = ["caxias do sul", "farroupilha", "são marcos", "sao marcos"];

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
