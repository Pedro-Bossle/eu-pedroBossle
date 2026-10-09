export function money(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
