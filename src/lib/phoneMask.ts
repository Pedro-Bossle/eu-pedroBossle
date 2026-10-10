/** Máscara BR celular: (XX)X.XXXX-XXXX */

export function digitsOnly(value: string) {
  return String(value || "").replace(/\D/g, "");
}

/** Normaliza para até 11 dígitos (DDD + número), removendo 55 se vier. */
export function phoneDigits(value: string) {
  let d = digitsOnly(value);
  if (d.startsWith("55") && d.length >= 12) {
    d = d.slice(2);
  }
  return d.slice(0, 11);
}

/** Aplica máscara progressiva (XX)X.XXXX-XXXX */
export function maskPhoneBr(value: string) {
  const d = phoneDigits(value);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length === 3) return `(${d.slice(0, 2)})${d.slice(2)}`;
  if (d.length <= 7) {
    return `(${d.slice(0, 2)})${d.slice(2, 3)}.${d.slice(3)}`;
  }
  return `(${d.slice(0, 2)})${d.slice(2, 3)}.${d.slice(3, 7)}-${d.slice(7)}`;
}
