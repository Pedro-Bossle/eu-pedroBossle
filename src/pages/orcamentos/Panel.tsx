import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import MailIcon from "../../components/icons/MailIcon";
import WhatsAppIcon from "../../components/icons/WhatsAppIcon";
import { buildContractPayload } from "../../lib/orcamentos/contractData";
import { orcamentosApi } from "../../lib/orcamentos/api";
import { peek, remember } from "../../lib/orcamentos/cache";
import {
  itemsFromTimeline,
  PRESET_SECTIONS,
} from "../../lib/orcamentos/presets";
import {
  applyProposalTemplate,
  downloadProposalTemplate,
  parseProposalTemplate,
} from "../../lib/orcamentos/proposalTemplate";
import {
  buildShareClientMessage,
  whatsappShareUrl,
} from "../../lib/orcamentos/shareMessage";
import { maskCpfCnpj } from "../../lib/documentMask";
import { maskPhoneBr } from "../../lib/phoneMask";
import type {
  ContactLead,
  OrcamentoClient,
  OrcamentoComment,
  OrcamentoPreset,
  OrcamentoProfile,
  OrcamentoProposal,
  PresetSection,
} from "../../types/orcamentos";
import ContractDocument from "./ContractDocument";
import {
  downloadProposalPdf,
  EMAIL_PDF_MAX_BASE64_CHARS,
  proposalPdfBase64,
  proposalPdfFilename,
} from "./downloadProposalPdf";
import { money, uid } from "./money";
import ProposalPdfDocument from "./ProposalPdfDocument";
import {
  appRoot,
  btn,
  btnDanger,
  btnGhost,
  btnPrimary,
  cardClass,
  focusRing,
  inputClass,
  labelClass,
  shellClass,
  textareaClass,
} from "./panelStyles";
import Select from "./ui/Select";
import Sheet from "./ui/Sheet";
import QuickMenu from "./ui/QuickMenu";
import ClientList from "./crm/ClientList";
import ClientSheet from "./crm/ClientSheet";
import CommandPalette, { type PaletteCommand } from "./crm/CommandPalette";
import TaskEditor from "./crm/TaskEditor";
import { draftFromTask, type TaskDraft } from "./crm/model";
import Tasks from "./crm/Tasks";
import Today, { type TodayNav } from "./crm/Today";
import Results from "./crm/Results";
import Projects from "./crm/Projects";
import Agenda from "./crm/Agenda";
import { CLIENT_CREATED, convertToClient } from "./crm/events";
import type { CrmSearchResult, CrmTask, CrmToday } from "../../types/orcamentos";

// Telas pesadas carregam só quando abertas (gráficos, calendário, widget da Pluggy)
const Funnel = lazy(() => import("./Funnel"));
const Instagram = lazy(() => import("./Instagram"));
const Finance = lazy(() => import("./Finance"));

type Tab =
  | "today"
  | "tasks"
  | "agenda"
  | "dashboard"
  | "inbox"
  | "prospects"
  | "instagram"
  | "finance"
  | "clients"
  | "proposals"
  | "projects"
  | "presets"
  | "profile"
  | "settings";

type Props = {
  username: string;
  clients: OrcamentoClient[];
  proposals: OrcamentoProposal[];
  presets: OrcamentoPreset[];
  profile: OrcamentoProfile;
  onLogout: () => void;
  onRefresh: (data: {
    clients: OrcamentoClient[];
    proposals: OrcamentoProposal[];
    profile: OrcamentoProfile;
    presets: OrcamentoPreset[];
  }) => void;
};

const STATUSES = ["Em elaboração", "Enviado", "Aprovado", "Recusado"] as const;

const blankProposal = (clientId = ""): OrcamentoProposal => ({
  id: uid(),
  clientId,
  company: "",
  validity: 7,
  version: "1",
  idea: "",
  scope: "",
  timeline: "",
  total: 0,
  manualTotal: false,
  payment: "50% no início e 50% na entrega",
  needs: "",
  notes: "",
  status: "Em elaboração",
  items: [{ name: "", desc: "", value: 0 }],
  links: [],
  created: new Date().toISOString(),
});

const EDIT_STEPS = [
  { id: "projeto", label: "Projeto" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "investimento", label: "Investimento" },
  { id: "extras", label: "Extras" },
  { id: "envio", label: "Envio" },
] as const;
type EditStepId = (typeof EDIT_STEPS)[number]["id"];

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("aprov"))
    return "bg-emerald-500/10 text-accent-text";
  if (s.includes("envi"))
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (s.includes("recus") || s.includes("cancel"))
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  return "bg-sunken text-muted";
}

/** Cor do ponto de status no menu de status. */
function statusDot(status: string) {
  const s = status.toLowerCase();
  if (s.includes("aprov")) return "#1f9d6a";
  if (s.includes("envi")) return "#d97706";
  if (s.includes("recus") || s.includes("cancel")) return "#d03b3b";
  return "#8a93a0";
}

function statusChipClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("aprov"))
    return "border-emerald-500/35 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300";
  if (s.includes("envi"))
    return "border-amber-500/40 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300";
  if (s.includes("recus") || s.includes("cancel"))
    return "border-red-500/35 text-red-700 hover:bg-red-500/10 dark:text-red-300";
  return "border-line-strong text-muted hover:bg-sunken";
}

/** Placeholder enquanto uma tela carregada sob demanda chega. */
function TabSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-10 w-56 animate-pulse rounded-xl bg-sunken motion-reduce:animate-none" />
      <div className="h-28 animate-pulse rounded-2xl bg-sunken/70 motion-reduce:animate-none" />
      <div className="h-72 animate-pulse rounded-2xl bg-sunken/70 motion-reduce:animate-none" />
    </div>
  );
}

function TrafficLights({ compact }: { compact?: boolean }) {
  const size = compact ? "size-2.5 sm:size-3" : "size-3 sm:size-3.5";
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <span className={`rounded-full bg-red-500 ${size}`} />
      <span className={`rounded-full bg-yellow-500 ${size}`} />
      <span className={`rounded-full bg-green-500 ${size}`} />
    </span>
  );
}

function Icon({ d, paths }: { d?: string; paths?: string[] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d ? <path d={d} /> : null}
      {paths?.map((p) => (
        <path key={p} d={p} />
      ))}
    </svg>
  );
}

function Field({
  label,
  children,
  full,
  hint,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
  hint?: string;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium tracking-tight text-muted">
        {label}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-xs text-muted">
          {hint}
        </span>
      ) : null}
      <div className="mt-2.5">{children}</div>
    </label>
  );
}

const navIcons: Record<Tab, string[]> = {
  today: ["M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"],
  tasks: ["M9 11l3 3 8-8", "M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"],
  projects: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  agenda: ["M8 2v4", "M16 2v4", "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M3 10h18", "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"],
  dashboard: ["M3 12l9-9 9 9", "M5 10v10h14V10"],
  inbox: [
    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
    "M22 6l-10 7L2 6",
  ],
  prospects: [
    "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16",
    "M21 21l-4.35-4.35",
    "M11 8v6",
    "M8 11h6",
  ],
  instagram: [
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z",
    "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z",
    "M17.5 6.5h.01",
  ],
  finance: [
    "M3 3v18h18",
    "M7 14l4-4 4 4 5-6",
  ],
  clients: [
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    "M23 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  proposals: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6",
    "M8 13h8",
    "M8 17h5",
  ],
  presets: [
    "M4 7h16",
    "M4 12h16",
    "M4 17h10",
    "M16 15l2 2 4-4",
  ],
  profile: [
    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
    "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  ],
  settings: [
    "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
    "M7 10l5 5 5-5",
    "M12 15V3",
  ],
};

function Panel({
  username,
  clients,
  proposals,
  presets,
  profile,
  onLogout,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<Tab>(() => {
    // ?tab=instagram (volta do login do Instagram) ou ?tab=finance
    const t = new URLSearchParams(window.location.search).get("tab");
    return t === "instagram" || t === "finance" || t === "tasks" ? t : "today";
  });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrcamentoProposal | null>(null);
  const [clientForm, setClientForm] = useState<OrcamentoClient | null>(null);
  // CRM: editor de tarefa, ficha do cliente, busca global e menus do celular
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [taskVersion, setTaskVersion] = useState(0);
  const [sheetClientId, setSheetClientId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  /** Contadores do menu: tarefas de hoje+atrasadas, inbox não lido, comentários do Instagram. */
  const [badges, setBadges] = useState<Partial<Record<Tab, number>>>(() => peek<Partial<Record<Tab, number>>>("counts") ?? {});
  const [presetForm, setPresetForm] = useState<OrcamentoPreset | null>(null);
  const [presetSectionFilter, setPresetSectionFilter] =
    useState<PresetSection | "todos">("todos");
  const [profileForm, setProfileForm] = useState(profile);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark"),
  );
  const [pdfSource, setPdfSource] = useState<OrcamentoProposal | null>(null);
  const [contractSource, setContractSource] =
    useState<OrcamentoProposal | null>(null);
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendBusyId, setSendBusyId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const [sharePassword, setSharePassword] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [comments, setComments] = useState<OrcamentoComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsBusy, setCommentsBusy] = useState(false);
  const [editStep, setEditStep] = useState<EditStepId>("projeto");
  const editStepIndex = EDIT_STEPS.findIndex((s) => s.id === editStep);

  const openProposal = (proposal: OrcamentoProposal) => {
    setEditStep("projeto");
    setEditing(proposal);
  };

  const templateInputRef = useRef<HTMLInputElement>(null);
  /** "current" aplica no orçamento aberto; "new" cria um novo orçamento. */
  const templateTargetRef = useRef<"current" | "new">("new");

  const pickTemplateFile = (target: "current" | "new") => {
    templateTargetRef.current = target;
    templateInputRef.current?.click();
  };

  const exportTemplate = (proposal: OrcamentoProposal) => {
    try {
      downloadProposalTemplate(proposal);
      showToast("Modelo exportado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao exportar modelo");
    }
  };

  const importTemplate = async (file: File) => {
    try {
      const template = parseProposalTemplate(await file.text());
      if (templateTargetRef.current === "current" && editing) {
        if (
          !window.confirm(
            "Importar o modelo vai substituir textos, etapas e valores deste orçamento. Continuar?",
          )
        )
          return;
        setEditing(applyProposalTemplate(editing, template));
        setEditStep("projeto");
      } else {
        openProposal(applyProposalTemplate(blankProposal(), template));
      }
      showToast("Modelo importado — revise e salve");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao importar modelo");
    }
  };

  useEffect(() => {
    document.title = "Orçamentos · .dev Bossle";
  }, []);

  useEffect(() => {
    if (!editing?.id || !proposals.some((p) => p.id === editing.id)) {
      setComments([]);
      setSharePassword(null);
      setShareUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { comments: list } = await orcamentosApi.listComments(editing.id);
        if (!cancelled) setComments(list);
      } catch {
        if (!cancelled) setComments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing?.id, proposals]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const stats = useMemo(() => {
    const by = (match: string) =>
      proposals.filter((p) =>
        p.status.toLowerCase().includes(match.toLowerCase()),
      );
    const approved = by("aprov");
    const sent = by("envi");
    const draft = by("elabor");
    const refused = by("recus");
    /* Pipeline ativo: exclui recusados de contagem e valor orçado */
    const active = proposals.filter(
      (p) => !p.status.toLowerCase().includes("recus"),
    );
    const totalValue = active.reduce((s, p) => s + Number(p.total || 0), 0);
    const approvedValue = approved.reduce(
      (s, p) => s + Number(p.total || 0),
      0,
    );
    return {
      activeCount: active.length,
      totalValue,
      approvedValue,
      approved: approved.length,
      sent: sent.length,
      draft: draft.length,
      refused: refused.length,
    };
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    if (statusFilter === "todos") return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const recent = useMemo(
    () =>
      [...proposals]
        .sort(
          (a, b) =>
            new Date(b.created).getTime() - new Date(a.created).getTime(),
        )
        .slice(0, 6),
    [proposals],
  );

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? `${c.name}${c.company ? ` — ${c.company}` : ""}` : "Sem cliente";
  };

  // Estável: Instagram/Finanças usam em dependências de efeitos
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const reload = async () => {
    const data = await orcamentosApi.data();
    onRefresh(data);
    setProfileForm(data.profile);
  };

  const go = (next: Tab) => {
    setMoreOpen(false);
    setQuickOpen(false);
    setFabOpen(false);
    setEditing(null);
    setEditStep("projeto");
    setClientForm(null);
    setPresetForm(null);
    setTab(next);
  };

  const exportPdf = (proposal: OrcamentoProposal) => {
    if (pdfBusy || sendBusyId) return;
    setPdfBusy(true);
    setPdfSource(proposal);
    window.setTimeout(async () => {
      try {
        const el = pdfRef.current;
        if (!el) throw new Error("Documento PDF não montou");
        await downloadProposalPdf(
          el,
          proposalPdfFilename(proposal.company),
        );
        showToast("PDF gerado");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao gerar PDF");
      } finally {
        setPdfSource(null);
        setPdfBusy(false);
      }
    }, 80);
  };

  const exportContract = (proposal: OrcamentoProposal) => {
    if (pdfBusy || sendBusyId) return;
    if (!/aprov/i.test(proposal.status)) {
      showToast("Contrato disponível apenas para orçamentos aprovados");
      return;
    }
    const client = clients.find((c) => c.id === proposal.clientId);
    if (!client) {
      showToast("Cliente do orçamento não encontrado");
      return;
    }
    setPdfBusy(true);
    setContractSource(proposal);
    window.setTimeout(async () => {
      try {
        const el = contractRef.current;
        if (!el) throw new Error("Contrato não montou");
        const slug =
          (proposal.company || "contrato")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50) || "contrato";
        await downloadProposalPdf(el, `contrato-${slug}.pdf`);
        showToast("Contrato gerado");
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao gerar contrato");
      } finally {
        setContractSource(null);
        setPdfBusy(false);
      }
    }, 80);
  };

  const sendProposalEmail = (proposal: OrcamentoProposal) => {
    if (pdfBusy || sendBusyId) return;
    if (!proposals.some((p) => p.id === proposal.id)) {
      showToast("Salve o orçamento antes de enviar");
      return;
    }
    const client = clients.find((c) => c.id === proposal.clientId);
    const email = client?.email?.trim() ?? "";
    if (!email) {
      showToast("Cadastre o e-mail do cliente antes de enviar");
      return;
    }

    setSendBusyId(proposal.id);
    setPdfBusy(true);
    setPdfSource(proposal);
    window.setTimeout(async () => {
      try {
        const el = pdfRef.current;
        if (!el) throw new Error("Documento PDF não montou");
        const pdfBase64 = await proposalPdfBase64(el, { compact: true });
        if (pdfBase64.length > EMAIL_PDF_MAX_BASE64_CHARS) {
          throw new Error(
            "PDF ainda grande demais para e-mail. Reduza imagens/conteúdo ou baixe o PDF e envie manualmente.",
          );
        }
        const result = await orcamentosApi.sendProposal({
          id: proposal.id,
          pdfBase64,
          to: email,
        });
        await reload();
        setEditing((prev) =>
          prev?.id === proposal.id ? { ...prev, status: "Enviado" } : prev,
        );
        showToast(`Enviado para ${result.to}`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha ao enviar");
      } finally {
        setPdfSource(null);
        setPdfBusy(false);
        setSendBusyId(null);
      }
    }, 80);
  };

  const proposalPublicUrl = (token: string) => {
    const host = window.location.hostname.toLowerCase();
    if (host === "orcamentos.devbossle.com.br" || host.startsWith("orcamentos.")) {
      return `${window.location.origin}/p/${token}`;
    }
    return `${window.location.origin}/orcamentos/p/${token}`;
  };

  /** Só para exibição: host + slug do projeto (sem token). A cópia usa a URL real. */
  const friendlyShareLabel = (company: string) => {
    const slug =
      company
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 48) || "projeto";
    const host = window.location.hostname.toLowerCase();
    if (host === "orcamentos.devbossle.com.br" || host.startsWith("orcamentos.")) {
      return `${host}/${slug}`;
    }
    return `orcamentos.devbossle.com.br/${slug}`;
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado`);
    } catch {
      showToast(`Não foi possível copiar ${label.toLowerCase()}`);
    }
  };

  const generateShare = async () => {
    if (!editing) return;
    if (!proposals.some((p) => p.id === editing.id)) {
      showToast("Salve o orçamento antes de gerar o link");
      return;
    }
    setBusy(true);
    try {
      const result = await orcamentosApi.generateShare(editing.id);
      await reload();
      setEditing(result.proposal);
      setSharePassword(result.password);
      setShareUrl(result.url || proposalPublicUrl(String(result.token)));
      showToast("Link e senha gerados");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao gerar link");
    } finally {
      setBusy(false);
    }
  };

  /** Garante link ativo + senha em memória (regenera se preciso). */
  const ensureShareCredentials = async (proposal: OrcamentoProposal) => {
    if (
      proposal.shareEnabled &&
      proposal.shareToken &&
      sharePassword &&
      (shareUrl || proposal.shareToken)
    ) {
      return {
        url: shareUrl || proposalPublicUrl(proposal.shareToken),
        password: sharePassword,
        proposal,
      };
    }
    const result = await orcamentosApi.generateShare(proposal.id);
    await reload();
    const url = result.url || proposalPublicUrl(String(result.token));
    setEditing(result.proposal);
    setSharePassword(result.password);
    setShareUrl(url);
    return {
      url,
      password: result.password,
      proposal: result.proposal,
    };
  };

  const shareViaWhatsApp = async () => {
    if (!editing) return;
    if (!proposals.some((p) => p.id === editing.id)) {
      showToast("Salve o orçamento antes de enviar");
      return;
    }
    const client = clients.find((c) => c.id === editing.clientId);
    if (!client?.phone?.trim()) {
      showToast("Cadastre o telefone do cliente antes de enviar pelo WhatsApp");
      return;
    }
    setBusy(true);
    try {
      const creds = await ensureShareCredentials(editing);
      const message = buildShareClientMessage({
        clientName: client.name,
        projectName: editing.company,
        url: creds.url,
        password: creds.password,
      });
      const waUrl = whatsappShareUrl(client.phone, message);
      if (!waUrl) {
        showToast("Telefone do cliente inválido para WhatsApp");
        return;
      }
      window.open(waUrl, "_blank", "noopener,noreferrer");
      showToast("WhatsApp aberto com a mensagem");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao abrir WhatsApp");
    } finally {
      setBusy(false);
    }
  };

  const shareViaEmail = async () => {
    if (!editing) return;
    if (pdfBusy || sendBusyId) return;
    if (!proposals.some((p) => p.id === editing.id)) {
      showToast("Salve o orçamento antes de enviar");
      return;
    }
    const client = clients.find((c) => c.id === editing.clientId);
    const email = client?.email?.trim() ?? "";
    if (!email) {
      showToast("Cadastre o e-mail do cliente antes de enviar");
      return;
    }

    setBusy(true);
    setSendBusyId(editing.id);
    try {
      const creds = await ensureShareCredentials(editing);
      setPdfBusy(true);
      setPdfSource(creds.proposal);
      await new Promise((r) => window.setTimeout(r, 80));
      const el = pdfRef.current;
      if (!el) throw new Error("Documento PDF não montou");
      const pdfBase64 = await proposalPdfBase64(el, { compact: true });
      if (pdfBase64.length > EMAIL_PDF_MAX_BASE64_CHARS) {
        throw new Error(
          "PDF ainda grande demais para e-mail. Reduza imagens/conteúdo ou baixe o PDF e envie manualmente.",
        );
      }
      const result = await orcamentosApi.sendProposal({
        id: creds.proposal.id,
        pdfBase64,
        to: email,
        shareUrl: creds.url,
        sharePassword: creds.password,
      });
      await reload();
      setEditing((prev) =>
        prev?.id === creds.proposal.id
          ? { ...prev, status: "Enviado" }
          : prev,
      );
      showToast(`E-mail enviado para ${result.to}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao enviar e-mail");
    } finally {
      setPdfSource(null);
      setPdfBusy(false);
      setSendBusyId(null);
      setBusy(false);
    }
  };

  const disableShare = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const result = await orcamentosApi.disableShare(editing.id);
      await reload();
      setEditing(result.proposal);
      setSharePassword(null);
      setShareUrl(null);
      showToast("Link desativado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao desativar");
    } finally {
      setBusy(false);
    }
  };

  const sendAdminComment = async () => {
    if (!editing || !commentDraft.trim()) return;
    setCommentsBusy(true);
    try {
      const { comment } = await orcamentosApi.addAdminComment(
        editing.id,
        commentDraft.trim(),
      );
      setComments((prev) => [...prev, comment]);
      setCommentDraft("");
      showToast("Comentário enviado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao comentar");
    } finally {
      setCommentsBusy(false);
    }
  };

  const toggleDark = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    document.documentElement.style.setProperty(
      "--theme-x",
      `${rect.left + rect.width / 2}px`,
    );
    document.documentElement.style.setProperty(
      "--theme-y",
      `${rect.top + rect.height / 2}px`,
    );
    const next = !dark;
    if (!document.startViewTransition) {
      setDark(next);
      return;
    }
    document.startViewTransition(() => setDark(next));
  };

  const saveClient = async () => {
    if (!clientForm?.name.trim()) {
      showToast("Informe o nome do cliente");
      return;
    }
    setBusy(true);
    try {
      await orcamentosApi.saveClient(clientForm);
      await reload();
      setClientForm(null);
      showToast("Cliente salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const saveProposal = async () => {
    if (!editing) return;
    if (!editing.clientId) {
      showToast("Escolha o cliente");
      return;
    }
    setBusy(true);
    try {
      const sum = editing.items.reduce((a, i) => a + Number(i.value || 0), 0);
      const payload = {
        ...editing,
        total: editing.manualTotal ? editing.total : sum,
        items: editing.items.filter(
          (i) => i.name || i.desc || Number(i.value),
        ),
      };
      await orcamentosApi.saveProposal(payload);
      await reload();
      setEditing(null);
      setTab("proposals");
      showToast("Orçamento salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const importSeed = async (mode: "merge" | "replace") => {
    if (
      mode === "replace" &&
      !window.confirm("Substituir todos os dados pelos orçamentos iniciais?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await orcamentosApi.seed(mode);
      onRefresh({
        clients: result.clients,
        proposals: result.proposals,
        profile: result.profile,
        presets,
      });
      setProfileForm(result.profile);
      showToast(
        `Importados ${result.proposalsUpserted} orçamentos e ${result.clientsUpserted} clientes`,
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setBusy(false);
    }
  };

  const nav: { id: Tab; label: string; short: string; group: string }[] = [
    { id: "today", label: "Hoje", short: "Hoje", group: "Rotina" },
    { id: "tasks", label: "Tarefas", short: "Tarefas", group: "Rotina" },
    { id: "agenda", label: "Agenda", short: "Agenda", group: "Rotina" },
    { id: "inbox", label: "Inbox", short: "Inbox", group: "Rotina" },
    { id: "prospects", label: "Funil", short: "Funil", group: "Vendas" },
    { id: "clients", label: "Clientes", short: "Clientes", group: "Vendas" },
    { id: "proposals", label: "Orçamentos", short: "Orçam.", group: "Vendas" },
    { id: "projects", label: "Projetos", short: "Projetos", group: "Vendas" },
    { id: "dashboard", label: "Resultados", short: "Resultados", group: "Vendas" },
    { id: "instagram", label: "Instagram", short: "Insta", group: "Marketing" },
    { id: "finance", label: "Finanças", short: "Finanças", group: "Pessoal" },
    { id: "presets", label: "Presets", short: "Presets", group: "Ajustes" },
    { id: "profile", label: "Meus dados", short: "Dados", group: "Ajustes" },
    { id: "settings", label: "Backup / seed", short: "Backup", group: "Ajustes" },
  ];
  /** Barra inferior do celular: 4 atalhos + "Mais". */
  const mobileNav: Tab[] = ["today", "tasks", "clients", "prospects"];

  const openTask = useCallback((d: TaskDraft | CrmTask) => {
    setTaskDraft("doneAt" in d ? draftFromTask(d as CrmTask) : (d as TaskDraft));
  }, []);
  const openProposalById = useCallback(
    (id: string) => {
      const p = proposals.find((x) => x.id === id);
      if (p) {
        setSheetClientId(null);
        setEditStep("projeto");
        setEditing(p);
      }
    },
    [proposals],
  );
  const newClient = () => {
    setTab("clients");
    setEditing(null);
    setClientForm({
      id: uid(),
      name: "",
      company: "",
      phone: "",
      email: "",
      link: "",
      notes: "",
      legalName: "",
      document: "",
      address: "",
      status: "ativo",
      tags: [],
    });
  };

  const sheetClient = sheetClientId ? clients.find((c) => c.id === sheetClientId) ?? null : null;
  const quickItems = [
    { label: "Tarefa", hint: "N", icon: navIcons.tasks.join(""), run: () => openTask({ title: "", dueAt: new Date().toISOString() }) },
    { label: "Orçamento", icon: navIcons.proposals.join(""), run: () => openProposal(blankProposal()) },
    { label: "Cliente", icon: navIcons.clients.join(""), run: newClient },
    { label: "Projeto", icon: navIcons.projects.join(""), run: () => go("projects") },
    { label: "Post no Instagram", icon: navIcons.instagram.join(""), run: () => go("instagram") },
  ];

  const paletteCommands: PaletteCommand[] = [
    { id: "new-task", label: "Nova tarefa", hint: "N", icon: navIcons.tasks.join(""), run: () => openTask({ title: "", dueAt: new Date().toISOString() }), keywords: "criar adicionar lembrete follow-up" },
    { id: "new-proposal", label: "Novo orçamento", icon: navIcons.proposals.join(""), run: () => openProposal(blankProposal()), keywords: "proposta criar" },
    { id: "new-client", label: "Novo cliente", icon: navIcons.clients.join(""), run: newClient, keywords: "cadastrar criar" },
    { id: "new-post", label: "Agendar post no Instagram", icon: navIcons.instagram.join(""), run: () => go("instagram"), keywords: "publicar" },
    {
      id: "digest",
      label: "Enviar resumo do dia por e-mail",
      icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
      run: async () => {
        try {
          const r = await orcamentosApi.crmDigest();
          showToast(r.sent ? `Resumo enviado para ${r.sent}` : `Não enviado: ${r.skipped}`);
        } catch (e) {
          showToast(e instanceof Error ? e.message : "Falha ao enviar");
        }
      },
      keywords: "email digest teste",
    },
    { id: "help", label: "Atalhos do teclado", hint: "?", icon: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", run: () => setHelpOpen(true), keywords: "ajuda teclas" },
    { id: "theme", label: dark ? "Usar tema claro" : "Usar tema escuro", icon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z", run: () => setDark((d) => !d), keywords: "dark modo noite" },
    ...nav.map((n) => ({ id: `go-${n.id}`, label: `Ir para ${n.label}`, hint: n.group, icon: navIcons[n.id].join(""), run: () => go(n.id), keywords: n.short })),
  ];

  const onPaletteResult = (r: CrmSearchResult) => {
    if (r.type === "client") setSheetClientId(r.id);
    else if (r.type === "proposal") openProposalById(r.id);
    else if (r.type === "lead") go("prospects");
    else
      orcamentosApi
        .crmTasks({ scope: "all" })
        .then(({ tasks }) => {
          const t = tasks.find((x) => x.id === r.id);
          if (t) openTask(t);
          else go("tasks");
        })
        .catch(() => go("tasks"));
  };

  const applyBadges = useCallback((d: CrmToday) => {
    setBadges({
      today: (d.tasks?.overdue.length ?? 0) + (d.tasks?.dueToday.length ?? 0),
      inbox: d.inbox?.unread ?? 0,
      instagram: d.instagram?.newComments ?? 0,
      prospects: (d.funnel?.awaiting ?? 0) + (d.funnel?.followups ?? 0),
      projects: d.deliveries?.due.filter((p) => p.late).length ?? 0,
    });
  }, []);

  // Contadores: ao abrir, a cada 5 min e quando tarefas mudam. Na tela Hoje quem avisa é ela mesma.
  const tabRef = useRef(tab);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (tabRef.current === "today") return;
      orcamentosApi
        .crmCounts()
        .then(({ counts }) => !cancelled && setBadges(remember("counts", (counts ?? {}) as Partial<Record<Tab, number>>)))
        .catch(() => undefined);
    };
    tick();
    const id = window.setInterval(tick, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [taskVersion]);

  // Cliente criado no funil/inbox: recarrega os dados e abre a ficha
  useEffect(() => {
    const onCreated = async (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const data = await orcamentosApi.data();
      onRefresh(data);
      setSheetClientId(id);
    };
    window.addEventListener(CLIENT_CREATED, onCreated);
    return () => window.removeEventListener(CLIENT_CREATED, onCreated);
  }, [onRefresh]);

  // Atalhos: Ctrl/⌘+K abre a busca; N cria tarefa (fora de campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (
        !typing &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !document.querySelector("[role=dialog], [role=listbox], [role=menu]")
      ) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          setTaskDraft({ title: "", dueAt: new Date().toISOString() });
        } else if (e.key === "/") {
          e.preventDefault();
          setPaletteOpen(true);
        } else if (e.key === "?") {
          e.preventDefault();
          setHelpOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  useEffect(() => {
    if (tab !== "inbox") return;
    let cancelled = false;
    setLeadsLoading(true);
    orcamentosApi
      .listLeads()
      .then((data) => {
        if (!cancelled) setLeads(data.leads);
      })
      .catch((e) => {
        if (!cancelled) {
          showToast(e instanceof Error ? e.message : "Erro ao carregar inbox");
        }
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, showToast]);

  const blankPreset = (section: PresetSection = "timeline"): OrcamentoPreset => ({
    id: uid(),
    section,
    name: "",
    body: "",
    created: new Date().toISOString(),
  });

  const presetsFor = (section: PresetSection) =>
    presets.filter((p) => p.section === section);

  const applyPreset = (preset: OrcamentoPreset) => {
    if (!editing) return;
    if (preset.section === "timeline") {
      const items = itemsFromTimeline(preset.body, editing.items);
      const total = editing.manualTotal
        ? editing.total
        : items.reduce((a, i) => a + Number(i.value || 0), 0);
      setEditing({
        ...editing,
        timeline: preset.body,
        items,
        total,
      });
      showToast("Etapas aplicadas · investimento atualizado");
      return;
    }
    setEditing({ ...editing, [preset.section]: preset.body });
    showToast(`Preset “${preset.name}” aplicado`);
  };

  const syncItemsFromTimeline = () => {
    if (!editing) return;
    const items = itemsFromTimeline(editing.timeline, editing.items);
    const total = editing.manualTotal
      ? editing.total
      : items.reduce((a, i) => a + Number(i.value || 0), 0);
    setEditing({ ...editing, items, total });
    showToast("Itens gerados a partir das etapas");
  };

  const savePreset = async () => {
    if (!presetForm?.name.trim()) {
      showToast("Informe o nome do preset");
      return;
    }
    setBusy(true);
    try {
      await orcamentosApi.savePreset(presetForm);
      await reload();
      setPresetForm(null);
      showToast("Preset salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  // Função de render (não componente): evita remontar o <select> a cada render
  const presetSelect = (section: PresetSection, label = "Usar preset") => {
    const list = presetsFor(section);
    if (!list.length) return null;
    return (
      <div className="w-full max-w-xs">
        <Select
          size="sm"
          ariaLabel={label}
          placeholder={`${label}…`}
          value=""
          onChange={(id) => {
            const preset = list.find((p) => p.id === id);
            if (preset) applyPreset(preset);
          }}
          options={list.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>
    );
  };

  const todayRaw = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const ProposalRow = ({
    p,
    compact,
  }: {
    p: OrcamentoProposal;
    compact?: boolean;
  }) => (
    <article
      className={
        compact
          ? "flex flex-col gap-3 border-b border-line py-4 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-[border-color] hover:border-line-strong sm:flex-row sm:items-center sm:justify-between"
      }
    >
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium tracking-tight sm:text-base">
          {p.company || "Projeto sem nome"}
        </h3>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass(p.status)}`}
          >
            {p.status}
          </span>
          <p className="min-w-0 truncate text-xs text-muted">
            {clientName(p.clientId)}
            {compact ? null : ` · v${p.version}`}
            {" · "}
            {new Date(p.created).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <p className="mr-auto text-base font-semibold tabular-nums tracking-tight sm:mr-1">
          {money(p.total)}
        </p>
        <button
          type="button"
          className={btn}
          onClick={() => openProposal({ ...p })}
        >
          Abrir
        </button>
        <button
          type="button"
          className={btn}
          disabled={pdfBusy || Boolean(sendBusyId)}
          onClick={() => exportPdf(p)}
          aria-label={
            pdfBusy && pdfSource?.id === p.id && !sendBusyId
              ? "Gerando PDF…"
              : `Baixar PDF de ${p.company || "orçamento"}`
          }
        >
          {pdfBusy && pdfSource?.id === p.id && !sendBusyId ? "PDF…" : "PDF"}
        </button>
        <button
          type="button"
          className={btn}
          disabled={pdfBusy || Boolean(sendBusyId)}
          onClick={() => sendProposalEmail(p)}
          aria-label={`Enviar orçamento ${p.company || ""} por e-mail`}
        >
          {sendBusyId === p.id ? "Enviando…" : "Enviar"}
        </button>
        {/aprov/i.test(p.status) ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={pdfBusy || Boolean(sendBusyId)}
            onClick={() => exportContract(p)}
          >
            {pdfBusy && contractSource?.id === p.id ? "Contrato…" : "Contrato"}
          </button>
        ) : null}
        {!compact ? (
          <button
            type="button"
            className={btnDanger}
            onClick={async () => {
              if (!window.confirm("Excluir orçamento?")) return;
              await orcamentosApi.deleteProposal(p.id);
              await reload();
              showToast("Orçamento excluído");
            }}
          >
            Excluir
          </button>
        ) : null}
      </div>
    </article>
  );

  return (
    <div className={appRoot}>
      <input
        ref={templateInputRef}
        type="file"
        accept="application/json,.json,text/plain,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importTemplate(file);
        }}
      />
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className={`${shellClass} flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 xl:px-8 2xl:px-10`}>
          <Link to="/" className="flex cursor-pointer items-center gap-2 sm:gap-2.5">
            <TrafficLights />
            <span className="ml-1 font-bold sm:ml-2">.dev Bossle</span>
            <span className="hidden text-sm font-light text-muted sm:inline">
              / orçamentos
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Buscar (Ctrl + K)"
              className={`flex min-h-9 items-center gap-2 rounded-full border border-line bg-surface/70 px-3 text-sm text-faint transition-colors hover:border-line-strong hover:text-muted md:w-60 lg:w-72 ${focusRing}`}
            >
              <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35" />
              <span className="hidden flex-1 text-left md:inline">Buscar…</span>
              <kbd className="hidden rounded-md border border-line px-1.5 text-[10px] md:inline">Ctrl K</kbd>
            </button>
            <span className="hidden max-w-[160px] truncate text-xs text-muted xl:inline xl:max-w-[200px]">
              {username}
            </span>
            <button
              type="button"
              onClick={toggleDark}
              aria-label="Alternar tema"
              className={`rounded-lg p-1 ${focusRing}`}
            >
              <img
                src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
                className="w-5 cursor-pointer sm:w-6"
                alt=""
                width={24}
                height={24}
              />
            </button>
            <div className="relative hidden sm:block">
              <button type="button" className={btnPrimary} aria-haspopup="menu" aria-expanded={quickOpen} onClick={() => setQuickOpen((o) => !o)}>
                + Novo
              </button>
              {quickOpen ? <QuickMenu onClose={() => setQuickOpen(false)} items={quickItems} align="right" /> : null}
            </div>
          </div>
        </div>
      </header>

      <div className={`${shellClass} grid md:grid-cols-[210px_1fr] xl:grid-cols-[230px_1fr]`}>
        <aside className="hidden py-6 pr-3 md:sticky md:top-[65px] md:flex md:h-[calc(100dvh-65px)] md:flex-col md:pl-4 xl:pr-5 xl:pl-5">
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
            {nav.map((item, idx) => {
              const active = tab === item.id && !editing;
              const header = idx === 0 || nav[idx - 1]!.group !== item.group ? item.group : "";
              return (
                <div key={item.id}>
                  {header ? <p className={`${labelClass} px-3 pb-1 text-xs ${idx ? "pt-4" : ""}`}>{header}</p> : null}
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${focusRing} ${
                      active
                        ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(24_32_42/0.06)] ring-1 ring-line [&_svg]:text-accent"
                        : "text-muted hover:bg-surface/60 hover:text-ink"
                    }`}
                  >
                    <Icon paths={navIcons[item.id]} />
                    <span className="flex-1">{item.label}</span>
                    {badges[item.id] ? (
                      <span
                        className={`min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-semibold tabular-nums ${
                          item.id === "today" ? "bg-accent text-accent-ink" : "bg-sunken text-muted"
                        }`}
                        aria-label={`${badges[item.id]} pendentes`}
                      >
                        {badges[item.id]}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </nav>
          <button type="button" onClick={onLogout} className={`${btnGhost} mt-4 w-full justify-start`}>
            Sair
          </button>
        </aside>

        <main key={editing ? "editing" : tab} className="adm-view min-w-0 px-4 py-6 pb-28 sm:px-6 md:py-8 md:pb-10 lg:px-8 xl:px-10 xl:py-10 2xl:px-12 2xl:py-12">
          {!editing && tab === "today" ? (
            <Today
              name={profile.name || username}
              version={taskVersion}
              onNavigate={(t: TodayNav) => go(t)}
              onOpenClient={setSheetClientId}
              onOpenProposal={openProposalById}
              onOpenTask={openTask}
              showToast={showToast}
              onData={applyBadges}
            />
          ) : null}

          {!editing && tab === "agenda" ? (
            <Agenda version={taskVersion} onOpenTask={openTask} onOpenClient={setSheetClientId} onNavigate={(t) => go(t)} showToast={showToast} />
          ) : null}

          {!editing && tab === "projects" ? (
            <Projects clients={clients} onOpenClient={setSheetClientId} onOpenTask={openTask} showToast={showToast} />
          ) : null}

          {!editing && tab === "tasks" ? (
            <Tasks clients={clients} version={taskVersion} onOpenTask={openTask} onOpenClient={setSheetClientId} showToast={showToast} />
          ) : null}

          {editing ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Proposta
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {proposals.some((p) => p.id === editing.id)
                      ? "Editar orçamento"
                      : "Novo orçamento"}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      setEditing(null);
                      setEditStep("projeto");
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => pickTemplateFile("current")}
                  >
                    Importar modelo
                  </button>
                  <button
                    type="button"
                    className={btn}
                    onClick={() => exportTemplate(editing)}
                  >
                    Exportar modelo
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={pdfBusy || Boolean(sendBusyId)}
                    onClick={() => exportPdf(editing)}
                  >
                    {pdfBusy && !sendBusyId && !contractSource
                      ? "Gerando PDF…"
                      : "Baixar PDF"}
                  </button>
                  {/aprov/i.test(editing.status) ? (
                    <button
                      type="button"
                      className={btn}
                      disabled={pdfBusy || Boolean(sendBusyId)}
                      onClick={() => exportContract(editing)}
                    >
                      {pdfBusy && contractSource?.id === editing.id
                        ? "Gerando contrato…"
                        : "Gerar contrato"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={btn}
                    disabled={pdfBusy || Boolean(sendBusyId)}
                    onClick={() => sendProposalEmail(editing)}
                  >
                    {sendBusyId === editing.id ? "Enviando…" : "Enviar e-mail"}
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy || Boolean(sendBusyId)}
                    onClick={saveProposal}
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <nav
                className="flex flex-wrap gap-2"
                aria-label="Etapas do orçamento"
              >
                {EDIT_STEPS.map((step, index) => {
                  const active = step.id === editStep;
                  const done = index < editStepIndex;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setEditStep(step.id)}
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${focusRing} ${
                        active
                          ? "border-ink bg-ink text-canvas"
                          : done
                            ? "border-emerald-600/40 bg-emerald-500/10 text-accent-text"
                            : "border-line bg-surface text-muted"
                      }`}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                          active
                            ? "bg-white/20"
                            : done
                              ? "bg-emerald-600 text-white"
                              : "bg-sunken"
                        }`}
                      >
                        {index + 1}
                      </span>
                      {step.label}
                    </button>
                  );
                })}
              </nav>

              {editStep === "projeto" ? (
                <div className={`${cardClass} grid gap-5 sm:grid-cols-2`}>
                  <div className="sm:col-span-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      Dados do projeto
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Cliente, nome e condições básicas do orçamento.
                    </p>
                  </div>
                  <Field label="Cliente" full>
                    <Select
                      ariaLabel="Cliente"
                      placeholder="Selecionar cliente…"
                      searchable
                      value={editing.clientId}
                      onChange={(v) => setEditing({ ...editing, clientId: v })}
                      options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.name} — ${c.company}` : c.name }))}
                    />
                  </Field>
                  <Field label="Nome do projeto" full>
                    <input
                      className={inputClass}
                      value={editing.company}
                      onChange={(e) =>
                        setEditing({ ...editing, company: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Versão">
                    <input
                      className={inputClass}
                      value={editing.version}
                      onChange={(e) =>
                        setEditing({ ...editing, version: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Validade (dias)">
                    <input
                      type="number"
                      className={inputClass}
                      value={editing.validity}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          validity: Number(e.target.value || 0),
                        })
                      }
                    />
                    <p className="mt-1 text-[11px] leading-snug text-muted">
                      Conta a partir do status Enviado ou da regeneração do
                      link.
                    </p>
                  </Field>
                  <Field label="Status" full>
                    <Select
                      ariaLabel="Status"
                      value={editing.status}
                      onChange={(v) => setEditing({ ...editing, status: v })}
                      options={STATUSES.map((s) => ({ value: s, label: s, dot: statusDot(s) }))}
                    />
                  </Field>
                </div>
              ) : null}

              {editStep === "conteudo" ? (
                <div className={`${cardClass} grid gap-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        Conteúdo da proposta
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Textos que aparecem no PDF e na página do cliente.
                      </p>
                    </div>
                    {presetSelect("timeline", "Preset de etapas")}
                  </div>
                  <Field
                    label="Ideia"
                    hint="Resumo do projeto em 2 a 4 linhas."
                  >
                    <textarea
                      className={`${textareaClass} min-h-44`}
                      value={editing.idea}
                      onChange={(e) =>
                        setEditing({ ...editing, idea: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Escopo"
                    hint="Uma funcionalidade ou entrega por linha."
                  >
                    <textarea
                      className={`${textareaClass} min-h-52`}
                      value={editing.scope}
                      onChange={(e) =>
                        setEditing({ ...editing, scope: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Etapas e prazos"
                    hint="Uma etapa por linha, com o prazo. Ao usar preset, o investimento é montado com essas linhas."
                  >
                    <textarea
                      className={`${textareaClass} min-h-44`}
                      value={editing.timeline}
                      onChange={(e) =>
                        setEditing({ ...editing, timeline: e.target.value })
                      }
                    />
                  </Field>
                </div>
              ) : null}

              {editStep === "investimento" ? (
                <div className={`${cardClass} space-y-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        Investimento
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Itens gerados pelas etapas, valores e forma de pagamento.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btn}
                        onClick={syncItemsFromTimeline}
                      >
                        Puxar das etapas
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() =>
                          setEditing({
                            ...editing,
                            items: [
                              ...editing.items,
                              { name: "", desc: "", value: 0 },
                            ],
                          })
                        }
                      >
                        + Item
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {editing.items.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-3 rounded-xl border border-line bg-canvas p-4 sm:grid-cols-[1fr_1fr_140px]"
                      >
                        <input
                          className={inputClass}
                          placeholder="Item / fase"
                          value={item.name}
                          onChange={(e) => {
                            const items = [...editing.items];
                            items[index] = { ...item, name: e.target.value };
                            setEditing({ ...editing, items });
                          }}
                        />
                        <input
                          className={inputClass}
                          placeholder="Descrição"
                          value={item.desc}
                          onChange={(e) => {
                            const items = [...editing.items];
                            items[index] = { ...item, desc: e.target.value };
                            setEditing({ ...editing, items });
                          }}
                        />
                        <input
                          type="number"
                          className={inputClass}
                          placeholder="Valor"
                          value={item.value || ""}
                          onChange={(e) => {
                            const items = [...editing.items];
                            items[index] = {
                              ...item,
                              value: Number(e.target.value || 0),
                            };
                            setEditing({
                              ...editing,
                              items,
                              total: editing.manualTotal
                                ? editing.total
                                : items.reduce(
                                    (a, i) => a + Number(i.value || 0),
                                    0,
                                  ),
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 font-semibold">
                    <span className="text-base">Total</span>
                    <input
                      type="number"
                      className={`${inputClass} max-w-[240px] text-right text-xl font-semibold`}
                      value={editing.total || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          total: Number(e.target.value || 0),
                          manualTotal: true,
                        })
                      }
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={editing.manualTotal}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          manualTotal: e.target.checked,
                          total: e.target.checked
                            ? editing.total
                            : editing.items.reduce(
                                (a, i) => a + Number(i.value || 0),
                                0,
                              ),
                        })
                      }
                      className="size-5 cursor-pointer accent-emerald-600"
                    />
                    Total manual (não recalcular pelos itens)
                  </label>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium tracking-tight text-muted">
                        Forma de pagamento
                      </span>
                      {presetSelect("payment", "Preset de pagamento")}
                    </div>
                    <textarea
                      className={textareaClass}
                      value={editing.payment}
                      onChange={(e) =>
                        setEditing({ ...editing, payment: e.target.value })
                      }
                    />
                  </div>
                </div>
              ) : null}

              {editStep === "extras" ? (
                <div className={`${cardClass} grid gap-5`}>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Extras
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Materiais necessários e observações da proposta.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium tracking-tight text-muted">
                        O que preciso do cliente
                      </span>
                      {presetSelect("needs", "Preset")}
                    </div>
                    <p className="text-xs text-muted">
                      Uma solicitação por linha.
                    </p>
                    <textarea
                      className={`${textareaClass} min-h-48`}
                      value={editing.needs}
                      onChange={(e) =>
                        setEditing({ ...editing, needs: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium tracking-tight text-muted">
                        Observações
                      </span>
                      {presetSelect("notes", "Preset")}
                    </div>
                    <textarea
                      className={`${textareaClass} min-h-48`}
                      value={editing.notes}
                      onChange={(e) =>
                        setEditing({ ...editing, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              ) : null}

              {editStep === "envio" ? (
              <>
              <div className={`${cardClass} space-y-4`}>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Link para o cliente
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Gere um link com senha para o cliente ver, comentar e
                    aprovar ou recusar a proposta.
                  </p>
                </div>
                {!proposals.some((p) => p.id === editing.id) ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Salve o orçamento antes de gerar o link.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={busy}
                        onClick={generateShare}
                      >
                        {editing.shareEnabled
                          ? "Regenerar senha"
                          : "Gerar link e senha"}
                      </button>
                      {editing.shareEnabled ? (
                        <button
                          type="button"
                          className={btn}
                          disabled={busy}
                          onClick={disableShare}
                        >
                          Desativar link
                        </button>
                      ) : null}
                    </div>
                    {editing.shareEnabled && editing.shareToken ? (
                      <div className="space-y-3 rounded-xl border border-line bg-canvas p-3">
                        <div>
                          <p className="text-xs font-medium opacity-50">
                            Link
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <code
                              className="break-all text-sm"
                              title="Link amigável — o token real vai na cópia"
                            >
                              {friendlyShareLabel(editing.company)}
                            </code>
                            <button
                              type="button"
                              className={btn}
                              onClick={() =>
                                copyText(
                                  shareUrl ||
                                    proposalPublicUrl(editing.shareToken!),
                                  "Link",
                                )
                              }
                            >
                              Copiar link
                            </button>
                          </div>
                        </div>
                        {sharePassword ? (
                          <div>
                            <p className="text-xs font-medium opacity-50">
                              Senha (só aparece agora)
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <code className="text-base font-semibold">
                                {sharePassword}
                              </code>
                              <button
                                type="button"
                                className={btn}
                                onClick={() =>
                                  copyText(sharePassword, "Senha")
                                }
                              >
                                Copiar senha
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted">
                            A senha só é mostrada ao gerar ou regenerar. Se
                            perdeu, regenere uma nova.
                          </p>
                        )}
                        {editing.clientDecidedAt ? (
                          <p className="text-sm">
                            Cliente decidiu em{" "}
                            {new Date(editing.clientDecidedAt).toLocaleString(
                              "pt-BR",
                            )}
                            {editing.clientDecisionNote
                              ? `: ${editing.clientDecisionNote}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-2 border-t border-line pt-3">
                      <p className="text-xs font-medium opacity-50">
                        Enviar ao cliente
                      </p>
                      <p className="text-sm text-muted">
                        WhatsApp abre o app com a mensagem pronta (link + senha).
                        E-mail envia o PDF da documentação junto com o acesso
                        online.
                        {!sharePassword
                          ? " Se ainda não houver senha, ela será gerada ao enviar."
                          : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || Boolean(sendBusyId)}
                          onClick={shareViaWhatsApp}
                          className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                        >
                          <WhatsAppIcon className="size-[18px]" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          disabled={busy || Boolean(sendBusyId) || pdfBusy}
                          onClick={shareViaEmail}
                          className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 bg-[#2563eb] px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
                        >
                          <MailIcon className="size-[18px]" />
                          {sendBusyId === editing.id ? "Enviando…" : "E-mail"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {proposals.some((p) => p.id === editing.id) ? (
                <div className={`${cardClass} space-y-4`}>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Comentários
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Thread com o cliente na página da proposta.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {comments.length === 0 ? (
                      <li className="text-sm text-muted">
                        Nenhum comentário ainda.
                      </li>
                    ) : (
                      comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-line bg-canvas px-4 py-3 text-base"
                        >
                          <div className="mb-1 flex justify-between gap-2 text-xs font-medium tracking-wide opacity-60">
                            <span>
                              {c.author === "admin" ? "Você" : "Cliente"}
                            </span>
                            <span className="normal-case tracking-normal">
                              {new Date(c.created).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="space-y-2">
                    <textarea
                      className={textareaClass}
                      placeholder="Responder ao cliente…"
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={commentsBusy || !commentDraft.trim()}
                      onClick={sendAdminComment}
                    >
                      {commentsBusy ? "Enviando…" : "Enviar resposta"}
                    </button>
                  </div>
                </div>
              ) : null}
              </>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  className={btn}
                  disabled={editStepIndex <= 0}
                  onClick={() =>
                    setEditStep(EDIT_STEPS[editStepIndex - 1]!.id)
                  }
                >
                  Anterior
                </button>
                <p className="text-sm text-muted">
                  Parte {editStepIndex + 1} de {EDIT_STEPS.length}
                </p>
                {editStepIndex < EDIT_STEPS.length - 1 ? (
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() =>
                      setEditStep(EDIT_STEPS[editStepIndex + 1]!.id)
                    }
                  >
                    Próxima
                  </button>
                ) : (
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy || Boolean(sendBusyId)}
                    onClick={saveProposal}
                  >
                    Salvar orçamento
                  </button>
                )}
              </div>
            </section>
          ) : null}

          {!editing && tab === "dashboard" ? (
            <section className="space-y-6 xl:space-y-8" aria-labelledby="dashboard-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted">
                    {today}
                  </p>
                  <h1
                    id="dashboard-title"
                    className="mt-1 text-pretty text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl"
                  >
                    Resultados
                  </h1>
                  <p className="mt-2 max-w-xl text-sm text-muted xl:max-w-2xl">
                    Orçamentos, conversão e os clientes que mais trazem resultado.
                  </p>
                </div>
                <button
                  type="button"
                  className={`${btnPrimary} w-full sm:hidden`}
                  onClick={() => openProposal(blankProposal())}
                >
                  + Novo orçamento
                </button>
              </div>

              <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface xl:grid-cols-4">
                {[
                  {
                    label: "Clientes",
                    value: String(clients.length),
                    hint:
                      clients.length === 1
                        ? "cadastrado"
                        : "cadastrados",
                  },
                  {
                    label: "Orçamentos",
                    value: String(stats.activeCount),
                    hint:
                      stats.activeCount === 0
                        ? "nenhum no pipeline"
                        : stats.draft === stats.activeCount
                          ? "todos em elaboração"
                          : stats.draft === 0
                            ? "nenhum em elaboração"
                            : `${stats.draft} em elaboração`,
                  },
                  {
                    label: "Valor orçado",
                    value: money(stats.totalValue),
                    hint: "soma sem propostas recusadas",
                  },
                  {
                    label: "Aprovado",
                    value: money(stats.approvedValue),
                    hint:
                      stats.approved === 0
                        ? "nenhuma proposta"
                        : `${stats.approved} proposta${stats.approved === 1 ? "" : "s"}`,
                    accent: true,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex min-h-[104px] min-w-0 flex-col border-line p-4 sm:p-5 xl:p-6 [&:nth-child(n+3)]:border-t [&:nth-child(even)]:border-l xl:[&:nth-child(n+3)]:border-t-0 xl:[&:not(:first-child)]:border-l"
                  >
                    <p className={labelClass}>
                      {stat.label}
                    </p>
                    <p
                      className={`mt-3 truncate text-xl font-semibold tracking-tight tabular-nums sm:text-2xl xl:text-3xl ${
                        stat.accent
                          ? "text-accent-text"
                          : ""
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-auto pt-2 text-xs leading-snug text-muted">
                      {stat.hint}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filtrar orçamentos por status"
              >
                {[
                  { label: "Em elaboração", n: stats.draft },
                  { label: "Enviado", n: stats.sent },
                  { label: "Aprovado", n: stats.approved },
                  { label: "Recusado", n: stats.refused },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setStatusFilter(chip.label);
                      go("proposals");
                    }}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-transparent px-3.5 py-1.5 text-xs font-medium transition-[background-color,border-color] ${statusChipClass(chip.label)} ${focusRing}`}
                  >
                    <span>{chip.label}</span>
                    <span className="tabular-nums opacity-70">{chip.n}</span>
                  </button>
                ))}
              </div>

              <Results proposals={proposals} clients={clients} onOpenClient={setSheetClientId} />

              <div className={cardClass}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold tracking-tight">
                    Últimos orçamentos
                  </h2>
                  {proposals.length > 0 ? (
                    <button
                      type="button"
                      className={`shrink-0 text-sm font-medium text-accent-text underline decoration-accent/30 underline-offset-4 transition-opacity hover:opacity-80 ${focusRing} rounded-lg`}
                      onClick={() => go("proposals")}
                    >
                      Ver todos
                    </button>
                  ) : null}
                </div>

                {recent.length ? (
                  <div className="mt-2">
                    {recent.map((p) => (
                      <ProposalRow key={p.id} p={p} compact />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-line-strong px-4 py-10 text-center">
                    <p className="font-medium">Nenhum orçamento ainda</p>
                    <p className="mt-1 text-sm text-muted">
                      Crie o primeiro ou importe o seed em Backup.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => openProposal(blankProposal())}
                      >
                        Criar orçamento
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => go("settings")}
                      >
                        Importar seed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {!editing && tab === "prospects" ? (
            <Suspense fallback={<TabSkeleton />}><Funnel showToast={showToast} /></Suspense>
          ) : null}

          {!editing && tab === "instagram" ? <Suspense fallback={<TabSkeleton />}><Instagram showToast={showToast} /></Suspense> : null}

          {!editing && tab === "finance" ? <Suspense fallback={<TabSkeleton />}><Finance showToast={showToast} /></Suspense> : null}

          {!editing && tab === "inbox" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Site
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Inbox
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Contatos do formulário em devbossle.com.br
                  </p>
                </div>
                <button
                  type="button"
                  className={btn}
                  disabled={leadsLoading}
                  onClick={async () => {
                    setLeadsLoading(true);
                    try {
                      const data = await orcamentosApi.listLeads();
                      setLeads(data.leads);
                    } catch (e) {
                      showToast(
                        e instanceof Error ? e.message : "Erro ao atualizar",
                      );
                    } finally {
                      setLeadsLoading(false);
                    }
                  }}
                >
                  {leadsLoading ? "Carregando…" : "Atualizar"}
                </button>
              </div>

              <div className="space-y-2">
                {leads.map((lead) => (
                  <article
                    key={lead.id}
                    className={`border p-4 transition ${
                      lead.readAt
                        ? "border-line bg-surface"
                        : "border-emerald-600/40 bg-emerald-500/5 dark:border-emerald-400/30"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold tracking-tight">
                            {lead.name}
                          </h3>
                          {!lead.readAt ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-accent-text">
                              Novo
                            </span>
                          ) : null}
                          {lead.style ? (
                            <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold text-muted">
                              {lead.style}
                            </span>
                          ) : null}
                        </div>
                        <a
                          href={`mailto:${lead.email}`}
                          className="mt-1 block text-sm text-accent-text underline decoration-accent/30 underline-offset-4"
                        >
                          {lead.email}
                        </a>
                        <p className="mt-1 text-xs text-muted">
                          {lead.created
                            ? new Date(lead.created).toLocaleString("pt-BR")
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!lead.readAt ? (
                          <button
                            type="button"
                            className={btn}
                            onClick={async () => {
                              try {
                                const { lead: updated } =
                                  await orcamentosApi.markLeadRead(lead.id);
                                setLeads((prev) =>
                                  prev.map((l) =>
                                    l.id === updated.id ? updated : l,
                                  ),
                                );
                              } catch (e) {
                                showToast(
                                  e instanceof Error ? e.message : "Erro",
                                );
                              }
                            }}
                          >
                            Marcar lido
                          </button>
                        ) : null}
                        <a
                          href={`mailto:${lead.email}?subject=${encodeURIComponent(`Re: contato — ${lead.style || "site"}`)}`}
                          className={btnPrimary}
                        >
                          Responder
                        </a>
                        <button
                          type="button"
                          className={btn}
                          onClick={async () => {
                            try {
                              showToast(await convertToClient("contact", lead.id));
                              setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, readAt: l.readAt ?? new Date().toISOString() } : l)));
                            } catch (e) {
                              showToast(e instanceof Error ? e.message : "Erro ao criar cliente");
                            }
                          }}
                        >
                          Virar cliente
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {lead.idea}
                    </p>
                  </article>
                ))}
                {!leadsLoading && !leads.length ? (
                  <div className="border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
                    Nenhum contato ainda.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!editing && tab === "clients" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Cadastro
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Clientes
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    {clients.length} cadastrado
                    {clients.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button type="button" className={btnPrimary} onClick={newClient}>
                  + Cliente
                </button>
              </div>

              {clientForm ? (
                <div className={`${cardClass} mb-4 grid gap-3 sm:grid-cols-2`}>
                  {(
                    [
                      ["name", "Nome"],
                      ["company", "Empresa"],
                      ["legalName", "Razão social (opcional)"],
                      ["document", "CPF/CNPJ (opcional)"],
                      ["phone", "Telefone"],
                      ["email", "E-mail"],
                      ["link", "Site / Instagram"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        className={inputClass}
                        inputMode={
                          key === "phone" || key === "document"
                            ? "tel"
                            : undefined
                        }
                        placeholder={
                          key === "phone"
                            ? "(54)9.9999-9999"
                            : key === "document"
                              ? "000.000.000-00 ou 00.000.000/0000-00"
                              : undefined
                        }
                        maxLength={
                          key === "phone" ? 15 : key === "document" ? 18 : undefined
                        }
                        value={
                          key === "phone"
                            ? maskPhoneBr(clientForm.phone)
                            : key === "document"
                              ? maskCpfCnpj(clientForm.document || "")
                              : (clientForm[key] ?? "")
                        }
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            [key]:
                              key === "phone"
                                ? maskPhoneBr(e.target.value)
                                : key === "document"
                                  ? maskCpfCnpj(e.target.value)
                                  : e.target.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                  <Field label="Endereço (opcional)" full>
                    <input
                      className={inputClass}
                      placeholder="Rua, número, bairro, cidade – UF"
                      value={clientForm.address || ""}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Observações" full>
                    <textarea
                      className={textareaClass}
                      value={clientForm.notes}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          notes: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busy}
                      onClick={saveClient}
                    >
                      Salvar cliente
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setClientForm(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              <ClientList
                clients={clients}
                proposals={proposals}
                onOpen={(c) => setSheetClientId(c.id)}
                onNewProposal={(id) => openProposal(blankProposal(id))}
                onDelete={async (c) => {
                  if (!window.confirm(`Excluir ${c.name}? O histórico e as tarefas ligadas a ele também saem.`)) return;
                  await orcamentosApi.deleteClient(c.id);
                  await reload();
                  showToast("Cliente excluído");
                }}
              />
            </section>
          ) : null}

          {!editing && tab === "proposals" ? (
            <section>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Histórico
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Orçamentos
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => pickTemplateFile("new")}
                  >
                    Importar modelo
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => openProposal(blankProposal())}
                  >
                    + Novo
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("todos")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === "todos"
                      ? "bg-ink text-canvas"
                      : "border border-line text-muted"
                  }`}
                >
                  Todos · {proposals.length}
                </button>
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      statusFilter === s
                        ? statusClass(s)
                        : "border border-line text-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredProposals.map((p) => (
                  <ProposalRow key={p.id} p={p} />
                ))}
                {!filteredProposals.length ? (
                  <div className="border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
                    Nenhum orçamento neste filtro.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!editing && tab === "presets" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Biblioteca
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Presets de texto
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted">
                    Textos prontos para etapas, pagamento, necessidades e
                    observações. Ao aplicar etapas, o investimento é montado
                    automaticamente com essas linhas.
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() =>
                    setPresetForm(
                      blankPreset(
                        presetSectionFilter === "todos"
                          ? "timeline"
                          : presetSectionFilter,
                      ),
                    )
                  }
                >
                  + Preset
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPresetSectionFilter("todos")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    presetSectionFilter === "todos"
                      ? "bg-ink text-canvas"
                      : "border border-line text-muted"
                  }`}
                >
                  Todos · {presets.length}
                </button>
                {PRESET_SECTIONS.map((s) => {
                  const n = presetsFor(s.id).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPresetSectionFilter(s.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        presetSectionFilter === s.id
                          ? "bg-ink text-canvas"
                          : "border border-line text-muted"
                      }`}
                    >
                      {s.label} · {n}
                    </button>
                  );
                })}
              </div>

              {presetForm ? (
                <div className={`${cardClass} mb-4 space-y-4`}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Seção">
                      <Select
                        ariaLabel="Seção"
                        value={presetForm.section}
                        onChange={(v) => setPresetForm({ ...presetForm, section: v as PresetSection })}
                        options={PRESET_SECTIONS.map((x) => ({ value: x.id, label: x.label }))}
                      />
                    </Field>
                    <Field label="Nome do preset">
                      <input
                        className={inputClass}
                        placeholder="Ex.: App ferrador — etapas"
                        value={presetForm.name}
                        onChange={(e) =>
                          setPresetForm({
                            ...presetForm,
                            name: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field
                    label="Texto"
                    hint={
                      PRESET_SECTIONS.find((s) => s.id === presetForm.section)
                        ?.hint
                    }
                  >
                    <textarea
                      className={`${textareaClass} min-h-52`}
                      value={presetForm.body}
                      onChange={(e) =>
                        setPresetForm({
                          ...presetForm,
                          body: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busy}
                      onClick={savePreset}
                    >
                      Salvar preset
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setPresetForm(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {(presetSectionFilter === "todos"
                  ? presets
                  : presetsFor(presetSectionFilter)
                ).map((p) => {
                  const sectionLabel =
                    PRESET_SECTIONS.find((s) => s.id === p.section)?.label ??
                    p.section;
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-line bg-surface p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-accent-text">
                            {sectionLabel}
                          </p>
                          <h3 className="mt-1 text-base font-semibold tracking-tight">
                            {p.name}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                            {p.body.slice(0, 280)}
                            {p.body.length > 280 ? "…" : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={btn}
                            onClick={() => setPresetForm({ ...p })}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={async () => {
                              if (!window.confirm("Excluir este preset?"))
                                return;
                              await orcamentosApi.deletePreset(p.id);
                              await reload();
                              showToast("Preset excluído");
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!presets.length ||
                (presetSectionFilter !== "todos" &&
                  !presetsFor(presetSectionFilter).length) ? (
                  <div className="border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
                    Nenhum preset ainda. Crie o primeiro para reutilizar textos
                    nos orçamentos.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!editing && tab === "profile" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium opacity-60">
                    Perfil
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Meus dados
                  </h1>
                  <p className="mt-2 text-sm text-muted">
                    Aparecem no rodapé das propostas
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const { profile: next } =
                        await orcamentosApi.saveProfile(profileForm);
                      onRefresh({
                        clients,
                        proposals,
                        profile: next,
                        presets,
                      });
                      showToast("Perfil salvo");
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Erro");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Salvar
                </button>
              </div>
              <div className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
                {(
                  [
                    ["name", "Nome"],
                    ["title", "Título"],
                    ["phone", "Telefone"],
                    ["email", "E-mail"],
                    ["linkedin", "LinkedIn"],
                    ["portfolio", "Portfólio"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      inputMode={key === "phone" ? "tel" : undefined}
                      placeholder={
                        key === "phone" ? "(54)9.9999-9999" : undefined
                      }
                      maxLength={key === "phone" ? 15 : undefined}
                      value={
                        key === "phone"
                          ? maskPhoneBr(profileForm.phone)
                          : profileForm[key]
                      }
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          [key]:
                            key === "phone"
                              ? maskPhoneBr(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  </Field>
                ))}
                <Field label="CPF (contrato)">
                  <input
                    className={inputClass}
                    inputMode="tel"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={maskCpfCnpj(profileForm.document || "")}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        document: maskCpfCnpj(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Endereço (contrato)" full>
                  <input
                    className={inputClass}
                    placeholder="Rua, número, bairro, cidade – UF"
                    value={profileForm.address || ""}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        address: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Bio" full>
                  <textarea
                    className={textareaClass}
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className={`${cardClass} mt-4`}>
                <h2 className="text-base font-semibold tracking-tight">
                  Segurança
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Envia um link de redefinição para{" "}
                  <span className="font-medium text-muted">
                    {profileForm.email?.trim() || "o e-mail de Meus dados"}
                  </span>
                  .
                </p>
                <button
                  type="button"
                  className={`${btn} mt-4`}
                  disabled={busy || !profileForm.email?.trim()}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await orcamentosApi.forgotPassword();
                      showToast(res.message);
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Erro");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Enviar link de redefinição
                </button>
              </div>
            </section>
          ) : null}

          {!editing && tab === "settings" ? (
            <section>
              <p className="text-sm font-medium opacity-60">
                Dados
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Backup / seed
              </h1>
              <p className="mt-2 text-sm text-muted">
                Baixe uma cópia de tudo ou importe o JSON inicial para o Neon.
              </p>
              <div className={`${cardClass} mt-6 flex flex-wrap items-center justify-between gap-4`}>
                <div className="min-w-0">
                  <h3 className="font-semibold">Backup completo</h3>
                  <p className="mt-1 text-sm text-muted">
                    Clientes, orçamentos, tarefas, histórico, cobranças, projetos, funil, Instagram e regras de finanças em um arquivo JSON. Tokens e senhas não entram.
                  </p>
                </div>
                <a className={btnPrimary} href="/api/orcamentos/crm/export" download>
                  Baixar backup
                </a>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <h3 className="font-semibold">Mesclar seed</h3>
                  <p className="mt-2 text-sm text-muted">
                    Insere/atualiza os clientes e orçamentos iniciais sem
                    apagar o restante.
                  </p>
                  <button
                    type="button"
                    className={`${btnPrimary} mt-4`}
                    disabled={busy}
                    onClick={() => importSeed("merge")}
                  >
                    Importar (merge)
                  </button>
                </div>
                <div className={cardClass}>
                  <h3 className="font-semibold">Substituir tudo</h3>
                  <p className="mt-2 text-sm text-muted">
                    Apaga clientes e propostas atuais e carrega só o seed.
                  </p>
                  <button
                    type="button"
                    className={`${btnDanger} mt-4 `}
                    disabled={busy}
                    onClick={() => importSeed("replace")}
                  >
                    Importar (replace)
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {!editing ? (
        <>
          {/* Botão flutuante: criar rápido */}
          <div className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 md:hidden">
            {fabOpen ? <QuickMenu onClose={() => setFabOpen(false)} items={quickItems} align="right" up /> : null}
            <button
              type="button"
              aria-label="Criar"
              aria-haspopup="menu"
              aria-expanded={fabOpen}
              onClick={() => setFabOpen((o) => !o)}
              className={`grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-float transition-transform active:scale-95 ${focusRing}`}
            >
              <svg viewBox="0 0 24 24" className={`size-6 transition-transform duration-200 ${fabOpen ? "rotate-45" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          <nav
            aria-label="Navegação"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/90 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
          >
            {mobileNav.map((id) => {
              const item = nav.find((n) => n.id === id)!;
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => go(id)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium transition-colors ${focusRing} ${
                    active ? "text-accent-text" : "text-faint"
                  }`}
                >
                  <span className={`relative grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-accent-soft" : ""}`}>
                    <Icon paths={navIcons[id]} />
                    {badges[id] ? (
                      <span className="absolute -top-1 right-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] leading-4 font-bold text-accent-ink tabular-nums">
                        {badges[id]}
                      </span>
                    ) : null}
                  </span>
                  {item.short}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium ${focusRing} ${
                !mobileNav.includes(tab) ? "text-accent-text" : "text-faint"
              }`}
            >
              <span className={`relative grid h-7 w-12 place-items-center rounded-full ${!mobileNav.includes(tab) ? "bg-accent-soft" : ""}`}>
                <Icon d="M4 6h16M4 12h16M4 18h16" />
                {(Object.keys(badges) as Tab[]).some((k) => !mobileNav.includes(k) && badges[k]) ? (
                  <span className="absolute top-0 right-3 size-2 rounded-full bg-accent ring-2 ring-surface" aria-label="Há novidades" />
                ) : null}
              </span>
              Mais
            </button>
          </nav>
        </>
      ) : null}

      {moreOpen ? (
        <Sheet title="Menu" onClose={() => setMoreOpen(false)}>
          {["Rotina", "Vendas", "Marketing", "Pessoal", "Ajustes"].map((g) => (
            <div key={g} className="mb-4">
              <p className={`${labelClass} mb-1.5 text-xs`}>{g}</p>
              <div className="grid grid-cols-3 gap-2">
                {nav
                  .filter((n) => n.group === g)
                  .map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => go(n.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-xs font-medium transition-colors ${focusRing} ${
                        tab === n.id ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:text-ink"
                      }`}
                    >
                      <Icon paths={navIcons[n.id]} />
                      {n.label}
                      {badges[n.id] ? <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-ink tabular-nums">{badges[n.id]}</span> : null}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <button type="button" className={btn} onClick={() => { setMoreOpen(false); setPaletteOpen(true); }}>
              Buscar
            </button>
            <button type="button" className={btnDanger} onClick={onLogout}>
              Sair
            </button>
          </div>
        </Sheet>
      ) : null}

      {taskDraft ? (
        <TaskEditor
          initial={taskDraft}
          clients={clients}
          onClose={() => setTaskDraft(null)}
          onSaved={() => setTaskVersion((v) => v + 1)}
          onDeleted={() => setTaskVersion((v) => v + 1)}
          showToast={showToast}
        />
      ) : null}

      {sheetClient ? (
        <ClientSheet
          key={sheetClient.id}
          client={sheetClient}
          proposals={proposals}
          taskVersion={taskVersion}
          onClose={() => setSheetClientId(null)}
          onEdit={(c) => {
            setSheetClientId(null);
            setTab("clients");
            setClientForm(c);
          }}
          onNewProposal={(id) => {
            setSheetClientId(null);
            openProposal(blankProposal(id));
          }}
          onOpenProposal={openProposalById}
          onOpenTask={openTask}
          onSaved={() => reload()}
          showToast={showToast}
        />
      ) : null}

      {helpOpen ? (
        <Sheet title="Atalhos do teclado" onClose={() => setHelpOpen(false)}>
          <dl className="divide-y divide-line text-sm">
            {[
              ["Ctrl K  ou  /", "Buscar clientes, orçamentos, leads e ações"],
              ["N", "Nova tarefa"],
              ["?", "Mostrar estes atalhos"],
              ["Esc", "Fechar painel, menu ou busca"],
              ["Ctrl Enter", "Registrar no histórico do cliente"],
              ["↑ ↓  Enter", "Navegar e escolher em menus e na busca"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">{v}</dt>
                <dd>
                  <kbd className="rounded-md border border-line bg-sunken px-2 py-1 font-sans text-xs whitespace-nowrap">{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Sheet>
      ) : null}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
        clients={clients}
        onPick={onPaletteResult}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="adm-pop fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-canvas shadow-float md:bottom-6"
        >
          {toast}
        </div>
      ) : null}

      {pdfSource ? (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] bg-white"
          style={{ width: 680 }}
        >
          <div ref={pdfRef} style={{ width: 680 }}>
            <ProposalPdfDocument
              proposal={pdfSource}
              client={clients.find((c) => c.id === pdfSource.clientId)}
              profile={profile}
            />
          </div>
        </div>
      ) : null}

      {contractSource ? (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] bg-white"
          style={{ width: 680 }}
        >
          <div ref={contractRef} style={{ width: 680 }}>
            {(() => {
              const client = clients.find(
                (c) => c.id === contractSource.clientId,
              );
              if (!client) return null;
              return (
                <ContractDocument
                  data={buildContractPayload({
                    proposal: contractSource,
                    client,
                    profile,
                  })}
                />
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Panel;
