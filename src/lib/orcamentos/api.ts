import type {
  OrcamentoClient,
  OrcamentoComment,
  OrcamentoPreset,
  OrcamentoProfile,
  OrcamentoProposal,
  PublicProposalPayload,
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
  forgotPassword: () =>
    request<{ ok: boolean; message: string }>(
      "/api/orcamentos/auth/forgot-password",
      {
        method: "POST",
        body: "{}",
      },
    ),
  resetPassword: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/orcamentos/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  data: () =>
    request<{
      clients: OrcamentoClient[];
      proposals: OrcamentoProposal[];
      profile: OrcamentoProfile;
      presets: OrcamentoPreset[];
    }>("/api/orcamentos/data"),
  savePreset: (preset: OrcamentoPreset) =>
    request<{ preset: OrcamentoPreset }>("/api/orcamentos/presets", {
      method: "POST",
      body: JSON.stringify(preset),
    }),
  deletePreset: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/presets?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
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
  generateShare: (proposalId: string) =>
    request<{
      proposal: OrcamentoProposal;
      password: string;
      token: string;
      url: string;
    }>("/api/orcamentos/proposals/share", {
      method: "POST",
      body: JSON.stringify({ proposalId, action: "enable" }),
    }),
  disableShare: (proposalId: string) =>
    request<{ proposal: OrcamentoProposal; disabled: boolean }>(
      "/api/orcamentos/proposals/share",
      {
        method: "POST",
        body: JSON.stringify({ proposalId, action: "disable" }),
      },
    ),
  listComments: (proposalId: string) =>
    request<{ comments: OrcamentoComment[] }>(
      `/api/orcamentos/proposals/comments?proposalId=${encodeURIComponent(proposalId)}`,
    ),
  addAdminComment: (proposalId: string, body: string) =>
    request<{ comment: OrcamentoComment }>(
      "/api/orcamentos/proposals/comments",
      {
        method: "POST",
        body: JSON.stringify({ proposalId, body }),
      },
    ),
  publicUnlock: (token: string, password: string) =>
    request<{ ok: boolean }>("/api/orcamentos/public/unlock", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  publicProposal: (token: string) =>
    request<PublicProposalPayload>(
      `/api/orcamentos/public/proposal?token=${encodeURIComponent(token)}`,
    ),
  publicComment: (token: string, body: string) =>
    request<{ comment: OrcamentoComment }>("/api/orcamentos/public/comments", {
      method: "POST",
      body: JSON.stringify({ token, body }),
    }),
  publicDecision: (
    token: string,
    action: "approve" | "reject",
    note?: string,
  ) =>
    request<{
      status: string;
      clientDecidedAt: string;
      clientDecisionNote: string;
    }>("/api/orcamentos/public/decision", {
      method: "POST",
      body: JSON.stringify({ token, action, note: note ?? "" }),
    }),
  sendProposal: (payload: {
    id: string;
    pdfBase64: string;
    to?: string;
    shareUrl?: string;
    sharePassword?: string;
  }) =>
    request<{ ok: boolean; id: string | null; to: string }>(
      "/api/orcamentos/proposals/send",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
};
