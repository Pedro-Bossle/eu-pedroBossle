import type { ProspectInput, ProspectLead } from "../../types/orcamentos";

export const DEFAULT_CITY = "Caxias do Sul";

export const plain = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

// ---------- Telefone ----------

export type ParsedPhone = { wa: string; mobile: boolean; landline: boolean };

/** Lê um telefone brasileiro e devolve o número para wa.me (55 + DDD + número). */
export function parsePhone(raw: string): ParsedPhone | null {
  const s = String(raw ?? "");
  if (!s.trim() || s.includes("*")) return null;
  let d = s.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2);
  const num = d.slice(2);
  if (ddd.startsWith("0")) return null;
  return {
    wa: `55${ddd}${num}`,
    mobile: num.length === 9 && num.startsWith("9"),
    landline: num.length === 8 && /^[2-5]/.test(num),
  };
}

/** Melhor número para WhatsApp (celular primeiro) e se o lead só tem telefone fixo. */
export function contactInfo(lead: Pick<ProspectLead, "whatsapp" | "phone">) {
  const list = [lead.whatsapp, lead.phone]
    .map(parsePhone)
    .filter((p): p is ParsedPhone => Boolean(p));
  const best = list.find((p) => p.mobile) ?? list[0] ?? null;
  return { best, onlyLandline: list.length > 0 && !list.some((p) => p.mobile) };
}

// ---------- Situação do site ----------

export type SiteStatus = "sem" | "problemas" | "ok";

export const SITE_STATUS_LABEL: Record<SiteStatus, string> = {
  sem: "Sem site",
  problemas: "Site com problemas",
  ok: "Site ok",
};

export function siteStatus(lead: Pick<ProspectLead, "website" | "problems">): SiteStatus {
  if (!lead.website.trim()) return "sem";
  return lead.problems.trim() ? "problemas" : "ok";
}

export type LeadStatus = "pendente" | "enviado" | "respondeu";

export function leadStatus(lead: Pick<ProspectLead, "sent" | "replied">): LeadStatus {
  if (lead.replied) return "respondeu";
  return lead.sent ? "enviado" : "pendente";
}

// ---------- Mensagem ----------

function firstProblem(text: string): string {
  const parts = text
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .split(/[;\n•]|\.\s/)
    .map((s) => s.trim().replace(/^[-–*]\s*/, "").replace(/\.$/, ""))
    .filter(Boolean);
  const p = parts[0] ?? "";
  return /^[A-ZÀ-Ú][a-zà-ú]/.test(p) ? p[0].toLowerCase() + p.slice(1) : p;
}

/**
 * Mensagem curta, com tom de cliente: cita o problema real do site
 * (ou por que ter um, quando não tem) e termina pedindo o número do administrativo.
 * Sem reunião, preço, avaliações ou links.
 */
export function buildMessage(
  lead: Pick<ProspectLead, "name" | "niche" | "city" | "website" | "problems">,
  senderName = "Pedro",
  now = new Date(),
): string {
  const hello = now.getHours() < 12 ? "Bom dia" : "Oi";
  const city = lead.city || DEFAULT_CITY;
  const who = `Sou o ${senderName}, da Dev Bossle, e faço sites aqui em ${city}.`;
  const ask =
    "Poderia me passar o número do administrativo ou do responsável para eu apresentar uma proposta?";
  const status = siteStatus(lead);
  if (status === "sem") {
    const what = lead.niche ? lead.niche.toLowerCase() : "esse tipo de serviço";
    return `${hello}, tudo bem? Procurei a ${lead.name} na internet e não encontrei um site de vocês. Hoje muita gente procura ${what} pelo celular antes de decidir, e acaba indo em quem aparece com mais informação. ${who} ${ask}`;
  }
  if (status === "problemas") {
    return `${hello}, tudo bem? Entrei no site da ${lead.name} e reparei que ${firstProblem(lead.problems)}. Isso pode estar fazendo vocês perderem clientes que chegam por ali. ${who} ${ask}`;
  }
  return `${hello}, tudo bem? Entrei no site da ${lead.name} e vi que dá para fazer ele trazer mais contatos para vocês. ${who} ${ask}`;
}

export const messageFor = (lead: ProspectLead, senderName?: string) =>
  lead.message.trim() ? lead.message : buildMessage(lead, senderName);

export const whatsappUrl = (wa: string, text: string) =>
  `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;

// ---------- Importação ----------

const ALIASES: Record<
  keyof Omit<
    ProspectInput,
    "id" | "source" | "mapsUrl" | "siteCheck" | "activity" | "detail" | "reviewsCount" | "lastReviewAt" | "followers" | "lastPostAt" | "investLevel" | "competitorSite"
  >,
  string[]
> = {
  name: ["nome", "name", "empresa", "negocio", "nome do negocio", "razao social", "title"],
  niche: ["nicho", "niche", "segmento", "categoria", "category", "ramo", "tipo"],
  city: ["cidade", "city", "municipio"],
  address: ["endereco", "address", "rua", "logradouro", "endereco/bairro"],
  neighborhood: ["bairro", "neighborhood", "regiao"],
  website: ["site", "website", "url", "web", "site atual"],
  email: ["email", "e-mail", "mail"],
  whatsapp: ["whatsapp", "whats", "wpp", "celular", "whatsapp/telefone"],
  phone: ["telefone", "phone", "fone", "fixo", "contato"],
  instagram: ["instagram", "ig", "insta"],
  problems: ["problemas", "problems", "problemas encontrados", "problema", "problemas do site"],
  pitch: ["argumento", "argumentos", "pitch", "observacoes", "obs", "observacao", "notas", "notes"],
  message: ["mensagem", "mensagem pronta", "message"],
  sent: ["enviado", "sent", "contatado"],
  replied: ["respondeu", "replied"],
};

const truthy = (v: unknown) =>
  v === true || /^(sim|s|yes|y|true|1|x)$/i.test(String(v ?? "").trim());

/** Converte uma linha de CSV/JSON (cabeçalhos em português ou inglês) num lead. */
export function rowToProspect(row: Record<string, unknown>): ProspectInput | null {
  const keys = Object.keys(row);
  const pick = (field: keyof typeof ALIASES) => {
    for (const alias of ALIASES[field]) {
      const k = keys.find((key) => plain(key).replace(/_/g, " ") === alias);
      if (k !== undefined && row[k] != null) return row[k];
    }
    return undefined;
  };
  const text = (field: keyof typeof ALIASES) => {
    const v = pick(field);
    return v == null ? "" : String(v).trim();
  };
  const name = text("name");
  if (!name) return null;
  return {
    name,
    niche: text("niche"),
    city: text("city") || DEFAULT_CITY,
    address: text("address"),
    neighborhood: text("neighborhood"),
    website: text("website"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    phone: text("phone"),
    instagram: text("instagram"),
    problems: text("problems"),
    pitch: text("pitch"),
    message: text("message"),
    mapsUrl: typeof row.mapsUrl === "string" ? row.mapsUrl : "",
    sent: truthy(pick("sent")),
    replied: truthy(pick("replied")),
    source: "import",
  };
}

export function parseCsv(text: string): Record<string, string>[] {
  const first = text.split(/\r?\n/)[0] ?? "";
  const count = (ch: string) => first.split(ch).length - 1;
  const delim =
    count("\t") > count(";") && count("\t") > count(",")
      ? "\t"
      : count(";") > count(",")
        ? ";"
        : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (clean.length < 2) return [];
  const head = clean[0].map((h) => h.trim().replace(/^﻿/, ""));
  return clean
    .slice(1)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/** Lê o texto colado ou o arquivo (JSON ou CSV) e devolve os leads válidos. */
export function parseProspectText(raw: string): { leads: ProspectInput[]; skipped: number } {
  const t = raw.trim().replace(/^﻿/, "");
  let rows: unknown[];
  if (/^[[{]/.test(t)) {
    const data = JSON.parse(t) as unknown;
    if (Array.isArray(data)) rows = data;
    else {
      const obj = data as Record<string, unknown>;
      const list = obj.leads ?? obj.rows ?? obj.data ?? obj.results;
      rows = Array.isArray(list) ? list : [];
    }
  } else rows = parseCsv(t);
  const leads: ProspectInput[] = [];
  let skipped = 0;
  for (const r of rows) {
    const lead = r && typeof r === "object" ? rowToProspect(r as Record<string, unknown>) : null;
    if (lead) leads.push(lead);
    else skipped += 1;
  }
  return { leads, skipped };
}

// ---------- Exportação ----------

const CSV_COLUMNS: [string, (l: ProspectLead) => string][] = [
  ["nome", (l) => l.name],
  ["nicho", (l) => l.niche],
  ["cidade", (l) => l.city],
  ["endereco", (l) => l.address],
  ["bairro", (l) => l.neighborhood],
  ["site", (l) => l.website],
  ["email", (l) => l.email],
  ["whatsapp", (l) => l.whatsapp],
  ["telefone", (l) => l.phone],
  ["instagram", (l) => (l.instagram ? `@${l.instagram}` : "")],
  ["problemas", (l) => l.problems],
  ["argumento", (l) => l.pitch],
  ["mensagem", (l) => l.message],
  ["enviado", (l) => (l.sent ? "sim" : "não")],
  ["respondeu", (l) => (l.replied ? "sim" : "não")],
];

export function prospectsToCsv(leads: ProspectLead[]): string {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [
    CSV_COLUMNS.map(([h]) => h).join(","),
    ...leads.map((l) => CSV_COLUMNS.map(([, get]) => esc(get(l) ?? "")).join(",")),
  ].join("\n");
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
