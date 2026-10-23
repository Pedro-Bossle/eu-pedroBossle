import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import InstagramIcon from "../../components/icons/InstagramIcon";
import WhatsAppIcon from "../../components/icons/WhatsAppIcon";
import { orcamentosApi } from "../../lib/orcamentos/api";
import {
  DEFAULT_CITY,
  SITE_STATUS_LABEL,
  buildMessage,
  contactInfo,
  downloadText,
  leadStatus,
  messageFor,
  parseProspectText,
  plain,
  prospectsToCsv,
  siteStatus,
  whatsappUrl,
  type LeadStatus,
  type SiteStatus,
} from "../../lib/orcamentos/prospects";
import type {
  GeminiCheck,
  ProspectInput,
  ProspectLead,
  ProspectSettings,
} from "../../types/orcamentos";
import { btn, btnPrimary, cardClass, focusRing } from "./panelStyles";

type Props = {
  /** Primeiro nome usado na mensagem ("Sou o Pedro, da Dev Bossle…"). */
  senderName: string;
  showToast: (msg: string) => void;
};

// Classes próprias (sem sobrescrever utilitários das classes base do painel)
const control = `border border-neutral-200 bg-[#f9f9f9] outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400 ${focusRing}`;
const inputClass = `${control} w-full min-h-12 px-4 py-3 text-base`;
const selectClass = `${control} min-h-11 px-3 py-2 text-base sm:text-sm`;
const area = (minH: string) => `${control} w-full ${minH} resize-y px-4 py-3 text-base leading-relaxed`;
const btnSm = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-medium transition-[border-color,opacity] hover:border-neutral-400 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`;
const btnDisabled = "inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-400 dark:border-neutral-700 dark:text-neutral-500";
const btnSearch = `inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900 ${focusRing}`;

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition ${focusRing} ${
    active
      ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
      : "border border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-white"
  }`;

const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

const siteBadge: Record<SiteStatus, string> = {
  sem: "bg-red-500/10 text-red-700 dark:text-red-300",
  problemas: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  ok: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

const linkClass =
  "text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300 dark:decoration-emerald-300/30";

const btnWhatsApp = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-emerald-500 dark:text-neutral-950 ${focusRing}`;

const smallLabel = "text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400";

const emptyLead = (city: string, niche: string): ProspectInput => ({
  name: "",
  niche,
  city: city || DEFAULT_CITY,
  address: "",
  neighborhood: "",
  website: "",
  email: "",
  whatsapp: "",
  phone: "",
  instagram: "",
  problems: "",
  pitch: "",
  message: "",
});

async function copyText(text: string, fallback?: HTMLTextAreaElement | null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!fallback) return false;
    fallback.focus();
    fallback.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

function Labeled({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium tracking-tight text-neutral-700 dark:text-neutral-300">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

// ---------- Formulário (novo / editar) ----------

function LeadForm({
  initial,
  onCancel,
  onSaved,
  showToast,
}: {
  initial: ProspectInput;
  onCancel: () => void;
  onSaved: (lead: ProspectLead) => void;
  showToast: (msg: string) => void;
}) {
  const [form, setForm] = useState<ProspectInput>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ProspectInput) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = (k: keyof ProspectInput, placeholder = "", type = "text") => (
    <input
      className={inputClass}
      type={type}
      value={String(form[k] ?? "")}
      onChange={set(k)}
      placeholder={placeholder}
    />
  );

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!String(form.name ?? "").trim()) {
          showToast("Informe o nome do negócio");
          return;
        }
        setBusy(true);
        try {
          const { lead } = await orcamentosApi.saveProspect(form);
          onSaved(lead);
          showToast("Lead salvo");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Nome do negócio">{input("name", "Ex.: Mecânica Zanella")}</Labeled>
        <Labeled label="Nicho">{input("niche", "Ex.: oficina mecânica")}</Labeled>
        <Labeled label="Cidade">{input("city")}</Labeled>
        <Labeled label="Bairro">{input("neighborhood")}</Labeled>
        <Labeled label="Endereço" full>{input("address", "Rua e número")}</Labeled>
        <Labeled label="Site" full>{input("website", "Vazio = sem site")}</Labeled>
        <Labeled label="WhatsApp">{input("whatsapp", "(54) 99999-0000", "tel")}</Labeled>
        <Labeled label="Telefone fixo">{input("phone", "(54) 3000-0000", "tel")}</Labeled>
        <Labeled label="E-mail">{input("email", "", "email")}</Labeled>
        <Labeled label="Instagram">{input("instagram", "@perfil")}</Labeled>
        <Labeled label="Problemas encontrados (separe com ;)" full>
          <textarea
            className={area("min-h-24")}
            value={form.problems ?? ""}
            onChange={set("problems")}
            placeholder="Ex.: não abre direito no celular; sem botão de WhatsApp"
          />
        </Labeled>
        <Labeled label="Argumento" full>
          <textarea
            className={area("min-h-24")}
            value={form.pitch ?? ""}
            onChange={set("pitch")}
          />
        </Labeled>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Salvando…" : "Salvar lead"}
        </button>
      </div>
    </form>
  );
}

// ---------- Card ----------

function LeadCard({
  lead,
  senderName,
  onChange,
  onEdit,
  onDelete,
  showToast,
}: {
  lead: ProspectLead;
  senderName: string;
  onChange: (lead: ProspectLead) => void;
  onEdit: () => void;
  onDelete: () => void;
  showToast: (msg: string) => void;
}) {
  const status = siteStatus(lead);
  const { best, onlyLandline } = contactInfo(lead);
  const generated = buildMessage(lead, senderName);
  const [draft, setDraft] = useState(messageFor(lead, senderName));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const edited = Boolean(lead.message.trim());

  // Mantém o texto em dia quando o lead muda (sem atropelar quem está digitando)
  useEffect(() => {
    if (document.activeElement !== msgRef.current) setDraft(messageFor(lead, senderName));
  }, [lead, senderName]);

  const patch = async (p: { sent?: boolean; replied?: boolean; message?: string }) => {
    const optimistic: ProspectLead = {
      ...lead,
      ...p,
      sentAt: p.sent === undefined ? lead.sentAt : p.sent ? lead.sentAt ?? new Date().toISOString() : null,
      repliedAt:
        p.replied === undefined ? lead.repliedAt : p.replied ? lead.repliedAt ?? new Date().toISOString() : null,
    };
    onChange(optimistic);
    try {
      const { lead: saved } = await orcamentosApi.patchProspect(lead.id, p);
      onChange(saved);
    } catch (e) {
      onChange(lead);
      showToast(e instanceof Error ? e.message : "Não foi possível salvar");
    }
  };

  const saveMessage = () => {
    const value = draft.trim() === generated.trim() ? "" : draft;
    if (value !== lead.message) void patch({ message: value });
  };

  const address = [lead.address, lead.neighborhood].filter(Boolean).join(" – ");
  const phones = [lead.whatsapp, lead.phone].filter((p, i, all) => p.trim() && all.indexOf(p) === i);

  const row = (label: string, value: ReactNode, muted = false) => (
    <>
      <dt className="pt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className={`min-w-0 break-words ${muted ? "text-neutral-400 dark:text-neutral-500" : ""}`}>{value}</dd>
    </>
  );

  return (
    <article
      className={`flex min-w-0 flex-col gap-4 border p-4 sm:p-5 ${
        lead.replied
          ? "border-emerald-600/40 bg-emerald-500/5 dark:border-emerald-400/30"
          : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151515]"
      }`}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${badge} ${siteBadge[status]}`}>{SITE_STATUS_LABEL[status]}</span>
          {lead.replied ? (
            <span className={`${badge} bg-emerald-500/15 text-emerald-800 dark:text-emerald-300`}>Respondeu</span>
          ) : lead.sent ? (
            <span className={`${badge} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`}>
              Enviado {fmtDate(lead.sentAt)}
            </span>
          ) : null}
          {lead.source === "gemini" ? (
            <span className={`${badge} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>Gemini</span>
          ) : null}
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight break-words">{lead.name}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {[lead.niche, lead.city].filter(Boolean).join(" · ")}
        </p>
      </header>

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-sm">
        {row("Endereço", address || "Não informado", !address)}
        {row(
          "Site",
          lead.website ? (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            "sem site"
          ),
          !lead.website,
        )}
        {row(
          "E-mail",
          lead.email ? (
            <a href={`mailto:${lead.email}`} className={linkClass}>
              {lead.email}
            </a>
          ) : (
            "Não informado"
          ),
          !lead.email,
        )}
        {row(
          "WhatsApp / tel.",
          phones.length ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {phones.map((p) => (
                <span key={p} className="font-mono text-[13px] select-all">
                  {p}
                </span>
              ))}
              {onlyLandline ? (
                <span className={`${badge} bg-amber-500/10 text-amber-800 dark:text-amber-300`}>Só fixo</span>
              ) : null}
            </span>
          ) : (
            "Não informado"
          ),
          !phones.length,
        )}
        {row(
          "Instagram",
          lead.instagram ? (
            <a
              href={`https://www.instagram.com/${lead.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} inline-flex items-center gap-1`}
            >
              <InstagramIcon className="size-3.5" />@{lead.instagram}
            </a>
          ) : (
            "Não informado"
          ),
          !lead.instagram,
        )}
        {row("Situação", SITE_STATUS_LABEL[status])}
      </dl>

      <div className="space-y-1">
        <p className={smallLabel}>Problemas encontrados</p>
        <p className={`text-sm leading-relaxed whitespace-pre-line ${lead.problems ? "" : "text-neutral-400 dark:text-neutral-500"}`}>
          {lead.problems || (lead.website ? "Nenhum anotado" : "Não tem site")}
        </p>
      </div>
      <div className="space-y-1">
        <p className={smallLabel}>Argumento</p>
        <p className={`text-sm leading-relaxed whitespace-pre-line ${lead.pitch ? "" : "text-neutral-400 dark:text-neutral-500"}`}>
          {lead.pitch || "Nenhum anotado"}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`msg-${lead.id}`} className={smallLabel}>
            Mensagem pronta
          </label>
          {edited ? (
            <button
              type="button"
              className={`text-xs font-medium ${linkClass} ${focusRing}`}
              onClick={() => {
                setDraft(generated);
                void patch({ message: "" });
              }}
            >
              Gerar de novo
            </button>
          ) : null}
        </div>
        <textarea
          id={`msg-${lead.id}`}
          ref={msgRef}
          className={`${area("min-h-52 sm:min-h-44")} border-l-2 border-l-emerald-600 dark:border-l-emerald-400`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveMessage}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {best ? (
          <a
            href={whatsappUrl(best.wa, draft)}
            target="_blank"
            rel="noopener noreferrer"
            className={btnWhatsApp}
            onClick={() => {
              saveMessage();
              if (!lead.sent) {
                void patch({ sent: true });
                showToast("Marcado como Enviado");
              }
            }}
          >
            <WhatsAppIcon className="size-4" />
            Chamar no WhatsApp
          </a>
        ) : (
          <span className={btnDisabled} aria-disabled="true">
            <WhatsAppIcon className="size-4" />
            Sem número válido
          </span>
        )}
        <button
          type="button"
          className={btn}
          onClick={async () => {
            const ok = await copyText(draft, msgRef.current);
            showToast(ok ? "Mensagem copiada" : "Selecione o texto e copie");
          }}
        >
          Copiar mensagem
        </button>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-5 accent-emerald-700 dark:accent-emerald-400"
            checked={lead.sent}
            onChange={(e) => void patch({ sent: e.target.checked })}
          />
          Enviado
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-5 accent-emerald-700 dark:accent-emerald-400"
            checked={lead.replied}
            onChange={(e) =>
              void patch(e.target.checked && !lead.sent ? { replied: true, sent: true } : { replied: e.target.checked })
            }
          />
          Respondeu
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {lead.mapsUrl ? (
            <a
              href={lead.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs whitespace-nowrap text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
              style={{ fontFamily: "Roboto, Arial, sans-serif" }}
            >
              Google Maps
            </a>
          ) : null}
          <button type="button" className={btnSm} onClick={onEdit}>
            Editar
          </button>
          {confirmDelete ? (
            <>
              <button
                type="button"
                className={`${btnSm} text-red-600 dark:text-red-400`}
                onClick={onDelete}
              >
                Confirmar
              </button>
              <button type="button" className={btnSm} onClick={() => setConfirmDelete(false)}>
                Não
              </button>
            </>
          ) : (
            <button type="button" className={btnSm} onClick={() => setConfirmDelete(true)}>
              Excluir
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

// ---------- Tela ----------

function Prospects({ senderName, showToast }: Props) {
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState<ProspectSettings | null>(null);

  const [niche, setNiche] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [limit, setLimit] = useState(10);
  const [searching, setSearching] = useState(false);
  const [searchInfo, setSearchInfo] = useState("");

  const [siteFilter, setSiteFilter] = useState<"todos" | SiteStatus>("todos");
  const [nicheFilter, setNicheFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | LeadStatus>("");

  const [panel, setPanel] = useState<"" | "gemini" | "import">("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<GeminiCheck | null>(null);

  const runCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const { check } = await orcamentosApi.testGemini();
      setCheckResult(check);
    } catch (e) {
      setCheckResult({
        key: { ok: false, message: e instanceof Error ? e.message : "Falha ao testar" },
        grounding: null,
      });
    } finally {
      setChecking(false);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState<ProspectInput | null>(null);

  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, cfg] = await Promise.all([
          orcamentosApi.listProspects(),
          orcamentosApi.prospectSettings(),
        ]);
        if (cancelled) return;
        setLeads(list.leads);
        setSettings(cfg.settings);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Falha ao carregar os leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceLead = (lead: ProspectLead) =>
    setLeads((prev) => {
      const i = prev.findIndex((l) => l.id === lead.id);
      if (i < 0) return [lead, ...prev];
      const next = prev.slice();
      next[i] = lead;
      return next;
    });

  const mergeLeads = (incoming: ProspectLead[]) =>
    setLeads((prev) => {
      const map = new Map(prev.map((l) => [l.id, l]));
      for (const l of incoming) map.set(l.id, l);
      return [...map.values()].sort((a, b) => b.created.localeCompare(a.created));
    });

  // Busca (nicho + cidade) também filtra a lista
  const base = useMemo(() => {
    const n = plain(niche);
    const c = plain(city);
    return leads.filter(
      (l) =>
        (!n || plain(`${l.niche} ${l.name}`).includes(n)) &&
        (!c || plain(l.city).includes(c)),
    );
  }, [leads, niche, city]);

  const niches = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of leads) if (l.niche.trim()) map.set(plain(l.niche), l.niche.trim());
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt"));
  }, [leads]);

  const visible = useMemo(() => {
    const rank = { pendente: 0, enviado: 1, respondeu: 2 } as const;
    return base
      .filter((l) => siteFilter === "todos" || siteStatus(l) === siteFilter)
      .filter((l) => !nicheFilter || plain(l.niche) === nicheFilter)
      .filter((l) => !statusFilter || leadStatus(l) === statusFilter)
      .sort(
        (a, b) =>
          rank[leadStatus(a)] - rank[leadStatus(b)] ||
          b.created.localeCompare(a.created),
      );
  }, [base, siteFilter, nicheFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      todos: base.length,
      sem: base.filter((l) => siteStatus(l) === "sem").length,
      problemas: base.filter((l) => siteStatus(l) === "problemas").length,
    }),
    [base],
  );

  const runSearch = async () => {
    if (niche.trim().length < 3 || city.trim().length < 3) {
      showToast("Preencha o nicho e a cidade");
      return;
    }
    if (!settings?.configured) {
      setPanel("gemini");
      showToast("Defina GEMINI_API_KEY no ambiente do servidor");
      return;
    }
    setSearching(true);
    setSearchInfo("");
    try {
      const r = await orcamentosApi.searchProspects({ niche: niche.trim(), city: city.trim(), limit });
      mergeLeads(r.leads);
      setSiteFilter("todos");
      setStatusFilter("");
      setNicheFilter("");
      setSearchInfo(
        r.leads.length
          ? `${r.added} novo(s) e ${r.updated} atualizado(s) para “${niche.trim()}” em ${city.trim()} (modelo ${r.model}). Confira os telefones antes de chamar.`
          : "O Gemini não encontrou negócios novos para essa busca. Tente outro nicho ou bairro.",
      );
    } catch (e) {
      setSearchInfo(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setSearching(false);
    }
  };

  const runImport = async (text: string) => {
    setImportMsg("");
    if (!text.trim()) {
      setImportMsg("Cole uma lista ou escolha um arquivo.");
      return;
    }
    let parsed: ReturnType<typeof parseProspectText>;
    try {
      parsed = parseProspectText(text);
    } catch {
      setImportMsg("Não consegui ler a lista. Confira se é um JSON válido ou um CSV com cabeçalho na primeira linha.");
      return;
    }
    if (!parsed.leads.length) {
      setImportMsg("Nenhum lead com nome encontrado. O CSV precisa de cabeçalho (ex.: nome, nicho, whatsapp).");
      return;
    }
    setImportBusy(true);
    try {
      const r = await orcamentosApi.importProspects(parsed.leads);
      setLeads(r.leads);
      setImportText("");
      setImportMsg(
        `${r.added} novo(s), ${r.updated} atualizado(s)` +
          (parsed.skipped + r.skipped ? `, ${parsed.skipped + r.skipped} ignorado(s) sem nome.` : "."),
      );
      showToast("Lista importada");
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setImportBusy(false);
    }
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const mapsSearch = `https://www.google.com/maps/search/${encodeURIComponent(`${niche || "empresas"} ${city || DEFAULT_CITY}`)}`;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">Vendas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Prospecção</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Negócios locais para oferecer site, com mensagem pronta para o WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => setPanel(panel === "import" ? "" : "import")}
            aria-expanded={panel === "import"}
          >
            Importar / exportar
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => setPanel(panel === "gemini" ? "" : "gemini")}
            aria-expanded={panel === "gemini"}
          >
            Gemini
            <span
              className={`size-2 rounded-full ${settings?.configured ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"}`}
              aria-label={settings?.configured ? "configurado" : "não configurado"}
            />
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setEditingId(null);
              setCreating(emptyLead(city, niche));
            }}
          >
            + Novo lead
          </button>
        </div>
      </div>

      {/* Busca */}
      <form
        className={`${cardClass} mb-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch();
        }}
      >
        <Labeled label="Nicho">
          <input
            className={inputClass}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Ex.: oficina mecânica"
          />
        </Labeled>
        <Labeled label="Cidade">
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </Labeled>
        <div className="flex gap-2">
          <select
            className={`${selectClass} w-20 shrink-0`}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Quantidade de resultados"
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="submit" className={btnSearch} disabled={searching}>
            {searching ? "Buscando…" : "Buscar com Gemini"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 sm:col-span-3 dark:text-neutral-400">
          <span>
            {searching
              ? "O Gemini está procurando no Google Maps e olhando os sites. Pode levar até um minuto."
              : searchInfo ||
                (settings?.configured
                  ? `${base.length} de ${leads.length} leads salvos nessa busca.`
                  : "Configure GEMINI_API_KEY no servidor para buscar leads novos. Os campos também filtram a lista.")}
          </span>
          <a href={mapsSearch} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Abrir no Google Maps ↗
          </a>
        </div>
      </form>

      {/* Gemini (somente status — chave/modelo no .env / Vercel) */}
      {panel === "gemini" ? (
        <div className={`${cardClass} mb-4 space-y-4`}>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Gemini</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              A chave e o modelo vêm do ambiente do servidor (
              <span className="font-mono">GEMINI_API_KEY</span> /{" "}
              <span className="font-mono">GEMINI_MODEL</span>
              ). Nada é salvo na sessão nem no banco.
            </p>
          </div>
          <p className="text-sm">
            {settings?.configured ? (
              <>
                Chave no env: <span className="font-mono">••••{settings.last4}</span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {" "}
                  · modelo <span className="font-mono">{settings.model}</span>
                  {settings.fallbackModels?.length ? (
                    <>
                      {" "}
                      · reserva{" "}
                      <span className="font-mono">{settings.fallbackModels.join(", ")}</span>
                    </>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="text-amber-700 dark:text-amber-300">
                GEMINI_API_KEY ausente no ambiente. Defina no .env local e na Vercel (Production).
              </span>
            )}
          </p>
          {settings?.configured ? (
            <div className="space-y-3">
              <button type="button" className={btn} onClick={runCheck} disabled={checking}>
                {checking ? "Testando…" : "Testar conexão"}
              </button>
              {checkResult ? (
                <ul className="space-y-2 text-sm">
                  {[
                    { label: "Chave e modelo", r: checkResult.key },
                    {
                      label: "Busca no Google (Maps + Pesquisa)",
                      r: checkResult.grounding ?? { ok: false, message: "Não testado: a chave falhou antes." },
                    },
                  ].map(({ label, r }) => (
                    <li
                      key={label}
                      className={`border px-3 py-2 ${
                        r.ok
                          ? "border-emerald-600/40 bg-emerald-500/5 dark:border-emerald-400/30"
                          : "border-amber-500/40 bg-amber-500/10"
                      }`}
                    >
                      <p className="font-medium">
                        {r.ok ? "✓" : "✕"} {label}
                      </p>
                      <p className="mt-0.5 text-neutral-600 dark:text-neutral-300">{r.message}</p>
                      {"detail" in r && r.detail ? (
                        <p className="mt-1 font-mono text-xs break-words text-neutral-500 dark:text-neutral-400">
                          Google: {r.detail}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
            <li>
              Modelo padrão:{" "}
              <span className="font-mono">{settings?.defaultModel ?? "gemini-3.8-flash"}</span>{" "}
              (chaves novas não acessam mais o 2.5)
            </li>
            <li>
              No plano gratuito, só o <strong>Gemini 2.5 Flash / Flash-Lite</strong> tem busca no Google (até 500
              pedidos/dia). Os 3.x só buscam com faturamento ativo. Se o modelo principal não tiver busca, o painel
              tenta os de reserva sozinho.
            </li>
            <li>
              Projetos novos do Google podem não ter acesso ao 2.5. Nesse caso, use a chave de um projeto mais
              antigo ou ative o faturamento (5.000 buscas grátis por mês nos 3.x, depois pago por consulta).
            </li>
            <li>No Google Cloud, restrinja a chave à “Generative Language API”.</li>
          </ul>
        </div>
      ) : null}

      {/* Importar / exportar */}
      {panel === "import" ? (
        <div className={`${cardClass} mb-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]`}>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Importar leads</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Cole um CSV ou JSON, ou escolha um arquivo. Colunas reconhecidas: nome, nicho, cidade, endereco, bairro, site, email, whatsapp, telefone, instagram, problemas, argumento, enviado, respondeu. Mesmo nome e cidade atualiza o lead em vez de duplicar.
            </p>
            <textarea
              className={`${area("min-h-32")} font-mono`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"nome;nicho;bairro;site;whatsapp;instagram;problemas\nAuto Center Exemplo;oficina mecânica;Centro;;(54) 99999-0000;@autocenter;"}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={importBusy} onClick={() => runImport(importText)}>
                {importBusy ? "Importando…" : "Importar"}
              </button>
              <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={importBusy}>
                Escolher arquivo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json,.txt,text/csv,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) await runImport(await file.text());
                }}
              />
            </div>
            {importMsg ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300" role="status">
                {importMsg}
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Exportar / backup</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              O JSON leva tudo, inclusive Enviado, Respondeu e as mensagens editadas. Para restaurar, importe o mesmo arquivo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btn}
                disabled={!leads.length}
                onClick={() =>
                  downloadText(
                    `prospeccao-devbossle-${stamp}.json`,
                    JSON.stringify({ app: "devbossle-prospeccao", exportedAt: new Date().toISOString(), leads }, null, 2),
                    "application/json",
                  )
                }
              >
                Baixar JSON
              </button>
              <button
                type="button"
                className={btn}
                disabled={!leads.length}
                onClick={() => downloadText(`prospeccao-devbossle-${stamp}.csv`, `﻿${prospectsToCsv(leads)}`, "text/csv;charset=utf-8")}
              >
                Baixar CSV
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button type="button" className={`${chip(siteFilter === "todos")} shrink-0`} onClick={() => setSiteFilter("todos")}>
            Todos · {counts.todos}
          </button>
          <button type="button" className={`${chip(siteFilter === "sem")} shrink-0`} onClick={() => setSiteFilter("sem")}>
            Sem site · {counts.sem}
          </button>
          <button
            type="button"
            className={`${chip(siteFilter === "problemas")} shrink-0`}
            onClick={() => setSiteFilter("problemas")}
          >
            Site com problemas · {counts.problemas}
          </button>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto">
          <select
            className={`${selectClass} w-full sm:w-48`}
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            aria-label="Filtrar por nicho"
          >
            <option value="">Todos os nichos</option>
            {niches.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className={`${selectClass} w-full sm:w-52`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "" | LeadStatus)}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Não enviado</option>
            <option value="enviado">Enviado, sem resposta</option>
            <option value="respondeu">Respondeu</option>
          </select>
        </div>
      </div>

      {creating ? (
        <div className={`${cardClass} mb-4`}>
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Novo lead</h2>
          <LeadForm
            initial={creating}
            showToast={showToast}
            onCancel={() => setCreating(null)}
            onSaved={(lead) => {
              replaceLead(lead);
              setCreating(null);
            }}
          />
        </div>
      ) : null}

      {loadError ? (
        <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {loadError}
          {/relation|does not exist|undefined_table|008/i.test(loadError) ? (
            <>
              {" "}
              Rode a migration <span className="font-mono">008_prospects.sql</span> no Neon.
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {visible.map((lead) =>
          editingId === lead.id ? (
            <div key={lead.id} className={`${cardClass} lg:col-span-2 2xl:col-span-3`}>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">Editar lead</h2>
              <LeadForm
                initial={lead}
                showToast={showToast}
                onCancel={() => setEditingId(null)}
                onSaved={(saved) => {
                  replaceLead(saved);
                  setEditingId(null);
                }}
              />
            </div>
          ) : (
            <LeadCard
              key={lead.id}
              lead={lead}
              senderName={senderName}
              showToast={showToast}
              onChange={replaceLead}
              onEdit={() => {
                setCreating(null);
                setEditingId(lead.id);
              }}
              onDelete={async () => {
                try {
                  await orcamentosApi.deleteProspect(lead.id);
                  setLeads((prev) => prev.filter((l) => l.id !== lead.id));
                  showToast("Lead excluído");
                } catch (e) {
                  showToast(e instanceof Error ? e.message : "Erro ao excluir");
                }
              }}
            />
          ),
        )}
      </div>

      {!loading && !loadError && !visible.length ? (
        <div className="border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          {leads.length
            ? "Nenhum lead com esses filtros. Limpe o nicho ou troque os filtros."
            : "Nenhum lead ainda. Busque com o Gemini, importe uma lista ou adicione um lead."}
        </div>
      ) : null}
      {loading ? (
        <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">Carregando…</div>
      ) : null}
    </section>
  );
}

export default Prospects;
