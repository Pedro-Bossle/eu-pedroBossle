import {
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
import {
  itemsFromTimeline,
  PRESET_SECTIONS,
} from "../../lib/orcamentos/presets";
import {
  buildShareClientMessage,
  whatsappShareUrl,
} from "../../lib/orcamentos/shareMessage";
import { maskCpfCnpj } from "../../lib/documentMask";
import { maskPhoneBr } from "../../lib/phoneMask";
import type {
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

type Tab =
  | "dashboard"
  | "clients"
  | "proposals"
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

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-[#121212]";
const inputClass =
  `w-full min-h-12 border border-neutral-200 bg-[#f9f9f9] px-4 py-3.5 text-base outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400 ${focusRing}`;
const textareaClass = `${inputClass} min-h-40 resize-y leading-relaxed`;
const cardClass =
  "border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151515] xl:p-6";
const shellClass =
  "mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]";
const btn =
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium transition-[border-color,opacity] hover:border-neutral-400 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`;
const btnPrimary =
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900 ${focusRing}`;

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
    return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (s.includes("envi"))
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (s.includes("recus") || s.includes("cancel"))
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
}

function statusChipClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("aprov"))
    return "border-emerald-500/35 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300";
  if (s.includes("envi"))
    return "border-amber-500/40 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300";
  if (s.includes("recus") || s.includes("cancel"))
    return "border-red-500/35 text-red-700 hover:bg-red-500/10 dark:text-red-300";
  return "border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800";
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
      <span className="text-sm font-medium tracking-tight text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      {hint ? (
        <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
          {hint}
        </span>
      ) : null}
      <div className="mt-2.5">{children}</div>
    </label>
  );
}

const navIcons: Record<Tab, string[]> = {
  dashboard: ["M3 12l9-9 9 9", "M5 10v10h14V10"],
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
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrcamentoProposal | null>(null);
  const [clientForm, setClientForm] = useState<OrcamentoClient | null>(null);
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
    const totalValue = proposals.reduce((s, p) => s + Number(p.total || 0), 0);
    const approvedValue = approved.reduce(
      (s, p) => s + Number(p.total || 0),
      0,
    );
    return {
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

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  };

  const reload = async () => {
    const data = await orcamentosApi.data();
    onRefresh(data);
    setProfileForm(data.profile);
  };

  const go = (next: Tab) => {
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

  const nav: { id: Tab; label: string; short: string }[] = [
    { id: "dashboard", label: "Visão geral", short: "Início" },
    { id: "clients", label: "Clientes", short: "Clientes" },
    { id: "proposals", label: "Orçamentos", short: "Orçam." },
    { id: "presets", label: "Presets", short: "Presets" },
    { id: "profile", label: "Meus dados", short: "Dados" },
    { id: "settings", label: "Backup / seed", short: "Backup" },
  ];

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

  const PresetSelect = ({
    section,
    label = "Usar preset",
  }: {
    section: PresetSection;
    label?: string;
  }) => {
    const list = presetsFor(section);
    if (!list.length) return null;
    return (
      <select
        className={`${inputClass} max-w-md`}
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          e.target.value = "";
          const preset = list.find((p) => p.id === id);
          if (preset) applyPreset(preset);
        }}
        aria-label={label}
      >
        <option value="">{label}…</option>
        {list.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

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
          ? "flex flex-col gap-3 border-b border-neutral-200 py-4 last:border-b-0 last:pb-0 first:pt-0 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between"
          : "flex flex-col gap-3 border border-neutral-200 bg-white p-4 transition-[border-color] hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#151515] dark:hover:border-neutral-600 sm:flex-row sm:items-center sm:justify-between"
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
          <p className="min-w-0 truncate text-xs text-neutral-500 dark:text-neutral-400">
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
            className={`${btn} text-red-600 dark:text-red-400`}
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
    <div className="min-h-dvh bg-[#f9f9f9] text-neutral-900 dark:bg-[#121212] dark:text-[#f9f9f9] [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_summary]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=radio]]:cursor-pointer [&_[role=button]]:cursor-pointer">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#F3F4F6] dark:border-neutral-800 dark:bg-[#151515]">
        <div className={`${shellClass} flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 xl:px-8 2xl:px-10`}>
          <Link to="/" className="flex cursor-pointer items-center gap-2 sm:gap-2.5">
            <TrafficLights />
            <span className="ml-1 font-bold sm:ml-2">.dev Bossle</span>
            <span className="hidden text-sm font-light text-neutral-500 sm:inline dark:text-neutral-400">
              / orçamentos
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-xs text-neutral-500 sm:inline xl:max-w-[280px] dark:text-neutral-400">
              {username}
            </span>
            <button
              type="button"
              onClick={toggleDark}
              aria-label="Alternar tema"
              className={`rounded-sm p-1 ${focusRing}`}
            >
              <img
                src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
                className="w-5 cursor-pointer sm:w-6"
                alt=""
                width={24}
                height={24}
              />
            </button>
            <button
              type="button"
              className={`${btnPrimary} hidden sm:inline-flex`}
              onClick={() => openProposal(blankProposal())}
            >
              + Novo
            </button>
          </div>
        </div>
      </header>

      <div className={`${shellClass} grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] xl:grid-cols-[260px_1fr] 2xl:grid-cols-[280px_1fr]`}>
        <aside className="hidden border-r border-neutral-200 py-6 pr-4 md:sticky md:top-[65px] md:flex md:h-[calc(100dvh-65px)] md:flex-col md:pl-6 xl:pr-5 xl:pl-8 2xl:pl-10 dark:border-neutral-800">
          <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
            Menu
          </p>
          <nav className="mt-3 flex flex-1 flex-col gap-0.5">
            {nav.map((item) => {
              const active = tab === item.id && !editing;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`flex items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm transition-colors xl:py-3 ${focusRing} ${
                    active
                      ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800/80 dark:text-white"
                      : "font-light text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <Icon paths={navIcons[item.id]} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button type="button" onClick={onLogout} className={`${btn} mt-4 w-full`}>
            Sair
          </button>
        </aside>

        <main className="min-w-0 px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-10 lg:px-8 xl:px-10 xl:py-10 2xl:px-12 2xl:py-12">
          {editing ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest opacity-60">
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
                      className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-medium transition-colors ${focusRing} ${
                        active
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-[#f9f9f9] dark:bg-[#f9f9f9] dark:text-neutral-900"
                          : done
                            ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-[#151515] dark:text-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                          active
                            ? "bg-white/20"
                            : done
                              ? "bg-emerald-600 text-white"
                              : "bg-neutral-100 dark:bg-neutral-800"
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
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      Cliente, nome e condições básicas do orçamento.
                    </p>
                  </div>
                  <Field label="Cliente" full>
                    <select
                      className={inputClass}
                      value={editing.clientId}
                      onChange={(e) =>
                        setEditing({ ...editing, clientId: e.target.value })
                      }
                    >
                      <option value="">Selecionar…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.company ? ` — ${c.company}` : ""}
                        </option>
                      ))}
                    </select>
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
                  </Field>
                  <Field label="Status" full>
                    <select
                      className={inputClass}
                      value={editing.status}
                      onChange={(e) =>
                        setEditing({ ...editing, status: e.target.value })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        Textos que aparecem no PDF e na página do cliente.
                      </p>
                    </div>
                    <PresetSelect section="timeline" label="Preset de etapas" />
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
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
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
                        className="grid gap-3 border border-neutral-200 bg-[#f9f9f9] p-4 dark:border-neutral-700 dark:bg-[#121212] sm:grid-cols-[1fr_1fr_140px]"
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
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 font-semibold dark:border-neutral-800">
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
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-500 dark:text-neutral-400">
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
                      <span className="text-sm font-medium tracking-tight text-neutral-700 dark:text-neutral-300">
                        Forma de pagamento
                      </span>
                      <PresetSelect
                        section="payment"
                        label="Preset de pagamento"
                      />
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
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      Materiais necessários e observações da proposta.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium tracking-tight text-neutral-700 dark:text-neutral-300">
                        O que preciso do cliente
                      </span>
                      <PresetSelect section="needs" label="Preset" />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
                      <span className="text-sm font-medium tracking-tight text-neutral-700 dark:text-neutral-300">
                        Observações
                      </span>
                      <PresetSelect section="notes" label="Preset" />
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
                  <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
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
                      <div className="space-y-3 border border-neutral-200 bg-[#f9f9f9] p-3 dark:border-neutral-700 dark:bg-[#121212]">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
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
                            <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                              Senha (só aparece agora)
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <code className="text-base font-semibold tracking-wider">
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
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
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

                    <div className="space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                        Enviar ao cliente
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      Thread com o cliente na página da proposta.
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {comments.length === 0 ? (
                      <li className="text-sm text-neutral-500 dark:text-neutral-400">
                        Nenhum comentário ainda.
                      </li>
                    ) : (
                      comments.map((c) => (
                        <li
                          key={c.id}
                          className="border border-neutral-200 bg-[#f9f9f9] px-4 py-3 text-base dark:border-neutral-700 dark:bg-[#121212]"
                        >
                          <div className="mb-1 flex justify-between gap-2 text-xs font-medium uppercase tracking-wide opacity-60">
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

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
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
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
                  <p className="text-sm font-medium capitalize text-neutral-500 dark:text-neutral-400">
                    {today}
                  </p>
                  <h1
                    id="dashboard-title"
                    className="mt-1 text-pretty text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl"
                  >
                    Painel de orçamentos
                  </h1>
                  <p className="mt-2 max-w-xl text-sm text-neutral-500 xl:max-w-2xl dark:text-neutral-400">
                    Acompanhe clientes, propostas e valores do pipeline.
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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4 2xl:gap-5">
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
                    value: String(proposals.length),
                    hint:
                      proposals.length === 0
                        ? "nenhum no pipeline"
                        : stats.draft === proposals.length
                          ? "todos em elaboração"
                          : stats.draft === 0
                            ? "nenhum em elaboração"
                            : `${stats.draft} em elaboração`,
                  },
                  {
                    label: "Valor orçado",
                    value: money(stats.totalValue),
                    hint: "soma de todas as propostas",
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
                    className={`${cardClass} flex min-h-[116px] flex-col xl:min-h-[132px]`}
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
                      {stat.label}
                    </p>
                    <p
                      className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums xl:text-3xl ${
                        stat.accent
                          ? "text-emerald-700 dark:text-emerald-400"
                          : ""
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-auto pt-2 text-xs leading-snug text-neutral-500 dark:text-neutral-400">
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

              <div className={cardClass}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold tracking-tight">
                    Últimos orçamentos
                  </h2>
                  {proposals.length > 0 ? (
                    <button
                      type="button"
                      className={`shrink-0 text-sm font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 transition-opacity hover:opacity-80 dark:text-emerald-300 dark:decoration-emerald-300/30 ${focusRing} rounded-sm`}
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
                  <div className="mt-4 border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
                    <p className="font-medium">Nenhum orçamento ainda</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
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

          {!editing && tab === "clients" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest opacity-60">
                    Cadastro
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Clientes
                  </h1>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {clients.length} cadastrado
                    {clients.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() =>
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
                    })
                  }
                >
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

              <div className="space-y-2">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#151515]"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {c.name}
                        {c.company ? (
                          <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
                            {" "}
                            · {c.company}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {[c.phone ? maskPhoneBr(c.phone) : "", c.email]
                          .filter(Boolean)
                          .join(" · ") || "Sem contato"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => openProposal(blankProposal(c.id))}
                      >
                        Novo orçamento
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => setClientForm(c)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${btn} text-red-600 dark:text-red-400`}
                        onClick={async () => {
                          if (!window.confirm("Excluir cliente?")) return;
                          await orcamentosApi.deleteClient(c.id);
                          await reload();
                          showToast("Cliente excluído");
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
                {!clients.length ? (
                  <div className="border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                    Nenhum cliente. Cadastre o primeiro para emitir propostas.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!editing && tab === "proposals" ? (
            <section>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-widest opacity-60">
                    Histórico
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Orçamentos
                  </h1>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => openProposal(blankProposal())}
                >
                  + Novo
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter("todos")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === "todos"
                      ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
                      : "border border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
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
                        : "border border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
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
                  <div className="border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
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
                  <p className="text-sm font-medium uppercase tracking-widest opacity-60">
                    Biblioteca
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Presets de texto
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">
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
                      ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
                      : "border border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
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
                          ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
                          : "border border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
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
                      <select
                        className={inputClass}
                        value={presetForm.section}
                        onChange={(e) =>
                          setPresetForm({
                            ...presetForm,
                            section: e.target.value as PresetSection,
                          })
                        }
                      >
                        {PRESET_SECTIONS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
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
                      className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#151515]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                            {sectionLabel}
                          </p>
                          <h3 className="mt-1 text-base font-semibold tracking-tight">
                            {p.name}
                          </h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
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
                            className={`${btn} text-red-600 dark:text-red-400`}
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
                  <div className="border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
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
                  <p className="text-sm font-medium uppercase tracking-widest opacity-60">
                    Perfil
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Meus dados
                  </h1>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
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
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                  Envia um link de redefinição para{" "}
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
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
              <p className="text-sm font-medium uppercase tracking-widest opacity-60">
                Dados
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                Backup / seed
              </h1>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                Importe o JSON inicial para o Neon.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <h3 className="font-semibold">Mesclar seed</h3>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
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
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Apaga clientes e propostas atuais e carrega só o seed.
                  </p>
                  <button
                    type="button"
                    className={`${btn} mt-4 text-red-600 dark:text-red-400`}
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
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-[#F3F4F6]/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur dark:border-neutral-800 dark:bg-[#151515]/95 md:hidden">
          {nav
            .filter((n) => n.id !== "settings")
            .map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id)}
                  className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium ${focusRing} ${
                    active
                      ? "text-neutral-900 dark:text-white"
                      : "text-neutral-400"
                  }`}
                >
                  <Icon paths={navIcons[item.id]} />
                  {item.short}
                </button>
              );
            })}
          <button
            type="button"
            onClick={onLogout}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium text-neutral-400 ${focusRing}`}
          >
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            Sair
          </button>
        </nav>
      ) : null}

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-[#f9f9f9] dark:text-neutral-900 md:bottom-6"
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
