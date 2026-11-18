import { useState } from "react";
import type { CrmTask } from "../../../types/orcamentos";
import { focusRing } from "../panelStyles";
import Icon from "../ui/Icon";
import { TASK_KIND_ICON, TASK_KIND_LABEL, dueLabel } from "./model";

const TONE: Record<string, string> = {
  late: "text-danger",
  today: "text-accent-text",
  soon: "text-ink",
  later: "text-muted",
  none: "text-faint",
};

/** Linha de tarefa: concluir com um toque, abrir para editar. */
export default function TaskRow({
  task,
  onToggle,
  onOpen,
  onOpenClient,
  showClient = true,
}: {
  task: CrmTask;
  onToggle: (t: CrmTask) => void;
  onOpen: (t: CrmTask) => void;
  onOpenClient?: (clientId: string) => void;
  showClient?: boolean;
}) {
  const [pop, setPop] = useState(false);
  const done = Boolean(task.doneAt);
  const due = dueLabel(task.dueAt, task.allDay);
  const related = task.clientName ?? task.leadName ?? task.proposalLabel;

  return (
    <li className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-sunken/50">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reabrir “${task.title}”` : `Concluir “${task.title}”`}
        onClick={() => {
          setPop(true);
          onToggle(task);
        }}
        onAnimationEnd={() => setPop(false)}
        className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition-colors ${focusRing} ${
          done ? "border-accent bg-accent text-accent-ink" : task.priority === 2 ? "border-danger/70 hover:bg-danger-soft" : "border-line-strong hover:border-accent hover:bg-accent-soft"
        } ${pop ? "adm-check" : ""}`}
      >
        {done ? <Icon d="M20 6 9 17l-5-5" className="size-3.5" /> : null}
      </button>
      <button type="button" onClick={() => onOpen(task)} className={`min-w-0 flex-1 rounded-md text-left ${focusRing}`}>
        <p className={`text-[15px] leading-snug sm:text-sm ${done ? "text-faint line-through decoration-faint/60" : "text-ink"}`}>{task.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <span className={`inline-flex items-center gap-1 ${done ? "text-faint" : TONE[due.tone]}`}>
            <Icon d={TASK_KIND_ICON[task.kind] ?? TASK_KIND_ICON.tarefa} className="size-3.5" />
            {task.kind !== "tarefa" ? `${TASK_KIND_LABEL[task.kind]} · ` : ""}
            {due.text}
          </span>
          {task.priority === 2 && !done ? <span className="rounded-full bg-danger-soft px-1.5 py-px text-[10px] font-medium text-danger">Alta</span> : null}
          {task.notes ? <Icon d="M4 6h16M4 12h16M4 18h10" className="size-3.5 text-faint" /> : null}
          {showClient && related ? <span className="truncate text-muted sm:hidden">· {related}</span> : null}
        </p>
      </button>
      {showClient && related ? (
        task.clientId && onOpenClient ? (
          <button
            type="button"
            onClick={() => onOpenClient(task.clientId!)}
            className={`mt-0.5 hidden max-w-[40%] shrink-0 truncate rounded-full bg-sunken px-2.5 py-1 text-xs text-muted hover:text-ink sm:block ${focusRing}`}
          >
            {related}
          </button>
        ) : (
          <span className="mt-0.5 hidden max-w-[40%] shrink-0 truncate rounded-full bg-sunken px-2.5 py-1 text-xs text-muted sm:block">{related}</span>
        )
      ) : null}
    </li>
  );
}
