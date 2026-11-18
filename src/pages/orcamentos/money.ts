export function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Lê valor digitado em reais. Aceita "1.500,50", "1500,50", "1500.50", "R$ 180" e "1.500".
 * Com vírgula, o ponto é separador de milhar; sem vírgula, um único ponto seguido de 1–2
 * dígitos é decimal (180.50), e os demais são milhar (1.500).
 */
export function parseMoney(raw: string): number {
  const s = raw.replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  let normalized: string;
  if (s.includes(",")) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d+\.\d{1,2}$/.test(s)) normalized = s;
  else normalized = s.replace(/\./g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
