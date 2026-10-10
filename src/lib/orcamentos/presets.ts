import type { OrcamentoItem } from "../../types/orcamentos";

export const PRESET_SECTIONS = [
  {
    id: "timeline" as const,
    label: "Etapas e prazos",
    hint: "Uma etapa por linha. Ao aplicar, os itens de investimento são gerados a partir dessas linhas.",
  },
  {
    id: "payment" as const,
    label: "Forma de pagamento",
    hint: "Texto da condição de pagamento.",
  },
  {
    id: "needs" as const,
    label: "O que preciso do cliente",
    hint: "Uma solicitação por linha.",
  },
  {
    id: "notes" as const,
    label: "Observações",
    hint: "Notas e exclusões da proposta.",
  },
] as const;

export function timelineLines(timeline: string) {
  return String(timeline || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Monta itens de investimento a partir das etapas, preservando valores se o nome bater. */
export function itemsFromTimeline(
  timeline: string,
  previous: OrcamentoItem[] = [],
): OrcamentoItem[] {
  const lines = timelineLines(timeline);
  if (!lines.length) {
    return previous.length ? previous : [{ name: "", desc: "", value: 0 }];
  }
  return lines.map((line) => {
    const prev = previous.find(
      (item) => item.name.trim().toLowerCase() === line.toLowerCase(),
    );
    return {
      name: line,
      desc: prev?.desc ?? "",
      value: Number(prev?.value || 0),
    };
  });
}
