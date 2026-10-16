import type {
  OrcamentoItem,
  OrcamentoLink,
  OrcamentoProposal,
} from "../../types/orcamentos";

/** Campos do orçamento que fazem parte de um modelo (sem cliente, status, ids ou link público). */
type TemplateField =
  | "company"
  | "validity"
  | "version"
  | "idea"
  | "scope"
  | "timeline"
  | "total"
  | "manualTotal"
  | "payment"
  | "needs"
  | "notes"
  | "items"
  | "links";

export type ProposalTemplateData = Pick<OrcamentoProposal, TemplateField>;

export type ProposalTemplateFile = {
  app: "orcamentos-devbossle";
  kind: "proposal-template";
  version: 1;
  exportedAt: string;
  template: ProposalTemplateData;
};

export function buildProposalTemplate(
  proposal: OrcamentoProposal,
): ProposalTemplateFile {
  return {
    app: "orcamentos-devbossle",
    kind: "proposal-template",
    version: 1,
    exportedAt: new Date().toISOString(),
    template: {
      company: proposal.company,
      validity: proposal.validity,
      version: proposal.version,
      idea: proposal.idea,
      scope: proposal.scope,
      timeline: proposal.timeline,
      total: proposal.total,
      manualTotal: proposal.manualTotal,
      payment: proposal.payment,
      needs: proposal.needs,
      notes: proposal.notes,
      items: proposal.items.map((i) => ({ ...i })),
      links: proposal.links.map((l) => ({ ...l })),
    },
  };
}

export function proposalTemplateFilename(proposal: OrcamentoProposal) {
  const slug =
    (proposal.company || "orcamento")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "orcamento";
  return `modelo-${slug}.json`;
}

export function downloadProposalTemplate(proposal: OrcamentoProposal) {
  const json = JSON.stringify(buildProposalTemplate(proposal), null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = proposalTemplateFilename(proposal);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

function parseItems(v: unknown): OrcamentoItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      name: str(i.name) ?? "",
      desc: str(i.desc) ?? "",
      value: num(i.value) ?? 0,
    }));
}

function parseLinks(v: unknown): OrcamentoLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
    .map((l) => ({
      label: str(l.label) ?? "",
      type: str(l.type) ?? "proposta",
      file: str(l.file) ?? null,
      url: str(l.url) ?? null,
      public: Boolean(l.public),
      obs: str(l.obs) ?? "",
    }));
}

/**
 * Lê o conteúdo de um arquivo de modelo. Aceita o formato exportado
 * (`{ template: {...} }`) ou um objeto de orçamento direto.
 */
export function parseProposalTemplate(text: string): Partial<ProposalTemplateData> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Arquivo inválido: não é um JSON");
  }
  if (!raw || typeof raw !== "object") throw new Error("Modelo inválido");
  const obj = raw as Record<string, unknown>;
  const src = (
    obj.template && typeof obj.template === "object" ? obj.template : obj
  ) as Record<string, unknown>;

  const out: Partial<ProposalTemplateData> = {};
  const textFields = [
    "company",
    "version",
    "idea",
    "scope",
    "timeline",
    "payment",
    "needs",
    "notes",
  ] as const;
  for (const key of textFields) {
    const v = str(src[key]) ?? (typeof src[key] === "number" ? String(src[key]) : undefined);
    if (v !== undefined) out[key] = v;
  }
  const validity = num(src.validity);
  if (validity !== undefined) out.validity = validity;
  const total = num(src.total);
  if (total !== undefined) out.total = total;
  if (typeof src.manualTotal === "boolean") out.manualTotal = src.manualTotal;
  const items = parseItems(src.items);
  if (items) out.items = items.length ? items : [{ name: "", desc: "", value: 0 }];
  const links = parseLinks(src.links);
  if (links) out.links = links;

  if (Object.keys(out).length === 0) {
    throw new Error("Nenhum dado de orçamento encontrado no arquivo");
  }
  return out;
}

/** Aplica um modelo sobre um orçamento, mantendo id, cliente, status e link público. */
export function applyProposalTemplate(
  proposal: OrcamentoProposal,
  template: Partial<ProposalTemplateData>,
): OrcamentoProposal {
  return { ...proposal, ...template };
}
