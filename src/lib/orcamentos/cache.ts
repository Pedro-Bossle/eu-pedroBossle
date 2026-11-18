/**
 * Cache em memória das últimas respostas da API (stale-while-revalidate simples).
 * Ao voltar para uma tela, ela já abre com os dados anteriores enquanto busca os novos,
 * em vez de mostrar carregando de novo. Vive só enquanto a aba está aberta.
 */
const store = new Map<string, unknown>();

export function peek<T>(key: string): T | null {
  return (store.get(key) as T | undefined) ?? null;
}

export function remember<T>(key: string, value: T): T {
  store.set(key, value);
  return value;
}

/** Esquece entradas que começam com o prefixo (ex.: depois de importar/sincronizar). */
export function forget(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
