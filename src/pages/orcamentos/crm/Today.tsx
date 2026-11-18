import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmTask, CrmToday } from "../../../types/orcamentos";
import { btnSm, cardClass, focusRing, labelClass } from "../panelStyles";
import Icon from "../ui/Icon";
import TaskRow from "./TaskRow";
import { addDays, greeting, money, relTime, waLink, ymd, type TaskDraft } from "./model";

export type TodayNav = "prospects" | "inbox" | "instagram" | "finance" | "proposals" | "tasks" | "clients";

type Props = {
  name: string;
  /** Muda quando uma tarefa é salva fora daqui (editor, ficha do cliente). */
  version: number;
  onNavigate: (tab: TodayNav) => void;
  onOpenClient: (id: string) => void;
  onOpenProposal: (id: string) => void;
  onOpenTask: (draft: TaskDraft | CrmTask) => void;
  showToast: (m: string) => void;
};

const ICONS = {
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  funnel: "M22 3H2l8 9.46V19l4 2v-8.54z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  ig: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01",
  card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM2 10h20",
  sun: "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  plus: "M12 5v14M5 12h14",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

/** "ligar pro João amanhã" → título sem a palavra de data + a data. */
function parseQuick(text: string): { title: string; date: string | null } {
  const t = text.trim();
  const rules: [RegExp, () => string | null][] = [
    [/\s+(hoje)$/i, () => ymd(new Date())],
    [/\s+(amanh[ãa])$/i, () => ymd(addDays(new Date(), 1))],
    [/\s+(depois de amanh[ãa])$/i, () => ymd(addDays(new Date(), 2))],
    [/\s+(semana que vem|pr[óo]xima semana)$/i, () => ymd(addDays(new Date(), 7))],
    [/\s+(sem data)$/i, () => null],
  ];
  for (const [re, fn] of rules) if (re.test(t)) return { title: t.replace(re, ""), date: fn() };
  return { title: t, date: ymd(new Date()) };
}

export default function Today({ name, version, onNavigate, onOpenClient, onOpenProposal, onOpenTask, showToast }: Props) {
  const [data, setData] = useState<CrmToday | null>(null);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await orcamentosApi.crmToday());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar o dia");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const toggle = async (t: CrmTask) => {
    const done = !t.doneAt;
    // Otimista: some da lista com um pequeno atraso para a animação do check aparecer
    setData((d) => (d?.tasks ? { ...d, tasks: mapTasks(d.tasks, (x) => (x.id === t.id ? { ...x, doneAt: done ? new Date().toISOString() : null } : x)) } : d));
    try {
      const { next } = await orcamentosApi.crmToggleTask(t.id, done);
      if (done) showToast(next ? "Concluída — a próxima já está agendada" : "Tarefa concluída");
      window.setTimeout(load, 600);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
      load();
    }
  };

  const addQuick = async () => {
    const { title, date } = parseQuick(quick);
    if (!title) return;
    setAdding(true);
    try {
      await orcamentosApi.crmSaveTask({ title, dueAt: date ? new Date(`${date}T09:00:00`).toISOString() : null, allDay: true });
      setQuick("");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao criar");
    } finally {
      setAdding(false);
    }
  };

  const first = name.trim().split(/\s+/)[0] || "";
  const dateLabel = useMemo(() => {
    const s = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, []);

  const t = data?.tasks;
  const openCount = (t?.overdue.length ?? 0) + (t?.dueToday.length ?? 0);
  const summary = !t
    ? ""
    : openCount === 0
      ? t.doneToday
        ? `Tudo em dia. ${t.doneToday} ${t.doneToday === 1 ? "tarefa concluída" : "tarefas concluídas"} hoje.`
        : "Nada pendente para hoje."
      : [
          t.dueToday.length ? `${t.dueToday.length} para hoje` : "",
          t.overdue.length ? `${t.overdue.length} ${t.overdue.length === 1 ? "atrasada" : "atrasadas"}` : "",
          t.doneToday ? `${t.doneToday} ${t.doneToday === 1 ? "feita" : "feitas"}` : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <section className="space-y-6" aria-labelledby="today-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{dateLabel}</p>
          <h1 id="today-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting()}
            {first ? `, ${first}` : ""}
          </h1>
          {summary ? <p className="mt-1.5 text-sm text-muted">{summary}</p> : null}
        </div>
      </header>

      {error ? <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

      {data?.kpis ? <Kpis k={data.kpis} onNavigate={onNavigate} /> : !data ? <div className="h-24 animate-pulse rounded-2xl bg-sunken/70 motion-reduce:animate-none" /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        {/* Tarefas */}
        <section className={`${cardClass} p-3 sm:p-4 xl:p-5`} aria-label="Tarefas">
          <form
            className="flex items-center gap-2 rounded-xl border border-line bg-sunken/50 py-1 pr-1 pl-3 transition-colors focus-within:border-accent focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent/10"
            onSubmit={(e) => {
              e.preventDefault();
              addQuick();
            }}
          >
            <Icon d={ICONS.plus} className="size-4 text-faint" />
            <input
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="Adicionar tarefa…"
              title="Dica: termine com “amanhã”, “depois de amanhã”, “semana que vem” ou “sem data”"
              aria-label="Nova tarefa rápida"
              className="min-h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint sm:text-sm"
            />
            {quick.trim() ? (
              <button type="submit" disabled={adding} className={`${btnSm} border-transparent bg-accent text-accent-ink hover:bg-accent`}>
                {adding ? "…" : "Adicionar"}
              </button>
            ) : (
              <button type="button" className={btnSm} onClick={() => onOpenTask({ title: "", dueAt: new Date().toISOString() })}>
                Detalhada
              </button>
            )}
          </form>

          {!t ? (
            <div className="mt-4 space-y-2" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-sunken/60 motion-reduce:animate-none" />
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <TaskGroup title="Atrasadas" tone="danger" tasks={t.overdue} onToggle={toggle} onOpen={onOpenTask} onOpenClient={onOpenClient} />
              <TaskGroup title="Hoje" tasks={t.dueToday} onToggle={toggle} onOpen={onOpenTask} onOpenClient={onOpenClient} />
              <TaskGroup title="Próximos 7 dias" tasks={t.upcoming} onToggle={toggle} onOpen={onOpenTask} onOpenClient={onOpenClient} collapsible />
              <TaskGroup title="Sem data" tasks={t.noDate} onToggle={toggle} onOpen={onOpenTask} onOpenClient={onOpenClient} collapsible />
              {!t.overdue.length && !t.dueToday.length && !t.upcoming.length && !t.noDate.length ? (
                <div className="px-3 py-10 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-accent-soft text-accent-text">
                    <Icon d={ICONS.sun} className="size-6" />
                  </span>
                  <p className="mt-3 font-medium">Dia livre</p>
                  <p className="mt-1 text-sm text-muted">Adicione o que precisa fazer no campo acima.</p>
                </div>
              ) : null}
              <div className="mt-2 flex justify-end px-2">
                <button type="button" className="text-xs font-medium text-muted hover:text-ink" onClick={() => onNavigate("tasks")}>
                  Ver todas as tarefas
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Pede atenção */}
        <div className="space-y-4">{data ? <Attention d={data} onNavigate={onNavigate} onOpenClient={onOpenClient} onOpenProposal={onOpenProposal} onOpenTask={onOpenTask} /> : null}</div>
      </div>
    </section>
  );
}

function mapTasks(t: NonNullable<CrmToday["tasks"]>, fn: (x: CrmTask) => CrmTask): NonNullable<CrmToday["tasks"]> {
  return { ...t, overdue: t.overdue.map(fn), dueToday: t.dueToday.map(fn), upcoming: t.upcoming.map(fn), noDate: t.noDate.map(fn) };
}

function TaskGroup({
  title,
  tasks,
  tone,
  collapsible,
  onToggle,
  onOpen,
  onOpenClient,
}: {
  title: string;
  tasks: CrmTask[];
  tone?: "danger";
  collapsible?: boolean;
  onToggle: (t: CrmTask) => void;
  onOpen: (t: CrmTask) => void;
  onOpenClient: (id: string) => void;
}) {
  const [open, setOpen] = useState(!collapsible || tasks.length <= 5);
  if (!tasks.length) return null;
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${tone === "danger" ? "text-danger" : "text-muted"} ${focusRing}`}
      >
        <svg viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
        {title}
        <span className="font-normal tabular-nums opacity-70">{tasks.length}</span>
      </button>
      {open ? (
        <ul>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} onOpenClient={onOpenClient} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Kpis({ k, onNavigate }: { k: NonNullable<CrmToday["kpis"]>; onNavigate: (t: TodayNav) => void }) {
  const items: { label: string; value: string; hint: string; to: TodayNav }[] = [
    { label: "Receita recorrente", value: money(k.mrr), hint: `${k.activeClients} ${k.activeClients === 1 ? "cliente ativo" : "clientes ativos"}`, to: "clients" },
    { label: "Em negociação", value: money(k.pipeline), hint: "propostas abertas", to: "proposals" },
    { label: "Fechado no mês", value: money(k.wonMonth), hint: "propostas aprovadas", to: "proposals" },
    { label: "Conversão", value: k.winRate == null ? "—" : `${k.winRate}%`, hint: "aprovadas ÷ decididas", to: "proposals" },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-4">
      {items.map((i) => (
        <button
          key={i.label}
          type="button"
          onClick={() => onNavigate(i.to)}
          className={`border-line p-4 text-left transition-colors hover:bg-sunken/40 sm:p-5 [&:nth-child(n+3)]:border-t [&:nth-child(even)]:border-l lg:[&:nth-child(n+3)]:border-t-0 lg:[&:not(:first-child)]:border-l ${focusRing}`}
        >
          <p className={labelClass}>{i.label}</p>
          <p className="mt-2 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl">{i.value}</p>
          <p className="mt-0.5 truncate text-xs text-faint">{i.hint}</p>
        </button>
      ))}
    </div>
  );
}

function AttentionCard({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: string;
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${cardClass} p-4 xl:p-5`}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-muted">
          <Icon d={icon} className="size-4" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {title}
          {count ? <span className="ml-1.5 font-normal text-faint tabular-nums">{count}</span> : null}
        </h3>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function GoLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-md text-xs font-medium text-accent-text hover:underline ${focusRing}`}>
      {label}
      <Icon d={ICONS.arrow} className="size-3.5" />
    </button>
  );
}

function Attention({
  d,
  onNavigate,
  onOpenClient,
  onOpenProposal,
  onOpenTask,
}: {
  d: CrmToday;
  onNavigate: (t: TodayNav) => void;
  onOpenClient: (id: string) => void;
  onOpenProposal: (id: string) => void;
  onOpenTask: (draft: TaskDraft) => void;
}) {
  const cards: ReactNode[] = [];
  const row = "flex items-center gap-3 rounded-lg px-1 py-2 text-sm";

  if (d.contacts?.length) {
    cards.push(
      <AttentionCard key="contacts" icon={ICONS.phone} title="Retomar contato" count={d.contacts.length}>
        <ul className="divide-y divide-line">
          {d.contacts.slice(0, 5).map((c) => {
            const wa = waLink(c.phone, `Oi ${c.name.split(" ")[0]}, tudo bem?`);
            return (
              <li key={c.id} className={row}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenClient(c.id)}>
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-xs text-faint">{c.company || "combinado para " + (c.nextContactAt ?? "")}</p>
                </button>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className={btnSm}>
                    WhatsApp
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      </AttentionCard>,
    );
  }

  if (d.proposals?.length) {
    cards.push(
      <AttentionCard key="proposals" icon={ICONS.doc} title="Propostas sem resposta" count={d.proposals.length} action={<GoLink label="Ver" onClick={() => onNavigate("proposals")} />}>
        <ul className="divide-y divide-line">
          {d.proposals.slice(0, 4).map((p) => {
            const wa = waLink(p.clientPhone, `Oi ${p.clientName.split(" ")[0]}, conseguiu dar uma olhada na proposta de ${p.title}?`);
            return (
              <li key={p.id} className={row}>
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpenProposal(p.id)}>
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="truncate text-xs text-faint">
                    {p.clientName} · {money(p.total)} · enviada há {p.days} dias
                  </p>
                </button>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className={btnSm} title="Cobrar retorno no WhatsApp">
                    Cobrar
                  </a>
                ) : (
                  <button type="button" className={btnSm} onClick={() => onOpenTask({ title: `Follow-up: ${p.title}`, kind: "follow-up", proposalId: p.id, dueAt: new Date().toISOString() })}>
                    Follow-up
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </AttentionCard>,
    );
  }

  const f = d.funnel;
  if (f && (f.awaiting || f.followups || f.replied)) {
    const items = [
      f.awaiting ? `${f.awaiting} ${f.awaiting === 1 ? "mensagem" : "mensagens"} para aprovar` : "",
      f.followups ? `${f.followups} ${f.followups === 1 ? "follow-up vencido" : "follow-ups vencidos"}` : "",
      f.replied ? `${f.replied} ${f.replied === 1 ? "lead respondeu" : "leads responderam"}` : "",
    ].filter(Boolean);
    cards.push(
      <AttentionCard key="funnel" icon={ICONS.funnel} title="Funil de prospecção" action={<GoLink label="Abrir funil" onClick={() => onNavigate("prospects")} />}>
        <ul className="space-y-1.5 text-sm text-muted">
          {items.map((i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {i}
            </li>
          ))}
        </ul>
      </AttentionCard>,
    );
  }

  if (d.inbox?.unread) {
    cards.push(
      <AttentionCard key="inbox" icon={ICONS.mail} title="Novos contatos do site" count={d.inbox.unread} action={<GoLink label="Inbox" onClick={() => onNavigate("inbox")} />}>
        <ul className="divide-y divide-line">
          {d.inbox.latest.slice(0, 3).map((l) => (
            <li key={l.id} className="py-2 text-sm">
              <p className="font-medium">
                {l.name} <span className="text-xs font-normal text-faint">{relTime(l.at)}</span>
              </p>
              {l.idea ? <p className="line-clamp-2 text-xs text-muted">{l.idea}</p> : null}
            </li>
          ))}
        </ul>
      </AttentionCard>,
    );
  }

  const ig = d.instagram;
  if (ig && (ig.posts.length || ig.newComments)) {
    cards.push(
      <AttentionCard key="ig" icon={ICONS.ig} title="Instagram" action={<GoLink label="Abrir" onClick={() => onNavigate("instagram")} />}>
        <ul className="space-y-2 text-sm">
          {ig.posts.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              {p.thumb && !/\.(mp4|mov)/i.test(p.thumb) ? <img src={p.thumb} alt="" className="size-9 rounded-lg object-cover" /> : <span className="size-9 rounded-lg bg-sunken" />}
              <div className="min-w-0 flex-1">
                <p className="truncate">{p.caption || "Post sem legenda"}</p>
                <p className={`text-xs ${p.status === "erro" ? "text-danger" : "text-faint"}`}>
                  {p.status === "erro" ? "Erro ao publicar" : p.at ? `Sai às ${new Date(p.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                </p>
              </div>
            </li>
          ))}
          {ig.newComments ? (
            <li className="flex items-center gap-2 text-muted">
              <span className="size-1.5 rounded-full bg-fuchsia-500" aria-hidden />
              {ig.newComments} {ig.newComments === 1 ? "comentário esperando resposta" : "comentários esperando resposta"}
            </li>
          ) : null}
        </ul>
      </AttentionCard>,
    );
  }

  const fin = d.finance;
  if (fin && (fin.bills.length || fin.budgets.length)) {
    cards.push(
      <AttentionCard key="fin" icon={ICONS.card} title="Finanças" action={<GoLink label="Abrir" onClick={() => onNavigate("finance")} />}>
        <ul className="space-y-2 text-sm">
          {fin.bills.map((b) => (
            <li key={b.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                Fatura {b.name}{" "}
                <span className="text-xs text-faint">vence {b.due ? new Date(`${b.due}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}</span>
              </span>
              <span className="tabular-nums">{money(b.amount)}</span>
            </li>
          ))}
          {fin.budgets.map((b) => (
            <li key={b.category} className="flex justify-between gap-3">
              <span className={b.spent > b.limit ? "text-danger" : "text-muted"}>
                {b.category}: {Math.round((b.spent / b.limit) * 100)}% do orçamento
              </span>
              <span className="tabular-nums text-faint">{money(b.limit)}</span>
            </li>
          ))}
        </ul>
      </AttentionCard>,
    );
  }

  if (!cards.length) {
    return (
      <section className={`${cardClass} text-center`}>
        <p className="font-medium">Nada pedindo atenção</p>
        <p className="mt-1 text-sm text-muted">Propostas paradas, follow-ups, comentários e faturas aparecem aqui quando precisarem de você.</p>
      </section>
    );
  }
  return <>{cards}</>;
}
