/** Máscaras de CPF (000.000.000-00) e CNPJ (00.000.000/0000-00). */

export function documentDigits(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 14);
}

export function maskCpfCnpj(value: string) {
  const d = documentDigits(value);
  if (!d) return "";
  if (d.length <= 11) {
    // CPF
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) {
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    }
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  // CNPJ
  if (d.length <= 12) {
    const base = d.slice(0, 12);
    let out = base.slice(0, 2);
    if (base.length > 2) out += `.${base.slice(2, 5)}`;
    if (base.length > 5) out += `.${base.slice(5, 8)}`;
    if (base.length > 8) out += `/${base.slice(8, 12)}`;
    return out;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function isCnpj(value: string) {
  return documentDigits(value).length > 11;
}
