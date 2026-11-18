import { useState } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmTask, CrmTaskKind, CrmTaskRepeat, OrcamentoClient } from "../../../types/orcamentos";
import { btn, btnDanger, btnPrimary, focusRing, inputClass, labelClass, textareaClass } from "../panelStyles";
import Select from "../ui/Select";
import Sheet from "../ui/Sheet";
import { PRIORITIES, REPEATS, TASK_KINDS, addDays, ymd, type TaskDraft } from "./model";

const splitDue = (iso: string | null | undefined, allDay: boolean | undefined) => {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return { date: ymd(d), time: allDay === false ? d.toTimeString().slice(0, 5) : "" };
};

export default function TaskEditor({
  initial,
  clients,
  onClose,
  onSaved,
  onDeleted,
  showToast,
}: {
  initial: TaskDraft;
  clients: OrcamentoClient[];
  onClose: () => void;
  onSaved: (t: CrmTask) => void;
  onDeleted?: (id: string) => void;
  showToast: (m: string) => void;
}) {
  const start = splitDue(initial.dueAt, initial.allDay);
  const [title, setTitle] = useState(initial.title ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [kind, setKind] = useState<CrmTaskKind>(initial.kind ?? "tarefa");
  const [priority, setPriority] = useState(String(initial.priority ?? 1));
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [repeat, setRepeat] = useState<CrmTaskRepeat>(initial.repeat ?? "none");
  const [busy, setBusy] = useState(false);

  const quick = [
    { label: "Hoje", value: ymd(new Date()) },
    { label: "Amanhã", value: ymd(addDays(new Date(), 1)) },
    { label: "Em 3 dias", value: ymd(addDays(new Date(), 3)) },
    { label: "Próx. semana", value: ymd(addDays(new Date(), 7)) },
    { label: "Sem data", value: "" },
  ];

  const save = async () => {
    if (!title.trim()) return showToast("Dê um título para a tarefa");
    setBusy(true);
    try {
      const dueAt = date ? new Date(`${date}T${time || "09:00"}:00`).toISOString() : null;
      const { task } = await orcamentosApi.crmSaveTask({
        id: initial.id,
        title: title.trim(),
        notes,
        kind,
        priority: Number(priority),
        dueAt,
        allDay: !time,
        repeat: date ? repeat : "none",
        clientId: clientId || null,
        proposalId: initial.proposalId ?? null,
        leadId: initial.leadId ?? null,
      });
      onSaved(task);
      showToast(initial.id ? "Tarefa atualizada" : "Tarefa criada");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial.id || !window.confirm("Excluir esta tarefa?")) return;
    setBusy(true);
    try {
      await orcamentosApi.crmDeleteTask(initial.id);
      onDeleted?.(initial.id);
      showToast("Tarefa excluída");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir");
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={initial.id ? "Editar tarefa" : "Nova tarefa"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" className={`${btnPrimary} flex-1 sm:flex-none`} disabled={busy} onClick={save}>
            {busy ? "Salvando…" : initial.id ? "Salvar" : "Criar tarefa"}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancelar
          </button>
          {initial.id ? (
            <button type="button" className={`${btnDanger} ml-auto`} disabled={busy} onClick={remove}>
              Excluir
            </button>
          ) : null}
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="block">
          <span className={labelClass}>O que precisa ser feito</span>
          <input
            autoFocus
            className={`${inputClass} mt-2 text-base`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Mandar o layout da home para a Cafeteria Grão"
          />
        </label>

        <div>
          <span className={labelClass}>Tipo</span>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo">
            {TASK_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${focusRing} ${
                  kind === k.value ? "border-transparent bg-ink text-canvas" : "border-line text-muted hover:text-ink"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Quando</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setDate(q.value)}
                aria-pressed={date === q.value}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${focusRing} ${
                  date === q.value ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:text-ink"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data" />
            <input
              type="time"
              className={inputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date}
              aria-label="Horário (opcional)"
            />
            <div className="col-span-2 sm:col-span-1">
              <Select ariaLabel="Repetir" disabled={!date} value={repeat} onChange={(v) => setRepeat(v as CrmTaskRepeat)} options={REPEATS} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>Cliente</span>
            <div className="mt-2">
              <Select
                ariaLabel="Cliente"
                searchable
                value={clientId}
                onChange={setClientId}
                options={[{ value: "", label: "Nenhum" }, ...clients.map((c) => ({ value: c.id, label: c.name, hint: c.company }))]}
              />
            </div>
          </div>
          <div>
            <span className={labelClass}>Prioridade</span>
            <div className="mt-2">
              <Select ariaLabel="Prioridade" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ ...p, dot: p.value === "2" ? "#d03b3b" : p.value === "0" ? "#a3abb6" : undefined }))} />
            </div>
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>Detalhes</span>
          <textarea className={`${textareaClass} mt-2 min-h-28`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Links, contexto, o que foi combinado…" />
        </label>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
