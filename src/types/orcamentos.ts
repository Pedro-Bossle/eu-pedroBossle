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

/** Lead do formulário público da Home. */
export type ContactLead = {
  id: string;
  name: string;
  email: string;
  idea: string;
  style: string;
  styleId: string;
  created: string;
  readAt: string | null;
};

/** Lead de prospecção (negócio local para oferecer site). */
export type ProspectLead = {
  id: string;
  name: string;
  niche: string;
  city: string;
  address: string;
  neighborhood: string;
  website: string;
  email: string;
  whatsapp: string;
  phone: string;
  instagram: string;
  problems: string;
  pitch: string;
  /** Mensagem editada à mão; vazia = gerar automaticamente. */
  message: string;
  mapsUrl: string;
  source: "manual" | "import" | "gemini" | string;
  sent: boolean;
  sentAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  created: string;
  updated: string;
};

export type ProspectInput = Partial<
  Omit<ProspectLead, "created" | "updated" | "sentAt" | "repliedAt">
>;

export type ProspectSettings = {
  configured: boolean;
  last4: string;
  model: string;
  defaultModel: string;
  updated: string | null;
};
