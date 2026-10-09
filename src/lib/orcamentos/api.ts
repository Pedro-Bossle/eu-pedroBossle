import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Erro ${res.status}`,
    );
  }
  return data as T;
}

export const orcamentosApi = {
  me: () =>
    request<{ user: { username: string } }>("/api/orcamentos/auth/me"),
  login: (username: string, password: string) =>
    request<{ user: { username: string } }>("/api/orcamentos/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/orcamentos/auth/logout", {
      method: "POST",
      body: "{}",
    }),
  data: () =>
    request<{
      clients: OrcamentoClient[];
      proposals: OrcamentoProposal[];
      profile: OrcamentoProfile;
    }>("/api/orcamentos/data"),
  saveClient: (client: OrcamentoClient) =>
    request<{ client: OrcamentoClient }>("/api/orcamentos/clients", {
      method: "POST",
      body: JSON.stringify(client),
    }),
  deleteClient: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/clients?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  saveProposal: (proposal: OrcamentoProposal) =>
    request<{ proposal: OrcamentoProposal }>("/api/orcamentos/proposals", {
      method: "POST",
      body: JSON.stringify(proposal),
    }),
  deleteProposal: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/proposals?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  saveProfile: (profile: OrcamentoProfile) =>
    request<{ profile: OrcamentoProfile }>("/api/orcamentos/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  seed: (mode: "merge" | "replace" = "merge") =>
    request<{
      ok: boolean;
      clientsUpserted: number;
      proposalsUpserted: number;
      clients: OrcamentoClient[];
      proposals: OrcamentoProposal[];
      profile: OrcamentoProfile;
    }>("/api/orcamentos/seed", {
      method: "POST",
      body: JSON.stringify({ mode }),
    }),
};
