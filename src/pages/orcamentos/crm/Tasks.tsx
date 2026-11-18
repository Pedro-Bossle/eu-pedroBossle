import { useCallback, useEffect, useMemo, useState } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmTask, OrcamentoClient } from "../../../types/orcamentos";
import { btnPrimary, cardClass, inputClass, pill } from "../panelStyles";
import Select from "../ui/Select";
import TaskRow from "./TaskRow";
import { TASK_KINDS, addDays, ymd, type TaskDraft } from "./model";

type Props = {
  clients: OrcamentoClient[];
  version: number;
  onOpenTask: (draft: TaskDraft | CrmTask) => void;
  onOpenClient: (id: string) => void;
  showToast: (m: string) => void;
};

/** Agrupa por prazo, na ordem em que o dia acontece. */
function bucket(t: CrmTask): string {
  if (!t.dueAt) return "Sem data";
  const k = ymd(new Date(t.dueAt));
  const today = ymd(new Date());
  if (k < today) return "Atrasadas";
  if (k === today) return "Hoje";
  if (k === ymd(addDays(new Date(), 1))) return "Amanhã";
  if (k <= ymd(addDays(new Date(), 7))) return "Próximos 7 dias";
  return "Mais tarde";
}
const ORDER = ["Atrasadas", "Hoje", "Amanhã", "Próximos 7 dias", "Mais tarde", "Sem data"];

export default function Tasks({ clients, version, onOpenTask, onOpenClient, showToast }: Props) {
  const [scope, setScope] = useState<"open" | "done">("open");
  const [tasks, setTasks] = useState<CrmTask[] | null>(null);
  const [kind, setKind] = useState("");
  const [clientId, setClientId] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      setTasks((await orcamentosApi.crmTasks({ scope })).tasks);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar tarefas");
      setTasks([]);
    }
  }, [scope, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const toggle = async (t: CrmTask) => {
    const done = !t.doneAt;
    setTasks((list) => list?.map((x) => (x.id === t.id ? { ...x, doneAt: done ? new Date().toISOString() : null } : x)) ?? null);
    try {
      const { next } = await orcamentosApi.crmToggleTask(t.id, done);
      window.setTimeout(() => setTasks((list) => [...(list?.filter((x) => x.id !== t.id) ?? []), ...(next ? [next] : [])]), 450);
      if (next) showToast(`Próxima: ${new Date(next.dueAt ?? "").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
      load();
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (tasks ?? []).filter(
      (t) =>
        (!kind || t.kind === kind) &&
        (!clientId || t.clientId === clientId) &&
        (!needle || `${t.title} ${t.notes} ${t.clientName ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [tasks, kind, clientId, q]);

  const groups = useMemo(() => {
    if (scope === "done") return [["Concluídas", filtered] as const];
    const m = new Map<string, CrmTask[]>();
    for (const t of filtered) m.set(bucket(t), [...(m.get(bucket(t)) ?? []), t]);
    return ORDER.filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as const);
  }, [filtered, scope]);

  return (
    <section className="space-y-5" aria-labelledby="tasks-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Rotina</p>
          <h1 id="tasks-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Tarefas
          </h1>
        </div>
        <button type="button" className={btnPrimary} onClick={() => onOpenTask({ title: "", dueAt: new Date().toISOString() })}>
          + Nova tarefa
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={pill(scope === "open")} aria-pressed={scope === "open"} onClick={() => setScope("open")}>
          Abertas
        </button>
        <button type="button" className={pill(scope === "done")} aria-pressed={scope === "done"} onClick={() => setScope("done")}>
          Concluídas
        </button>
        <div className="ml-auto grid w-full gap-2 sm:w-auto sm:grid-cols-[200px_180px_220px]">
          <input className={`${inputClass} min-h-9 py-1.5`} placeholder="Buscar tarefa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar tarefa" />
          <Select size="sm" ariaLabel="Tipo" value={kind} onChange={setKind} options={[{ value: "", label: "Todos os tipos" }, ...TASK_KINDS.map((k) => ({ value: k.value, label: k.label }))]} />
          <Select
            size="sm"
            ariaLabel="Cliente"
            value={clientId}
            onChange={setClientId}
            options={[{ value: "", label: "Todos os clientes" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
          />
        </div>
      </div>

      <div className={`${cardClass} p-3 sm:p-4`}>
        {!tasks ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-sunken/60 motion-reduce:animate-none" />
            ))}
          </div>
        ) : !filtered.length ? (
          <p className="px-3 py-12 text-center text-sm text-muted">
            {scope === "open" ? "Nenhuma tarefa aberta. Crie uma com o botão acima ou pelo atalho N." : "Nenhuma tarefa concluída ainda."}
          </p>
        ) : (
          groups.map(([title, list]) => (
            <div key={title} className="mb-2 last:mb-0">
              <p className={`px-2 pt-2 pb-1 text-xs font-semibold ${title === "Atrasadas" ? "text-danger" : "text-muted"}`}>
                {title} <span className="font-normal tabular-nums opacity-70">{list.length}</span>
              </p>
              <ul>
                {list.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} onOpen={onOpenTask} onOpenClient={onOpenClient} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
