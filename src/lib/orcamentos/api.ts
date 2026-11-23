import type {
  ProspectRules,
  ContactLead,
  OrcamentoClient,
  OrcamentoComment,
  OrcamentoPreset,
  OrcamentoProfile,
  OrcamentoProposal,
  BotToken,
  CrmActivity,
  CrmAgendaItem,
  CrmActivityKind,
  CrmPayment,
  CrmProject,
  CrmProjectStage,
  CrmSearchResult,
  CrmTask,
  CrmTaskInput,
  CrmToday,
  FinAnalytics,
  FinOverview,
  FinSyncResult,
  FinTransaction,
  IgMedia,
  IgOverview,
  IgPost,
  IgPostInput,
  ProspectEvent,
  ProspectInput,
  ProspectLead,
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
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
  };
  if (!res.ok) {
    const base =
      typeof data.error === "string" ? data.error : `Erro ${res.status}`;
    const detail =
      typeof data.detail === "string" && data.detail && data.detail !== base
        ? ` (${data.detail})`
        : "";
    throw new Error(`${base}${detail}`);
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
  listLeads: () =>
    request<{ leads: ContactLead[] }>("/api/orcamentos/leads"),
  markLeadRead: (id: string) =>
    request<{ lead: ContactLead }>("/api/orcamentos/leads", {
      method: "PATCH",
      body: JSON.stringify({ id }),
    }),
  listProspects: () =>
    request<{ leads: ProspectLead[] }>("/api/orcamentos/prospects"),
  saveProspect: (lead: ProspectInput) =>
    request<{ lead: ProspectLead }>("/api/orcamentos/prospects", {
      method: "POST",
      body: JSON.stringify(lead),
    }),
  importProspects: (leads: ProspectInput[]) =>
    request<{
      added: number;
      updated: number;
      skipped: number;
      leads: ProspectLead[];
    }>("/api/orcamentos/prospects", {
      method: "POST",
      body: JSON.stringify({ leads }),
    }),
  patchProspect: (
    id: string,
    patch: { sent?: boolean; replied?: boolean; message?: string },
  ) =>
    request<{ lead: ProspectLead }>("/api/orcamentos/prospects", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    }),
  moveProspect: (
    id: string,
    to: string,
    extra: { note?: string; result?: string; message?: string } = {},
  ) =>
    request<{ lead: ProspectLead }>("/api/orcamentos/prospects/stage", {
      method: "PATCH",
      body: JSON.stringify({ id, to, ...extra }),
    }),
  prospectEvents: (id: string) =>
    request<{ events: ProspectEvent[] }>(
      `/api/orcamentos/prospects/stage?id=${encodeURIComponent(id)}`,
    ),
  approveFollowup: (id: string, message: string) =>
    request<{ lead: ProspectLead }>("/api/orcamentos/prospects/followup", {
      method: "POST",
      body: JSON.stringify({ id, message }),
    }),
  prospectRules: () => request<{ rules: ProspectRules }>("/api/orcamentos/prospects/rules"),
  saveProspectRules: (rules: ProspectRules) =>
    request<{ rules: ProspectRules }>("/api/orcamentos/prospects/rules", {
      method: "PUT",
      body: JSON.stringify(rules),
    }),
  listBotTokens: () =>
    request<{ tokens: BotToken[] }>("/api/orcamentos/prospects/bot-tokens"),
  createBotToken: (name: string, role: BotToken["role"]) =>
    request<{ token: string }>("/api/orcamentos/prospects/bot-tokens", {
      method: "POST",
      body: JSON.stringify({ name, role }),
    }),
  revokeBotToken: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/prospects/bot-tokens?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  deleteProspect: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/prospects?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  // ---------- Instagram ----------
  igOverview: () => request<IgOverview>("/api/orcamentos/instagram"),
  igConnect: (token: string) =>
    request<{ account: IgOverview["account"] }>("/api/orcamentos/instagram", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  igDisconnect: () =>
    request<{ ok: boolean }>("/api/orcamentos/instagram", { method: "DELETE" }),
  igWebhookInfo: () =>
    request<{
      callbackUrl: string | null;
      verifyToken: string | null;
      appSecretConfigured: boolean;
      tableReady: boolean;
      events: { id: string; object: string; field: string; entryId: string; error: string; receivedAt: string }[];
    }>("/api/orcamentos/instagram/webhook"),
  igOauthStart: () =>
    request<{ url: string; redirectUri: string }>("/api/orcamentos/instagram/oauth"),
  igSync: () =>
    request<{
      media: number;
      comments: number;
      insights: number;
      warnings: string[];
      publish: { published?: number; errors?: number };
    }>("/api/orcamentos/instagram/sync", { method: "POST", body: "{}" }),
  igSavePost: (post: IgPostInput) =>
    request<{ post: IgPost; publish?: { published: number; pending: number; errors: number } }>(
      "/api/orcamentos/instagram/posts",
      { method: "POST", body: JSON.stringify(post) },
    ),
  igMovePost: (id: string, scheduledAt: string) =>
    request<{ post: IgPost }>("/api/orcamentos/instagram/posts", {
      method: "PATCH",
      body: JSON.stringify({ id, scheduledAt }),
    }),
  igDeletePost: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/instagram/posts?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  igPatchMedia: (id: string, patch: { tags?: string[]; notes?: string }) =>
    request<{ media: IgMedia }>("/api/orcamentos/instagram/media", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    }),
  igCommentStatus: (ids: string[], status: "novo" | "respondido" | "arquivado") =>
    request<{ ok: boolean }>("/api/orcamentos/instagram/comments", {
      method: "PATCH",
      body: JSON.stringify({ ids, status }),
    }),
  igCommentAction: (
    id: string,
    action: "reply" | "hide" | "unhide" | "delete",
    message?: string,
  ) =>
    request<{ ok: boolean; replyId?: string }>("/api/orcamentos/instagram/comments", {
      method: "POST",
      body: JSON.stringify({ id, action, message }),
    }),
  // ---------- Finanças ----------
  finOverview: () => request<FinOverview>("/api/orcamentos/finance"),
  finAddItem: (itemId: string) =>
    request<{ result: FinSyncResult }>("/api/orcamentos/finance", {
      method: "POST",
      body: JSON.stringify({ itemId }),
    }),
  finConnectToken: (itemId?: string) =>
    request<{ accessToken: string }>("/api/orcamentos/finance/connect-token", {
      method: "POST",
      body: JSON.stringify(itemId ? { itemId } : {}),
    }),
  finWebhook: (method: "GET" | "POST" | "DELETE" = "GET") =>
    request<{ url: string | null; registered: boolean; hook: { id: string; createdAt?: string } | null }>(
      "/api/orcamentos/finance/webhook-setup",
      method === "GET" ? undefined : { method, body: method === "POST" ? "{}" : undefined },
    ),
  finAnalytics: (month: string) =>
    request<FinAnalytics>(`/api/orcamentos/finance/analytics?month=${encodeURIComponent(month)}`),
  finDeleteItem: (itemId: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/finance?itemId=${encodeURIComponent(itemId)}`,
      { method: "DELETE" },
    ),
  finHideAccount: (accountId: string, hidden: boolean) =>
    request<{ ok: boolean }>("/api/orcamentos/finance", {
      method: "PATCH",
      body: JSON.stringify({ accountId, hidden }),
    }),
  finSync: (opts: { itemId?: string; refresh?: boolean; full?: boolean } = {}) =>
    request<{ results: FinSyncResult[] }>("/api/orcamentos/finance/sync", {
      method: "POST",
      body: JSON.stringify(opts),
    }),
  finTransactions: (params: { month?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params.month) qs.set("month", params.month);
    if (params.q) qs.set("q", params.q);
    return request<{ transactions: FinTransaction[] }>(
      `/api/orcamentos/finance/transactions?${qs.toString()}`,
    );
  },
  finPatchTx: (id: string, patch: { category?: string; ignored?: boolean; notes?: string }) =>
    request<{ transaction: FinTransaction }>("/api/orcamentos/finance/transactions", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    }),
  finAddRule: (rule: { pattern: string; category: string; ignore: boolean; apply?: boolean }) =>
    request<{ id: string; applied: number }>("/api/orcamentos/finance/rules", {
      method: "POST",
      body: JSON.stringify({ type: "rule", ...rule }),
    }),
  finDeleteRule: (id: string) =>
    request<{ ok: boolean }>(
      `/api/orcamentos/finance/rules?id=${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  finSetBudget: (category: string, limit: number | null) =>
    request<{ ok: boolean }>("/api/orcamentos/finance/rules", {
      method: "POST",
      body: JSON.stringify({ type: "budget", category, limit }),
    }),
  // ---------- CRM ----------
  crmToday: () => request<CrmToday>("/api/orcamentos/crm/today"),
  crmTasks: (params: { scope?: "open" | "done" | "all"; clientId?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.scope) qs.set("scope", params.scope);
    if (params.clientId) qs.set("clientId", params.clientId);
    return request<{ tasks: CrmTask[] }>(`/api/orcamentos/crm/tasks?${qs.toString()}`);
  },
  crmSaveTask: (task: CrmTaskInput) =>
    request<{ task: CrmTask }>("/api/orcamentos/crm/tasks", { method: "POST", body: JSON.stringify(task) }),
  crmToggleTask: (id: string, done: boolean) =>
    request<{ task: CrmTask; next: CrmTask | null }>("/api/orcamentos/crm/tasks", { method: "PATCH", body: JSON.stringify({ id, done }) }),
  crmDeleteTask: (id: string) =>
    request<{ ok: boolean }>(`/api/orcamentos/crm/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  crmActivities: (clientId: string) =>
    request<{ activities: CrmActivity[] }>(`/api/orcamentos/crm/activities?clientId=${encodeURIComponent(clientId)}`),
  crmAddActivity: (a: { clientId: string; kind: CrmActivityKind; body: string; at?: string }) =>
    request<{ activity: CrmActivity }>("/api/orcamentos/crm/activities", { method: "POST", body: JSON.stringify(a) }),
  crmDeleteActivity: (id: string) =>
    request<{ ok: boolean }>(`/api/orcamentos/crm/activities?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  crmConvert: (from: "lead" | "contact", id: string) =>
    request<{ client: OrcamentoClient; existed: boolean }>("/api/orcamentos/crm/convert", {
      method: "POST",
      body: JSON.stringify({ from, id }),
    }),
  crmDigest: () =>
    request<{ sent?: string; skipped?: string }>("/api/orcamentos/crm/digest", { method: "POST", body: "{}" }),
  crmPayments: (params: { clientId?: string; scope?: "open" } = {}) => {
    const qs = new URLSearchParams();
    if (params.clientId) qs.set("clientId", params.clientId);
    if (params.scope) qs.set("scope", params.scope);
    return request<{ payments: CrmPayment[] }>(`/api/orcamentos/crm/payments?${qs.toString()}`);
  },
  crmAddPayments: (body: {
    clientId: string;
    proposalId?: string | null;
    description?: string;
    amount?: number;
    dueDate?: string;
    installments?: { total: number; count: number; firstDue: string; labels?: string[] };
  }) => request<{ payments?: CrmPayment[]; payment?: CrmPayment }>("/api/orcamentos/crm/payments", { method: "POST", body: JSON.stringify(body) }),
  crmPayPayment: (id: string, paid: boolean, method?: string) =>
    request<{ payment: CrmPayment }>("/api/orcamentos/crm/payments", { method: "PATCH", body: JSON.stringify({ id, paid, method }) }),
  crmDeletePayment: (id: string) =>
    request<{ ok: boolean }>(`/api/orcamentos/crm/payments?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  crmProjects: (clientId?: string) =>
    request<{ projects: CrmProject[] }>(`/api/orcamentos/crm/projects${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`),
  crmSaveProject: (p: Partial<CrmProject> & { title: string }) =>
    request<{ project: CrmProject }>("/api/orcamentos/crm/projects", { method: "POST", body: JSON.stringify(p) }),
  crmMoveProject: (id: string, stage: CrmProjectStage) =>
    request<{ project: CrmProject }>("/api/orcamentos/crm/projects", { method: "PATCH", body: JSON.stringify({ id, stage }) }),
  crmDeleteProject: (id: string) =>
    request<{ ok: boolean }>(`/api/orcamentos/crm/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  crmAgenda: (from: string, to: string) =>
    request<{ items: CrmAgendaItem[] }>(`/api/orcamentos/crm/agenda?from=${from}&to=${to}`),
  crmCounts: () => request<{ counts: Record<string, number> }>("/api/orcamentos/crm/counts"),
  crmSearch: (q: string) =>
    request<{ results: CrmSearchResult[] }>(`/api/orcamentos/crm/search?q=${encodeURIComponent(q)}`),
};
