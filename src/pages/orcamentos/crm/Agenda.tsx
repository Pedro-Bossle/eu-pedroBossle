import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import { peek, remember } from "../../../lib/orcamentos/cache";
import type { CrmAgendaItem, CrmTask } from "../../../types/orcamentos";
import { btnSm, cardClass, focusRing, pill } from "../panelStyles";
import Icon from "../ui/Icon";
import { REPEAT_ICON, TASK_KIND_ICON, draftFromTask, ymd, type TaskDraft } from "./model";

type Props = {
  version: number;
  onOpenTask: (d: TaskDraft | CrmTask) => void;
  onOpenClient: (id: string) => void;
  onNavigate: (tab: "projects" | "instagram") => void;
  showToast: (m: string) => void;
};

/** Identidade por tipo: cor + ícone + legenda (nunca só a cor). */
const TYPES: Record<CrmAgendaItem["type"], { label: string; color: string; icon: string }> = {
  task: { label: "Tarefas", color: "#2a78d6", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  delivery: { label: "Entregas", color: "#6250d6", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" },
  payment: { label: "Cobranças", color: "#1baf7a", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  post: { label: "Instagram", color: "#e87ba4", icon: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" },
  contact: { label: "Contatos", color: "#eb6834", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" },
};
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function Agenda({ version, onOpenTask, onOpenClient, onNavigate, showToast }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [mode, setMode] = useState<"mes" | "lista">(() => (window.matchMedia("(min-width: 1024px)").matches ? "mes" : "lista"));
  const [items, setItems] = useState<CrmAgendaItem[] | null>(() => {
    const d = new Date();
    return peek<CrmAgendaItem[]>(`agenda:${d.getFullYear()}-${d.getMonth()}`);
  });
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState("");

  // Semanas completas (segunda a domingo) que cobrem o mês
  const days = useMemo(() => {
    const offset = (cursor.getDay() + 6) % 7;
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset);
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const count = Math.ceil((offset + last) / 7) * 7;
    return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const load = useCallback(async () => {
    try {
      const key = `agenda:${cursor.getFullYear()}-${cursor.getMonth()}`;
      setItems((prev) => peek<CrmAgendaItem[]>(key) ?? prev);
      setItems(remember(key, (await orcamentosApi.crmAgenda(ymd(days[0]!), ymd(days.at(-1)!))).items));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar a agenda");
      setItems([]);
    }
  }, [days, cursor, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const visible = useMemo(() => (items ?? []).filter((i) => !hidden.has(i.type)), [items, hidden]);
  const byDay = useMemo(() => {
    const m = new Map<string, CrmAgendaItem[]>();
    for (const i of visible) m.set(i.day, [...(m.get(i.day) ?? []), i]);
    return m;
  }, [visible]);

  const open = (i: CrmAgendaItem) => {
    if (i.type === "task" && i.task) onOpenTask(i.task);
    else if (i.type === "delivery") onNavigate("projects");
    else if (i.type === "post") onNavigate("instagram");
    else if (i.clientId) onOpenClient(i.clientId);
  };

  const onDrop = async (e: DragEvent, day: string) => {
    e.preventDefault();
    setDragOver("");
    const item = items?.find((x) => x.key === e.dataTransfer.getData("text/agenda"));
    if (!item?.task || item.day === day) return;
    const t = item.task;
    const time = t.dueAt && !t.allDay ? new Date(t.dueAt).toTimeString().slice(0, 5) : "09:00";
    const dueAt = new Date(`${day}T${time}:00`).toISOString();
    setItems((l) => l?.map((x) => (x.key === item.key ? { ...x, day } : x)) ?? null);
    try {
      await orcamentosApi.crmSaveTask({ ...draftFromTask(t), dueAt });
      showToast(`Movida para ${new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric" })}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao mover");
      load();
    }
  };

  const today = ymd(new Date());
  const raw = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items ?? []) if (!i.done) m.set(i.type, (m.get(i.type) ?? 0) + 1);
    return m;
  }, [items]);

  // Função de render (não componente) para não remontar a cada render
  const chip = (i: CrmAgendaItem) => {
    const t = TYPES[i.type];
    return (
      <button
        type="button"
        draggable={i.type === "task" && !i.done}
        onDragStart={(e) => e.dataTransfer.setData("text/agenda", i.key)}
        onClick={() => open(i)}
        title={`${t.label}: ${i.title}${i.sub ? ` · ${i.sub}` : ""}`}
        className={`flex w-full items-center gap-1.5 truncate rounded-md border-l-[3px] bg-sunken/70 px-1.5 py-0.5 text-left text-[11px] leading-tight hover:bg-sunken ${focusRing} ${
          i.done ? "text-faint line-through" : "text-ink"
        }`}
        style={{ borderLeftColor: t.color }}
      >
        {i.time ? <span className="shrink-0 tabular-nums text-muted">{i.time}</span> : null}
        <span className="truncate">{i.title}</span>
      </button>
    );
  };

  return (
    <section className="space-y-5" aria-labelledby="agenda-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Rotina</p>
          <h1 id="agenda-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Agenda
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btnSm} onClick={() => shift(-1)} aria-label="Mês anterior">
            ←
          </button>
          <button
            type="button"
            className={btnSm}
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Hoje
          </button>
          <button type="button" className={btnSm} onClick={() => shift(1)} aria-label="Próximo mês">
            →
          </button>
          <span className="ml-1 text-sm font-medium sm:ml-2 sm:min-w-36">{title}</span>
          <div className="flex rounded-lg bg-sunken/70 p-0.5 text-xs sm:ml-2" role="group" aria-label="Visualização">
            {(
              [
                ["mes", "Mês"],
                ["lista", "Lista"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`rounded-md px-2.5 py-1 ${focusRing} ${mode === id ? "bg-surface font-medium text-ink shadow-sm" : "text-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Legenda = filtro */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mostrar na agenda">
        {(Object.keys(TYPES) as CrmAgendaItem["type"][]).map((k) => {
          const on = !hidden.has(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setHidden((h) => {
                  const n = new Set(h);
                  if (n.has(k)) n.delete(k);
                  else n.add(k);
                  return n;
                })
              }
              className={`${pill(false)} ${on ? "" : "opacity-45"}`}
            >
              <span className="size-2.5 rounded-sm" style={{ background: TYPES[k].color }} />
              <Icon d={TYPES[k].icon} className="size-3.5" />
              {TYPES[k].label}
              {counts.get(k) ? <span className="tabular-nums text-faint">{counts.get(k)}</span> : null}
            </button>
          );
        })}
      </div>

      {!items ? (
        <div className="h-96 animate-pulse rounded-2xl bg-sunken/70 motion-reduce:animate-none" />
      ) : mode === "mes" ? (
        <div className={`${cardClass} overflow-hidden p-0 xl:p-0`}>
          <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const k = ymd(d);
              const list = byDay.get(k) ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(k);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === k ? "" : v))}
                  onDrop={(e) => onDrop(e, k)}
                  className={`group min-h-28 border-r border-b border-line/70 p-1.5 ${inMonth ? "" : "bg-sunken/30"} ${dragOver === k ? "bg-accent-soft" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                        k === today ? "bg-accent font-semibold text-accent-ink" : inMonth ? "text-ink" : "text-faint"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {k >= today ? (
                      <button
                        type="button"
                        aria-label={`Nova tarefa em ${d.toLocaleDateString("pt-BR")}`}
                        onClick={() => onOpenTask({ title: "", dueAt: new Date(`${k}T09:00:00`).toISOString() })}
                        className={`size-6 rounded-full text-sm text-faint opacity-0 group-hover:opacity-100 hover:bg-sunken hover:text-ink focus:opacity-100 ${focusRing}`}
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 4).map((i) => (
                      <div key={i.key}>{chip(i)}</div>
                    ))}
                    {list.length > 4 ? (
                      <button type="button" className="px-1 text-[11px] text-muted hover:text-ink" onClick={() => setMode("lista")}>
                        +{list.length - 4} mais
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="px-4 py-2.5 text-[11px] text-faint">Arraste uma tarefa para outro dia para reagendar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...byDay.entries()]
            .filter(([k]) => k.slice(0, 7) === ymd(cursor).slice(0, 7))
            .map(([k, list]) => {
              const d = new Date(`${k}T12:00:00`);
              const label = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
              return (
                <section key={k} className={`${cardClass} p-3 sm:p-4 ${k === today ? "ring-2 ring-accent/40" : ""}`}>
                  <h2 className={`mb-2 px-1 text-sm font-semibold ${k < today ? "text-muted" : ""}`}>
                    {k === today ? "Hoje · " : ""}
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </h2>
                  <ul className="divide-y divide-line">
                    {list.map((i) => {
                      const t = TYPES[i.type];
                      return (
                        <li key={i.key}>
                          <button type="button" onClick={() => open(i)} className={`flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-sunken/40 ${focusRing}`}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${t.color}1f`, color: t.color }}>
                              <Icon d={i.type === "task" && i.task ? TASK_KIND_ICON[i.task.kind] ?? t.icon : t.icon} className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${i.done ? "text-faint line-through" : "font-medium"}`}>{i.title}</span>
                              <span className="flex items-center gap-1.5 truncate text-xs text-faint">
                                {t.label}
                                {i.sub ? ` · ${i.sub}` : ""}
                                {i.task?.repeat && i.task.repeat !== "none" ? <Icon d={REPEAT_ICON} className="size-3" /> : null}
                              </span>
                            </span>
                            {i.time ? <span className="shrink-0 text-xs tabular-nums text-muted">{i.time}</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          {![...byDay.keys()].some((k) => k.slice(0, 7) === ymd(cursor).slice(0, 7)) ? (
            <p className={`${cardClass} text-center text-sm text-muted`}>Nada com data neste mês.</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
