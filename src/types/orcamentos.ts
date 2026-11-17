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
  source: "manual" | "import" | string;
  sent: boolean;
  sentAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  created: string;
  updated: string;
  /** Funil (009) */
  stage: string;
  stageChangedAt: string | null;
  exitReason: string;
  result: string;
  score: number | null;
  scoreBreakdown: { label: string; points: number; max: number }[];
  phoneSources: string[];
  siteCheck: string;
  activity: string;
  detail: string;
  projectType: string;
  followupMessage: string;
  followupApprovedAt: string | null;
  followupAt: string | null;
  replyText: string;
  /** Dados da nota (010): a nota é recalculada ao salvar a edição. */
  reviewsCount: number | null;
  lastReviewAt: string | null;
  followers: number | null;
  lastPostAt: string | null;
  /** 0 a 3 (cada nível vale 5 pontos). */
  investLevel: number;
  competitorSite: boolean;
};

export type ProspectInput = Partial<
  Omit<
    ProspectLead,
    | "created" | "updated" | "sentAt" | "repliedAt"
    | "stage" | "stageChangedAt" | "exitReason" | "result" | "score" | "scoreBreakdown"
    | "phoneSources" | "projectType"
    | "followupMessage" | "followupApprovedAt" | "followupAt" | "replyText"
  >
>;

export type ProspectEvent = {
  from: string;
  to: string;
  actor: string;
  note: string;
  at: string;
};

export type BotToken = {
  id: string;
  name: string;
  role: "prospector" | "executor";
  last4: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

// ---------- Instagram (011) ----------

export type IgPostKind = "image" | "carousel" | "reel" | "story";
export type IgPostStatus = "rascunho" | "agendado" | "publicando" | "publicado" | "erro";

export type IgPost = {
  id: string;
  kind: IgPostKind;
  caption: string;
  mediaUrls: string[];
  coverUrl: string;
  shareToFeed: boolean;
  scheduledAt: string | null;
  status: IgPostStatus;
  publishedMediaId: string;
  permalink: string;
  error: string;
  attempts: number;
  tags: string[];
  notes: string;
  publishedAt: string | null;
  created: string | null;
  updated: string | null;
};

export type IgPostInput = {
  id?: string;
  kind: IgPostKind;
  caption: string;
  mediaUrls: string[];
  coverUrl: string;
  shareToFeed: boolean;
  scheduledAt: string | null;
  mode: "rascunho" | "agendado" | "agora";
  tags: string[];
  notes: string;
};

export type IgMedia = {
  id: string;
  caption: string;
  mediaType: string;
  productType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  permalink: string;
  postedAt: string | null;
  likes: number | null;
  comments: number | null;
  reach: number | null;
  views: number | null;
  saved: number | null;
  shares: number | null;
  tags: string[];
  notes: string;
};

export type IgComment = {
  id: string;
  mediaId: string;
  parentId: string | null;
  username: string;
  text: string;
  postedAt: string | null;
  fromMe: boolean;
  hidden: boolean;
  status: "novo" | "respondido" | "arquivado";
  mediaPermalink: string;
  mediaThumb: string;
  mediaCaption: string;
};

export type IgAccount =
  | { connected: false }
  | {
      connected: true;
      userId: string;
      username: string;
      name: string;
      picture: string;
      followers: number | null;
      follows: number | null;
      mediaCount: number | null;
      accountType: string;
      connectedAt: string;
      refreshedAt: string;
      expiresAt?: string | null;
      expiryGuessed?: boolean;
      insights28d?: Record<string, number>;
      insightsAt?: string;
      publishQuota?: { used: number; total: number } | null;
    };

export type IgOverview = {
  account: IgAccount;
  posts: IgPost[];
  media: IgMedia[];
  comments: IgComment[];
  features: { oauth: boolean; upload: boolean; cron: boolean };
};

// ---------- Finanças (012) ----------

export type FinItem = {
  id: string;
  connectorName: string;
  connectorImage: string;
  status: string;
  executionStatus: string;
  error: string;
  bankUpdatedAt: string | null;
  syncedAt: string | null;
};

export type FinAccount = {
  id: string;
  itemId: string;
  type: string;
  subtype: string;
  name: string;
  number: string;
  balance: number;
  currency: string;
  creditLimit: number | null;
  availableCredit: number | null;
  billDueDate: string | null;
  hidden: boolean;
  connectorName: string;
  syncedAt: string | null;
};

export type FinTransaction = {
  id: string;
  accountId: string;
  date: string | null;
  description: string;
  amount: number;
  pluggyCategory: string;
  category: string;
  categoryManual: boolean;
  merchant: string;
  status: string;
  ignored: boolean;
  notes: string;
};

export type FinInvestment = {
  id: string;
  itemId: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
  amountOriginal: number | null;
  annualRate: number | null;
  dueDate: string | null;
};

export type FinRule = { id: string; pattern: string; category: string; ignore: boolean };
export type FinBudget = { category: string; limit: number };
export type FinMonth = { month: string; income: number; expense: number };

export type FinOverview = {
  configured: boolean;
  items: FinItem[];
  accounts: FinAccount[];
  investments: FinInvestment[];
  rules: FinRule[];
  budgets: FinBudget[];
  months: FinMonth[];
  categories: string[];
};

export type FinSyncResult = {
  itemId: string;
  accounts: number;
  transactions: number;
  investments: number;
  error?: string;
};
