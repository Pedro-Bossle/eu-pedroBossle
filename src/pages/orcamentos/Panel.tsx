import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";
import {
  downloadProposalPdf,
  proposalPdfFilename,
} from "./downloadProposalPdf";
import { money, uid } from "./money";
import ProposalPdfDocument from "./ProposalPdfDocument";

type Tab = "dashboard" | "clients" | "proposals" | "profile" | "settings";

type Props = {
  username: string;
  clients: OrcamentoClient[];
  proposals: OrcamentoProposal[];
  profile: OrcamentoProfile;
  onLogout: () => void;
  onRefresh: (data: {
    clients: OrcamentoClient[];
    proposals: OrcamentoProposal[];
    profile: OrcamentoProfile;
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

const inputClass =
  "w-full border border-neutral-200 bg-[#f9f9f9] px-3 py-2.5 text-sm outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400";
const cardClass =
  "border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151515]";
const btn =
  "inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-medium transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-neutral-900 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900";

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
  profile,
  onLogout,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrcamentoProposal | null>(null);
  const [clientForm, setClientForm] = useState<OrcamentoClient | null>(null);
  const [profileForm, setProfileForm] = useState(profile);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark"),
  );
  const [pdfSource, setPdfSource] = useState<OrcamentoProposal | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Orçamentos · .dev Bossle";
  }, []);

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
    setClientForm(null);
    setTab(next);
  };

  const exportPdf = (proposal: OrcamentoProposal) => {
    if (pdfBusy) return;
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
    { id: "profile", label: "Meus dados", short: "Dados" },
    { id: "settings", label: "Backup / seed", short: "Backup" },
  ];

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const Field = ({
    label,
    children,
    full,
  }: {
    label: string;
    children: ReactNode;
    full?: boolean;
  }) => (
    <label
      className={`block ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );

  const ProposalRow = ({
    p,
    compact,
  }: {
    p: OrcamentoProposal;
    compact?: boolean;
  }) => (
    <article className="flex flex-wrap items-center justify-between gap-3 border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#151515] dark:hover:border-neutral-600">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-medium tracking-tight">
            {p.company || "Projeto sem nome"}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass(p.status)}`}
          >
            {p.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {clientName(p.clientId)}
          {compact ? null : ` · v${p.version}`}
          {" · "}
          {new Date(p.created).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold tabular-nums tracking-tight">
          {money(p.total)}
        </p>
        <button
          type="button"
          className={btn}
          onClick={() => setEditing({ ...p })}
        >
          Abrir
        </button>
        <button
          type="button"
          className={btn}
          disabled={pdfBusy}
          onClick={() => exportPdf(p)}
        >
          {pdfBusy && pdfSource?.id === p.id ? "PDF…" : "PDF"}
        </button>
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
    <div className="min-h-dvh bg-[#f9f9f9] text-neutral-900 dark:bg-[#121212] dark:text-[#f9f9f9]">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[#F3F4F6] dark:border-neutral-800 dark:bg-[#151515]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5">
            <TrafficLights />
            <span className="ml-1 font-bold sm:ml-2">.dev Bossle</span>
            <span className="hidden text-sm font-light text-neutral-500 sm:inline dark:text-neutral-400">
              / orçamentos
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-xs text-neutral-500 sm:inline dark:text-neutral-400">
              {username}
            </span>
            <button type="button" onClick={toggleDark} aria-label="Alternar tema">
              <img
                src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
                className="w-5 cursor-pointer sm:w-6"
                alt=""
              />
            </button>
            <button
              type="button"
              className={`${btnPrimary} hidden sm:inline-flex`}
              onClick={() => setEditing(blankProposal())}
            >
              + Novo
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-neutral-200 py-6 pr-4 md:sticky md:top-[65px] md:flex md:h-[calc(100dvh-65px)] md:flex-col md:pl-6 dark:border-neutral-800">
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
                  className={`flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? "font-medium text-neutral-900 dark:text-white"
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

        <main className="min-w-0 px-4 py-6 pb-24 sm:px-6 md:py-8 md:pb-10 lg:px-8">
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
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={pdfBusy}
                    onClick={() => exportPdf(editing)}
                  >
                    {pdfBusy ? "Gerando PDF…" : "Baixar PDF"}
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy}
                    onClick={saveProposal}
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
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
                <Field label="Ideia" full>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={editing.idea}
                    onChange={(e) =>
                      setEditing({ ...editing, idea: e.target.value })
                    }
                  />
                </Field>
                <Field label="Escopo (uma linha por item)" full>
                  <textarea
                    className={`${inputClass} min-h-28`}
                    value={editing.scope}
                    onChange={(e) =>
                      setEditing({ ...editing, scope: e.target.value })
                    }
                  />
                </Field>
                <Field label="Etapas e prazos" full>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={editing.timeline}
                    onChange={(e) =>
                      setEditing({ ...editing, timeline: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className={cardClass}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold tracking-tight">Itens</h2>
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
                <div className="space-y-3">
                  {editing.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-2 border border-neutral-200 bg-[#f9f9f9] p-3 dark:border-neutral-700 dark:bg-[#121212] sm:grid-cols-[1fr_1fr_120px]"
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
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4 font-semibold dark:border-neutral-800">
                  <span>Total</span>
                  <input
                    type="number"
                    className={`${inputClass} max-w-[200px] text-right text-lg font-semibold`}
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
                <label className="mt-3 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
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
                    className="size-4 accent-emerald-600"
                  />
                  Total manual (não recalcular pelos itens)
                </label>
              </div>

              <div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
                <Field label="Pagamento" full>
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={editing.payment}
                    onChange={(e) =>
                      setEditing({ ...editing, payment: e.target.value })
                    }
                  />
                </Field>
                <Field label="O que preciso do cliente">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={editing.needs}
                    onChange={(e) =>
                      setEditing({ ...editing, needs: e.target.value })
                    }
                  />
                </Field>
                <Field label="Observações">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={editing.notes}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </Field>
                <Field label="Status">
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
            </section>
          ) : null}

          {!editing && tab === "dashboard" ? (
            <section className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-medium capitalize opacity-60">
                    {today}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Painel de orçamentos
                  </h1>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    Pipeline de propostas · Neon · sessão autenticada
                  </p>
                </div>
                <button
                  type="button"
                  className={`${btnPrimary} sm:hidden`}
                  onClick={() => setEditing(blankProposal())}
                >
                  + Novo orçamento
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Clientes",
                    value: String(clients.length),
                    hint: "cadastrados",
                  },
                  {
                    label: "Orçamentos",
                    value: String(proposals.length),
                    hint: `${stats.draft} em elaboração`,
                  },
                  {
                    label: "Valor orçado",
                    value: money(stats.totalValue),
                    hint: "soma de todas as propostas",
                  },
                  {
                    label: "Aprovado",
                    value: money(stats.approvedValue),
                    hint: `${stats.approved} proposta${stats.approved === 1 ? "" : "s"}`,
                    accent: true,
                  },
                ].map((stat) => (
                  <div key={stat.label} className={cardClass}>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                      {stat.label}
                    </p>
                    <p
                      className={`mt-2 text-2xl font-semibold tracking-tight tabular-nums ${
                        stat.accent
                          ? "text-emerald-700 dark:text-emerald-400"
                          : ""
                      }`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {stat.hint}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
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
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${statusClass(chip.label)}`}
                  >
                    {chip.label} · {chip.n}
                  </button>
                ))}
              </div>

              <div className={cardClass}>
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold tracking-tight">
                    Últimos orçamentos
                  </h2>
                  {proposals.length > 0 ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300 dark:decoration-emerald-300/30"
                      onClick={() => go("proposals")}
                    >
                      Ver todos
                    </button>
                  ) : null}
                </div>

                {recent.length ? (
                  <div className="space-y-2">
                    {recent.map((p) => (
                      <ProposalRow key={p.id} p={p} compact />
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
                    <p className="font-medium">Nenhum orçamento ainda</p>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      Crie o primeiro ou importe o seed em Backup.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => setEditing(blankProposal())}
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
                      ["phone", "Telefone"],
                      ["email", "E-mail"],
                      ["link", "Site / Instagram"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        className={inputClass}
                        value={clientForm[key]}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            [key]: e.target.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                  <Field label="Observações" full>
                    <textarea
                      className={`${inputClass} min-h-20`}
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
                        {[c.phone, c.email].filter(Boolean).join(" · ") ||
                          "Sem contato"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => setEditing(blankProposal(c.id))}
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
                  onClick={() => setEditing(blankProposal())}
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
                      onRefresh({ clients, proposals, profile: next });
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
                      value={profileForm[key]}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </Field>
                ))}
                <Field label="Bio" full>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                  />
                </Field>
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
                  className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium ${
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
            className="flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium text-neutral-400"
          >
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            Sair
          </button>
        </nav>
      ) : null}

      {toast ? (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-[#f9f9f9] dark:text-neutral-900 md:bottom-6">
          {toast}
        </div>
      ) : null}

      {pdfSource ? (
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] bg-white"
        >
          <div ref={pdfRef}>
            <ProposalPdfDocument
              proposal={pdfSource}
              client={clients.find((c) => c.id === pdfSource.clientId)}
              profile={profile}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Panel;
