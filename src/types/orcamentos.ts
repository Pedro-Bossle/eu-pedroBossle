export type OrcamentoItem = {
  name: string;
  desc: string;
  value: number;
};

export type OrcamentoLink = {
  label: string;
  type: "pagina_teste" | "apresentacao" | "proposta" | "email" | string;
  file: string | null;
  url: string | null;
  public: boolean;
  obs: string;
};

export type OrcamentoClient = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  link: string;
  notes: string;
  /** Razão social (opcional, para contrato). */
  legalName?: string;
  /** CPF ou CNPJ (opcional). */
  document?: string;
  /** Endereço completo (opcional). */
  address?: string;
};

export type OrcamentoComment = {
  id: string;
  author: "client" | "admin";
  body: string;
  created: string;
};

export type OrcamentoProposal = {
  id: string;
  clientId: string;
  company: string;
  validity: number;
  version: string;
  idea: string;
  scope: string;
  timeline: string;
  total: number;
  manualTotal: boolean;
  payment: string;
  needs: string;
  notes: string;
  status: string;
  items: OrcamentoItem[];
  links: OrcamentoLink[];
  created: string;
  shareEnabled?: boolean;
  shareToken?: string | null;
  shareCreatedAt?: string | null;
  clientDecidedAt?: string | null;
  clientDecisionNote?: string;
};

export type PublicProposalPayload = {
  proposal: Omit<OrcamentoProposal, "clientId" | "shareEnabled" | "shareToken" | "shareCreatedAt">;
  client: { name: string; company: string } | null;
  profile: Omit<OrcamentoProfile, "bio">;
  comments: OrcamentoComment[];
};

export type OrcamentoProfile = {
  name: string;
  title: string;
  phone: string;
  email: string;
  linkedin: string;
  portfolio: string;
  bio: string;
  /** CPF do prestador (opcional, contrato). */
  document?: string;
  /** Endereço do prestador (opcional, contrato). */
  address?: string;
};

/** Seções com preset de texto. Investimento vem das etapas automaticamente. */
export type PresetSection = "timeline" | "payment" | "needs" | "notes";

export type OrcamentoPreset = {
  id: string;
  section: PresetSection;
  name: string;
  body: string;
  created: string;
};

export type OrcamentoSeed = {
  app?: string;
  exportedAt?: string;
  clients: OrcamentoClient[];
  proposals: OrcamentoProposal[];
  profile: OrcamentoProfile;
};
