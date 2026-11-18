/**
 * Cores e formatação dos gráficos de finanças.
 * Cores vêm de CSS vars (FIN_PALETTE_CSS) com passos próprios para o escuro
 * (paleta categórica validada: 6 slots + cinza neutro para "Outros").
 */
export const FIN_PALETTE_CSS = `
.fin-root{--fin-in:#059669;--fin-out:#d97706;--fin-grid:var(--adm-line);
  --cat-1:#2a78d6;--cat-2:#eb6834;--cat-3:#1baf7a;--cat-4:#eda100;--cat-5:#e87ba4;--cat-6:#6250d6;--cat-other:#a3abb6}
.dark .fin-root{--fin-in:#0ea371;--fin-out:#d27a06;
  --cat-1:#3987e5;--cat-2:#d95926;--cat-3:#199e70;--cat-4:#c98500;--cat-5:#d55181;--cat-6:#9085e9;--cat-other:#5d6672}
`;

export const CAT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"];
export const CAT_OTHER = "var(--cat-other)";
export const C_IN = "var(--fin-in)";
export const C_OUT = "var(--fin-out)";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
export const money = (n: number) => brl.format(n);
export const moneyShort = (n: number) => `R$ ${brlShort.format(n)}`;

/** Cor estável por categoria: as 6 maiores dos últimos 6 meses ganham cor, o resto é "Outros". */
export function categoryColors(categories: { category: string; history: number[] }[]) {
  const ranked = [...categories]
    .map((c) => ({ c: c.category, t: c.history.reduce((s, v) => s + v, 0) }))
    .sort((a, b) => b.t - a.t)
    .slice(0, CAT_COLORS.length);
  const map = new Map(ranked.map((r, i) => [r.c, CAT_COLORS[i]!]));
  return (category: string) => map.get(category) ?? CAT_OTHER;
}
