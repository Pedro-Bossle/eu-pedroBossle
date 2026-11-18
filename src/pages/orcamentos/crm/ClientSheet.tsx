import { useCallback, useEffect, useMemo, useState } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { ClientStatus, CrmActivity, CrmActivityKind, CrmTask, OrcamentoClient, OrcamentoProposal } from "../../../types/orcamentos";
import { btn, btnPrimary, btnSm, focusRing, inputClass, labelClass, textareaClass } from "../panelStyles";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import Sheet from "../ui/Sheet";
import TaskRow from "./TaskRow";
import { ACTIVITY_ICON, ACTIVITY_KINDS, ACTIVITY_LABEL, CLIENT_STATUSES, addDays, clientStatus, money, relTime, telLink, waLink, ymd, type TaskDraft } from "./model";

const SOURCES = ["Indicação", "Instagram", "Site", "Google", "Prospecção", "LinkedIn", "Evento"];

type TimelineItem = {
  key: string;
  at: string;
  icon: string;
  title: string;
  body?: string;
  tone?: "accent" | "muted";
  onDelete?: () => void;
  onOpen?: () => void;
};

const I = {
  wa: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  check: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
};

export default function ClientSheet({
  client,
  proposals,
  taskVersion,
  onClose,
  onEdit,
  onNewProposal,
  onOpenProposal,
  onOpenTask,
  onSaved,
  showToast,
}: {
  client: OrcamentoClient;
  proposals: OrcamentoProposal[];
  taskVersion: number;
  onClose: () => void;
  onEdit: (c: OrcamentoClient) => void;
  onNewProposal: (clientId: string) => void;
  onOpenProposal: (id: string) => void;
  onOpenTask: (draft: TaskDraft | CrmTask) => void;
  onSaved: (c: OrcamentoClient) => void;
  showToast: (m: string) => void;
}) {
  const [view, setView] = useState<"timeline" | "tasks" | "proposals">("timeline");
  const [activities, setActivities] = useState<CrmActivity[] | null>(null);
  const [tasks, setTasks] = useState<CrmTask[] | null>(null);
  const [kind, setKind] = useState<CrmActivityKind>("nota");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [monthly, setMonthly] = useState(String(client.monthlyValue || ""));

  const mine = useMemo(() => proposals.filter((p) => p.clientId === client.id), [proposals, client.id]);
  const approved = mine.filter((p) => p.status.toLowerCase().includes("aprov"));
  const ltv = approved.reduce((s, p) => s + Number(p.total || 0), 0);
  const open = mine.filter((p) => /elabor|envi/i.test(p.status));

  const load = useCallback(async () => {
    try {
      const [a, t] = await Promise.all([orcamentosApi.crmActivities(client.id), orcamentosApi.crmTasks({ scope: "all", clientId: client.id })]);
      setActivities(a.activities);
      setTasks(t.tasks);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar histórico");
      setActivities([]);
      setTasks([]);
    }
  }, [client.id, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, taskVersion]);

  /** Salva campos de CRM do cliente (status, próximo contato, etiquetas…). */
  const patch = async (p: Partial<OrcamentoClient>, toast?: string) => {
    try {
      const { client: saved } = await orcamentosApi.saveClient({ ...client, ...p });
      onSaved(saved);
      if (toast) showToast(toast);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const { activity } = await orcamentosApi.crmAddActivity({ clientId: client.id, kind, body: note.trim() });
      setActivities((a) => [activity, ...(a ?? [])]);
      setNote("");
      showToast("Registrado no histórico");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao registrar");
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (t: CrmTask) => {
    const done = !t.doneAt;
    setTasks((l) => l?.map((x) => (x.id === t.id ? { ...x, doneAt: done ? new Date().toISOString() : null } : x)) ?? null);
    try {
      const { next } = await orcamentosApi.crmToggleTask(t.id, done);
      if (next) load();
    } catch {
      load();
    }
  };

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    for (const a of activities ?? []) {
      items.push({
        key: `a-${a.id}`,
        at: a.at ?? "",
        icon: ACTIVITY_ICON[a.kind] ?? ACTIVITY_ICON.nota,
        title: ACTIVITY_LABEL[a.kind] ?? "Nota",
        body: a.body,
        onDelete: async () => {
          if (!window.confirm("Apagar este registro?")) return;
          await orcamentosApi.crmDeleteActivity(a.id);
          setActivities((l) => l?.filter((x) => x.id !== a.id) ?? null);
        },
      });
    }
    for (const p of mine) {
      items.push({
        key: `p-${p.id}`,
        at: p.created,
        icon: I.doc,
        title: `Orçamento: ${p.company || "sem título"}`,
        body: `${p.status} · ${money(Number(p.total || 0))}${p.clientDecidedAt ? ` · cliente decidiu ${relTime(p.clientDecidedAt)}` : ""}`,
        tone: p.status.toLowerCase().includes("aprov") ? "accent" : undefined,
        onOpen: () => onOpenProposal(p.id),
      });
    }
    for (const t of tasks ?? []) {
      if (!t.doneAt) continue;
      items.push({ key: `t-${t.id}`, at: t.doneAt, icon: I.check, title: "Tarefa concluída", body: t.title, tone: "muted" });
    }
    if (client.created) items.push({ key: "created", at: client.created, icon: I.edit, title: "Cliente cadastrado", tone: "muted" });
    return items.filter((i) => i.at).sort((a, b) => b.at.localeCompare(a.at));
  }, [activities, mine, tasks, client.created, onOpenProposal]);

  const st = clientStatus(client.status);
  const wa = waLink(client.phone, `Oi ${client.name.split(" ")[0]}, tudo bem?`);
  const tel = telLink(client.phone);
  const openTasks = (tasks ?? []).filter((t) => !t.doneAt);
  const tags = client.tags ?? [];

  const quickNext = [
    { label: "Amanhã", v: ymd(addDays(new Date(), 1)) },
    { label: "1 semana", v: ymd(addDays(new Date(), 7)) },
    { label: "15 dias", v: ymd(addDays(new Date(), 15)) },
    { label: "1 mês", v: ymd(addDays(new Date(), 30)) },
  ];

  return (
    <Sheet
      width="md:max-w-2xl"
      onClose={onClose}
      title={client.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${st.chip}`}>
            <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
            {st.label}
          </span>
          {client.company ? <span>{client.company}</span> : null}
        </span>
      }
    >
      {/* Ações rápidas */}
      <div className="flex flex-wrap gap-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noreferrer" className={`${btn} shrink-0`}>
            <Icon d={I.wa} className="size-4" /> WhatsApp
          </a>
        ) : null}
        {tel ? (
          <a href={tel} className={`${btn} shrink-0`}>
            <Icon d={I.phone} className="size-4" /> Ligar
          </a>
        ) : null}
        {client.email ? (
          <a href={`mailto:${client.email}`} className={`${btn} shrink-0`}>
            <Icon d={I.mail} className="size-4" /> E-mail
          </a>
        ) : null}
        {client.link ? (
          <a href={/^https?:/.test(client.link) ? client.link : `https://${client.link}`} target="_blank" rel="noreferrer" className={`${btn} shrink-0`}>
            <Icon d={I.link} className="size-4" /> Site
          </a>
        ) : null}
        <button type="button" className={`${btn} shrink-0`} onClick={() => onOpenTask({ title: "", clientId: client.id, kind: "follow-up", dueAt: addDays(new Date(), 1).toISOString() })}>
          <Icon d={I.check} className="size-4" /> Tarefa
        </button>
        <button type="button" className={`${btnPrimary} shrink-0`} onClick={() => onNewProposal(client.id)}>
          + Orçamento
        </button>
      </div>

      {/* Números */}
      <dl className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-line">
        {[
          ["Já fechado", money(ltv), `${approved.length} ${approved.length === 1 ? "proposta" : "propostas"}`],
          ["Em aberto", money(open.reduce((s, p) => s + Number(p.total || 0), 0)), `${open.length} em negociação`],
          ["Mensal", client.monthlyValue ? money(client.monthlyValue) : "—", "recorrente"],
        ].map(([k, v, h], i) => (
          <div key={k} className={`p-3 sm:p-4 ${i ? "border-l border-line" : ""}`}>
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="mt-1 truncate text-base font-semibold tabular-nums sm:text-lg">{v}</dd>
            <dd className="truncate text-[11px] text-faint">{h}</dd>
          </div>
        ))}
      </dl>

      {/* Relacionamento */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <span className={labelClass}>Status</span>
          <div className="mt-2">
            <Select
              ariaLabel="Status do cliente"
              value={client.status ?? "ativo"}
              onChange={(v) => patch({ status: v as ClientStatus }, "Status atualizado")}
              options={CLIENT_STATUSES.map((s) => ({ value: s.value, label: s.label, dot: s.dot }))}
            />
          </div>
        </div>
        <div>
          <span className={labelClass}>Origem</span>
          <div className="mt-2">
            <Select
              ariaLabel="Origem do cliente"
              creatable
              placeholder="De onde veio?"
              value={client.source ?? ""}
              onChange={(v) => patch({ source: v })}
              options={SOURCES.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>
        <div>
          <span className={labelClass}>Próximo contato</span>
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              className={inputClass}
              value={client.nextContactAt ?? ""}
              onChange={(e) => patch({ nextContactAt: e.target.value || null }, e.target.value ? "Lembrete marcado" : "Lembrete removido")}
              aria-label="Data do próximo contato"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickNext.map((q) => (
              <button key={q.label} type="button" className={`rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:text-ink ${focusRing}`} onClick={() => patch({ nextContactAt: q.v }, `Lembrete para ${q.label.toLowerCase()}`)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className={labelClass}>Valor mensal recorrente</span>
          <input
            className={`${inputClass} mt-2`}
            inputMode="decimal"
            placeholder="R$ 0,00 (manutenção, hospedagem…)"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            onBlur={() => {
              const v = Number(monthly.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
              if (v !== (client.monthlyValue ?? 0)) patch({ monthlyValue: v }, "Valor mensal salvo");
            }}
            aria-label="Valor mensal recorrente"
          />
        </div>
        <div className="sm:col-span-2">
          <span className={labelClass}>Etiquetas</span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-[10px] border border-line bg-sunken/60 p-1.5 focus-within:border-accent">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs shadow-[0_1px_1px_rgb(0_0_0/0.04)]">
                {t}
                <button type="button" aria-label={`Remover etiqueta ${t}`} className="text-faint hover:text-danger" onClick={() => patch({ tags: tags.filter((x) => x !== t) })}>
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === ",") && tagDraft.trim()) {
                  e.preventDefault();
                  if (!tags.includes(tagDraft.trim())) patch({ tags: [...tags, tagDraft.trim()] });
                  setTagDraft("");
                }
              }}
              placeholder={tags.length ? "" : "landing, e-commerce, manutenção… (Enter)"}
              aria-label="Nova etiqueta"
              className="min-h-8 min-w-24 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-faint"
            />
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mt-6 flex gap-1 rounded-xl bg-sunken/70 p-1" role="tablist">
        {(
          [
            ["timeline", "Linha do tempo"],
            ["tasks", `Tarefas${openTasks.length ? ` (${openTasks.length})` : ""}`],
            ["proposals", `Orçamentos (${mine.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm transition-colors ${focusRing} ${view === id ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "timeline" ? (
        <div className="mt-4">
          <div className="rounded-2xl border border-line p-3">
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  aria-pressed={kind === k.value}
                  onClick={() => setKind(k.value)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${focusRing} ${
                    kind === k.value ? "bg-ink text-canvas" : "text-muted hover:bg-sunken hover:text-ink"
                  }`}
                >
                  <Icon d={k.icon} className="size-3.5" />
                  {k.label}
                </button>
              ))}
            </div>
            <textarea
              className={`${textareaClass} mt-2 !min-h-20 border-transparent bg-transparent px-1 focus:ring-0`}
              placeholder="O que aconteceu? Ex.: Liguei, aprovou o layout e pediu ajuste no rodapé."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-faint">Ctrl + Enter para registrar</span>
              <button type="button" className={btnSm} disabled={!note.trim() || busy} onClick={addNote}>
                Registrar
              </button>
            </div>
          </div>

          {!activities ? (
            <div className="mt-4 h-32 animate-pulse rounded-xl bg-sunken/60 motion-reduce:animate-none" />
          ) : (
            <ol className="relative mt-5 ml-3 border-l border-line">
              {timeline.map((i) => (
                <li key={i.key} className="group relative pb-5 pl-6 last:pb-0">
                  <span
                    className={`absolute -left-[13px] grid size-6 place-items-center rounded-full border border-line bg-surface ${
                      i.tone === "accent" ? "text-accent-text" : i.tone === "muted" ? "text-faint" : "text-muted"
                    }`}
                  >
                    <Icon d={i.icon} className="size-3.5" />
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    {i.onOpen ? (
                      <button type="button" className="text-left text-sm font-medium hover:underline" onClick={i.onOpen}>
                        {i.title}
                      </button>
                    ) : (
                      <p className="text-sm font-medium">{i.title}</p>
                    )}
                    <span className="shrink-0 text-[11px] text-faint" title={new Date(i.at).toLocaleString("pt-BR")}>
                      {relTime(i.at)}
                    </span>
                  </div>
                  {i.body ? <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted">{i.body}</p> : null}
                  {i.onDelete ? (
                    <button type="button" onClick={i.onDelete} className="mt-1 text-[11px] text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus:opacity-100">
                      Apagar
                    </button>
                  ) : null}
                </li>
              ))}
              {!timeline.length ? <li className="pl-6 text-sm text-muted">Sem histórico ainda. Registre a primeira conversa acima.</li> : null}
            </ol>
          )}
        </div>
      ) : null}

      {view === "tasks" ? (
        <div className="mt-3">
          <ul>
            {(tasks ?? [])
              .slice()
              .sort((a, b) => Number(Boolean(a.doneAt)) - Number(Boolean(b.doneAt)))
              .map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggleTask} onOpen={onOpenTask} showClient={false} />
              ))}
          </ul>
          {!tasks?.length ? <p className="py-6 text-center text-sm text-muted">Nenhuma tarefa para este cliente.</p> : null}
          <button type="button" className={`${btn} mt-3 w-full`} onClick={() => onOpenTask({ title: "", clientId: client.id, dueAt: new Date().toISOString() })}>
            + Nova tarefa para {client.name.split(" ")[0]}
          </button>
        </div>
      ) : null}

      {view === "proposals" ? (
        <ul className="mt-3 divide-y divide-line">
          {mine.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpenProposal(p.id)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-sunken/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.company || "Orçamento"}</span>
                  <span className="text-xs text-faint">
                    {p.status} · {new Date(p.created).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">{money(Number(p.total || 0))}</span>
              </button>
            </li>
          ))}
          {!mine.length ? <li className="py-6 text-center text-sm text-muted">Nenhum orçamento ainda.</li> : null}
        </ul>
      ) : null}

      <div className="mt-8 flex justify-between border-t border-line pt-4">
        <button type="button" className={btnSm} onClick={() => onEdit(client)}>
          <Icon d={I.edit} className="size-3.5" /> Editar dados
        </button>
        {client.notes ? <p className="ml-4 line-clamp-2 text-right text-xs text-faint">{client.notes}</p> : null}
      </div>
    </Sheet>
  );
}
