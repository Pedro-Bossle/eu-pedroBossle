import type { PoolClient } from "@neondatabase/serverless";

export type ProspectLead = {
  id: string;
  name: string;
  niche: string;
  city: string;
  address: string;
  neighborhood: string;
  website: string;
  email: string;
  whatsapp: string;
  phone: string;
  instagram: string;
  problems: string;
  pitch: string;
  message: string;
  mapsUrl: string;
  source: string;
  sent: boolean;
  sentAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  created: string;
  updated: string;
  /** Funil (009) */
  stage: string;
  stageChangedAt: string | null;
  exitReason: string;
  result: string;
  score: number | null;
  scoreBreakdown: { label: string; points: number; max: number }[];
  phoneSources: string[];
  siteCheck: string;
  activity: string;
  detail: string;
  projectType: string;
  followupMessage: string;
  followupApprovedAt: string | null;
  followupAt: string | null;
  replyText: string;
};

/** Campos que o painel envia ao criar, editar ou importar um lead. */
export type ProspectInput = Partial<
  Omit<
    ProspectLead,
    | "id" | "created" | "updated" | "sentAt" | "repliedAt"
    | "stage" | "stageChangedAt" | "exitReason" | "result" | "score" | "scoreBreakdown"
    | "phoneSources" | "siteCheck" | "activity" | "detail" | "projectType"
    | "followupMessage" | "followupApprovedAt" | "followupAt" | "replyText"
  >
> & { id?: string };

export const PROSPECT_COLUMNS = `id, name, niche, city, address, neighborhood, website, email,
  whatsapp, phone, instagram, problems, pitch, message, maps_url, source,
  sent, sent_at, replied, replied_at, created_at, updated_at,
  stage, stage_changed_at, exit_reason, result, score, score_breakdown, phone_sources,
  site_check, activity, detail, project_type, followup_message, followup_approved_at,
  followup_at, reply_text`;

const iso = (v: unknown): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);

export function mapProspect(row: Record<string, unknown>): ProspectLead {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    niche: String(row.niche ?? ""),
    city: String(row.city ?? ""),
    address: String(row.address ?? ""),
    neighborhood: String(row.neighborhood ?? ""),
    website: String(row.website ?? ""),
    email: String(row.email ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    phone: String(row.phone ?? ""),
    instagram: String(row.instagram ?? ""),
    problems: String(row.problems ?? ""),
    pitch: String(row.pitch ?? ""),
    message: String(row.message ?? ""),
    mapsUrl: String(row.maps_url ?? ""),
    source: String(row.source ?? "manual"),
    sent: Boolean(row.sent),
    sentAt: iso(row.sent_at),
    replied: Boolean(row.replied),
    repliedAt: iso(row.replied_at),
    created: iso(row.created_at) ?? "",
    updated: iso(row.updated_at) ?? "",
    stage: String(row.stage ?? "encontrado"),
    stageChangedAt: iso(row.stage_changed_at),
    exitReason: String(row.exit_reason ?? ""),
    result: String(row.result ?? ""),
    score: row.score == null ? null : Number(row.score),
    scoreBreakdown: Array.isArray(row.score_breakdown)
      ? (row.score_breakdown as ProspectLead["scoreBreakdown"])
      : [],
    phoneSources: Array.isArray(row.phone_sources) ? (row.phone_sources as string[]) : [],
    siteCheck: String(row.site_check ?? ""),
    activity: String(row.activity ?? ""),
    detail: String(row.detail ?? ""),
    projectType: String(row.project_type ?? "landing"),
    followupMessage: String(row.followup_message ?? ""),
    followupApprovedAt: iso(row.followup_approved_at),
    followupAt: iso(row.followup_at),
    replyText: String(row.reply_text ?? ""),
  };
}

const clip = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/\s+$/g, "")
    .replace(/^\s+/g, "")
    .slice(0, max);

export function normalizeWebsite(raw: unknown): string {
  const s = clip(raw, 500);
  if (!s || /^(sem|n[aã]o|-|n\/a|nenhum|null|none)\b/i.test(s)) return "";
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(url);
    // Perfil de rede social ou link de WhatsApp não conta como site
    if (/(^|\.)(instagram\.com|facebook\.com|fb\.com|linktr\.ee|wa\.me|whatsapp\.com)$/i.test(u.hostname)) return "";
    return u.hostname.includes(".") ? u.toString().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
}

export function normalizeInstagram(raw: unknown): string {
  const s = clip(raw, 200);
  if (!s) return "";
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (m ? m[1] : s).replace(/^@/, "").replace(/\/$/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : "";
}

function normalizeMapsUrl(raw: unknown): string {
  const s = clip(raw, 1000);
  return /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(s)
    ? s
    : "";
}

/** Limpa um lead vindo do painel ou de importação ("gemini" fica aceito para leads antigos). */
export function sanitizeProspect(input: ProspectInput) {
  return {
    name: clip(input.name, 200),
    niche: clip(input.niche, 120),
    city: clip(input.city, 120),
    address: clip(input.address, 300),
    neighborhood: clip(input.neighborhood, 120),
    website: normalizeWebsite(input.website),
    email: clip(input.email, 200).toLowerCase(),
    whatsapp: clip(input.whatsapp, 40),
    phone: clip(input.phone, 40),
    instagram: normalizeInstagram(input.instagram),
    problems: clip(input.problems, 2000),
    pitch: clip(input.pitch, 2000),
    message: clip(input.message, 2000),
    mapsUrl: normalizeMapsUrl(input.mapsUrl),
    source: ["manual", "import", "gemini", "bot"].includes(String(input.source))
      ? String(input.source)
      : "manual",
    sent: input.sent === true,
    replied: input.replied === true,
  };
}

export type CleanProspect = ReturnType<typeof sanitizeProspect>;

/**
 * Insere ou mescla pelo par nome + cidade. Campos vazios não apagam
 * o que já existe e o status só avança (Enviado/Respondeu nunca são desmarcados aqui).
 */
export async function upsertProspect(
  db: PoolClient,
  p: CleanProspect,
): Promise<{ lead: ProspectLead; inserted: boolean }> {
  const { rows } = await db.query(
    `INSERT INTO prospect_leads (
       name, niche, city, address, neighborhood, website, email, whatsapp, phone,
       instagram, problems, pitch, message, maps_url, source,
       sent, sent_at, replied, replied_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
       $16, CASE WHEN $16 THEN now() END, $17, CASE WHEN $17 THEN now() END
     )
     ON CONFLICT (lower(name), lower(city)) DO UPDATE SET
       niche = COALESCE(NULLIF(EXCLUDED.niche, ''), prospect_leads.niche),
       address = COALESCE(NULLIF(EXCLUDED.address, ''), prospect_leads.address),
       neighborhood = COALESCE(NULLIF(EXCLUDED.neighborhood, ''), prospect_leads.neighborhood),
       website = COALESCE(NULLIF(EXCLUDED.website, ''), prospect_leads.website),
       email = COALESCE(NULLIF(EXCLUDED.email, ''), prospect_leads.email),
       whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), prospect_leads.whatsapp),
       phone = COALESCE(NULLIF(EXCLUDED.phone, ''), prospect_leads.phone),
       instagram = COALESCE(NULLIF(EXCLUDED.instagram, ''), prospect_leads.instagram),
       problems = COALESCE(NULLIF(EXCLUDED.problems, ''), prospect_leads.problems),
       pitch = COALESCE(NULLIF(EXCLUDED.pitch, ''), prospect_leads.pitch),
       message = COALESCE(NULLIF(EXCLUDED.message, ''), prospect_leads.message),
       maps_url = COALESCE(NULLIF(EXCLUDED.maps_url, ''), prospect_leads.maps_url),
       sent = prospect_leads.sent OR EXCLUDED.sent,
       sent_at = COALESCE(prospect_leads.sent_at, EXCLUDED.sent_at),
       replied = prospect_leads.replied OR EXCLUDED.replied,
       replied_at = COALESCE(prospect_leads.replied_at, EXCLUDED.replied_at),
       updated_at = now()
     RETURNING ${PROSPECT_COLUMNS}, (xmax = 0) AS inserted`,
    [
      p.name, p.niche, p.city, p.address, p.neighborhood, p.website, p.email,
      p.whatsapp, p.phone, p.instagram, p.problems, p.pitch, p.message,
      p.mapsUrl, p.source, p.sent, p.replied,
    ],
  );
  const row = rows[0] as Record<string, unknown>;
  return { lead: mapProspect(row), inserted: Boolean(row.inserted) };
}
