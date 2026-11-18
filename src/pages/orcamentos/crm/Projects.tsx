import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmProject, CrmProjectStage, OrcamentoClient } from "../../../types/orcamentos";
import { btn, btnDanger, btnPrimary, focusRing, inputClass, labelClass, pill, textareaClass } from "../panelStyles";
import { parseMoney } from "../money";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import Sheet from "../ui/Sheet";
import { money, ymd, type TaskDraft } from "./model";

const STAGES: { value: CrmProjectStage; label: string; hint: string }[] = [
  { value: "briefing", label: "Briefing", hint: "Conteúdo, acessos e referências" },
  { value: "layout", label: "Layout", hint: "Design para aprovação" },
  { value: "desenvolvimento", label: "Desenvolvimento", hint: "Mão na massa" },
  { value: "revisao", label: "Revisão", hint: "Ajustes com o cliente" },
  { value: "publicado", label: "Publicado", hint: "No ar" },
];
const STAGE_LABEL: Record<string, string> = { ...Object.fromEntries(STAGES.map((s) => [s.value, s.label])), pausado: "Pausado" };

const fmtDue = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "");

type Props = {
  clients: OrcamentoClient[];
  onOpenClient: (id: string) => void;
  onOpenTask: (d: TaskDraft) => void;
  showToast: (m: string) => void;
};

/** Quadro de projetos por etapa. Arraste o cartão (desktop) ou use o menu de etapa (celular). */
export default function Projects({ clients, onOpenClient, onOpenTask, showToast }: Props) {
  const [projects, setProjects] = useState<CrmProject[] | null>(null);
  const [editing, setEditing] = useState<Partial<CrmProject> | null>(null);
  const [dragOver, setDragOver] = useState("");
  const [showPaused, setShowPaused] = useState(false);

  const load = useCallback(async () => {
    try {
      setProjects((await orcamentosApi.crmProjects()).projects);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar projetos");
      setProjects([]);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const move = async (p: CrmProject, stage: CrmProjectStage) => {
    if (p.stage === stage) return;
    setProjects((l) => l?.map((x) => (x.id === p.id ? { ...x, stage } : x)) ?? null);
    try {
      await orcamentosApi.crmMoveProject(p.id, stage);
      if (stage === "publicado") showToast(`${p.title} publicado 🎉`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao mover");
      load();
    }
  };

  const byStage = useMemo(() => {
    const m = new Map<string, CrmProject[]>();
    for (const p of projects ?? []) m.set(p.stage, [...(m.get(p.stage) ?? []), p]);
    return m;
  }, [projects]);

  const today = ymd(new Date());
  const active = (projects ?? []).filter((p) => p.stage !== "publicado" && p.stage !== "pausado");
  const inProgressValue = active.reduce((s, p) => s + p.value, 0);
  const paused = byStage.get("pausado") ?? [];

  const onDrop = (e: DragEvent, stage: CrmProjectStage) => {
    e.preventDefault();
    setDragOver("");
    const p = projects?.find((x) => x.id === e.dataTransfer.getData("text/project"));
    if (p) move(p, stage);
  };

  return (
    <section className="space-y-5" aria-labelledby="projects-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Entregas</p>
          <h1 id="projects-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Projetos
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {active.length} em andamento · {money(inProgressValue)}
          </p>
        </div>
        <div className="flex gap-2">
          {paused.length ? (
            <button type="button" className={pill(showPaused)} aria-pressed={showPaused} onClick={() => setShowPaused((v) => !v)}>
              Pausados {paused.length}
            </button>
          ) : null}
          <button type="button" className={btnPrimary} onClick={() => setEditing({ title: "", stage: "briefing" })}>
            + Projeto
          </button>
        </div>
      </header>

      {!projects ? (
        <div className="h-72 animate-pulse rounded-2xl bg-sunken/70 motion-reduce:animate-none" />
      ) : (
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {(showPaused ? [...STAGES, { value: "pausado" as const, label: "Pausado", hint: "Esperando o cliente" }] : STAGES).map((s) => {
            const list = byStage.get(s.value) ?? [];
            return (
              <div
                key={s.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(s.value);
                }}
                onDragLeave={() => setDragOver((v) => (v === s.value ? "" : v))}
                onDrop={(e) => onDrop(e, s.value)}
                className={`flex w-[78vw] shrink-0 snap-start flex-col rounded-2xl border p-2 transition-colors sm:w-72 lg:w-auto ${
                  dragOver === s.value ? "border-accent bg-accent-soft" : "border-line bg-sunken/40"
                }`}
              >
                <div className="px-2 pt-1 pb-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {s.label} <span className="font-normal text-faint tabular-nums">{list.length}</span>
                  </p>
                  <p className="text-[11px] text-faint">{s.hint}</p>
                </div>
                <ul className="flex min-h-24 flex-1 flex-col gap-2">
                  {list.map((p) => {
                    const late = p.dueDate && p.dueDate < today && p.stage !== "publicado";
                    return (
                      <li
                        key={p.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/project", p.id)}
                        className="group cursor-grab rounded-xl border border-line bg-surface p-3 shadow-[0_1px_2px_rgb(24_32_42/0.04)] active:cursor-grabbing"
                      >
                        <button type="button" onClick={() => setEditing(p)} className={`block w-full rounded-md text-left ${focusRing}`}>
                          <p className="text-sm font-medium leading-snug">{p.title}</p>
                          {p.clientName ? <p className="mt-0.5 truncate text-xs text-muted">{p.clientName}</p> : null}
                        </button>
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                          {p.dueDate ? (
                            <span className={`inline-flex items-center gap-1 ${late ? "font-medium text-danger" : "text-faint"}`}>
                              <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" className="size-3" />
                              {fmtDue(p.dueDate)}
                            </span>
                          ) : null}
                          {p.value ? <span className="text-faint tabular-nums">{money(p.value)}</span> : null}
                          {p.openTasks ? <span className="text-faint">{p.openTasks} {p.openTasks === 1 ? "tarefa" : "tarefas"}</span> : null}
                        </div>
                        {/* Celular: mover sem arrastar */}
                        <div className="mt-2 lg:hidden">
                          <Select
                            size="sm"
                            ariaLabel={`Etapa de ${p.title}`}
                            value={p.stage}
                            onChange={(v) => move(p, v as CrmProjectStage)}
                            options={[...STAGES, { value: "pausado", label: "Pausado" }].map((x) => ({ value: x.value, label: x.label }))}
                          />
                        </div>
                      </li>
                    );
                  })}
                  {!list.length ? <li className="grid flex-1 place-items-center rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-faint">Arraste um projeto para cá</li> : null}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-faint">Propostas aprovadas viram projeto automaticamente, em Briefing.</p>

      {editing ? (
        <ProjectEditor
          initial={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSaved={(p) => setProjects((l) => [p, ...(l?.filter((x) => x.id !== p.id) ?? [])])}
          onDeleted={(id) => setProjects((l) => l?.filter((x) => x.id !== id) ?? null)}
          onOpenClient={onOpenClient}
          onOpenTask={onOpenTask}
          showToast={showToast}
        />
      ) : null}
    </section>
  );
}

function ProjectEditor({
  initial,
  clients,
  onClose,
  onSaved,
  onDeleted,
  onOpenClient,
  onOpenTask,
  showToast,
}: {
  initial: Partial<CrmProject>;
  clients: OrcamentoClient[];
  onClose: () => void;
  onSaved: (p: CrmProject) => void;
  onDeleted: (id: string) => void;
  onOpenClient: (id: string) => void;
  onOpenTask: (d: TaskDraft) => void;
  showToast: (m: string) => void;
}) {
  const [f, setF] = useState({
    title: initial.title ?? "",
    clientId: initial.clientId ?? "",
    stage: (initial.stage ?? "briefing") as CrmProjectStage,
    dueDate: initial.dueDate ?? "",
    value: initial.value ? String(initial.value) : "",
    link: initial.link ?? "",
    notes: initial.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const save = async () => {
    if (!f.title.trim()) return showToast("Dê um nome ao projeto");
    setBusy(true);
    try {
      const { project } = await orcamentosApi.crmSaveProject({
        id: initial.id,
        title: f.title.trim(),
        clientId: f.clientId || null,
        stage: f.stage,
        dueDate: f.dueDate || null,
        value: parseMoney(f.value),
        link: f.link,
        notes: f.notes,
      });
      onSaved(project);
      showToast(initial.id ? "Projeto atualizado" : "Projeto criado");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial.id || !window.confirm("Excluir este projeto do quadro?")) return;
    await orcamentosApi.crmDeleteProject(initial.id);
    onDeleted(initial.id);
    onClose();
  };

  return (
    <Sheet
      title={initial.id ? f.title || "Projeto" : "Novo projeto"}
      subtitle={initial.id ? STAGE_LABEL[f.stage] : undefined}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancelar
          </button>
          {initial.id ? (
            <button type="button" className={`${btnDanger} ml-auto`} onClick={remove}>
              Excluir
            </button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {initial.id ? (
          <div className="flex flex-wrap gap-2">
            {initial.clientId ? (
              <button type="button" className={btn} onClick={() => { onClose(); onOpenClient(initial.clientId!); }}>
                Abrir cliente
              </button>
            ) : null}
            <button
              type="button"
              className={btn}
              onClick={() => {
                onClose();
                onOpenTask({ title: `${f.title}: `, kind: "entrega", clientId: initial.clientId ?? null, proposalId: initial.proposalId ?? null, dueAt: f.dueDate ? new Date(`${f.dueDate}T09:00:00`).toISOString() : new Date().toISOString() });
              }}
            >
              + Tarefa de entrega
            </button>
            {f.link ? (
              <a href={/^https?:/.test(f.link) ? f.link : `https://${f.link}`} target="_blank" rel="noreferrer" className={btn}>
                Abrir link
              </a>
            ) : null}
          </div>
        ) : null}
        <label className="block">
          <span className={labelClass}>Projeto</span>
          <input autoFocus className={`${inputClass} mt-2`} value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex.: Site institucional da Cafeteria Grão" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={labelClass}>Cliente</span>
            <div className="mt-2">
              <Select ariaLabel="Cliente" searchable value={f.clientId} onChange={(v) => set({ clientId: v })} options={[{ value: "", label: "Nenhum" }, ...clients.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
          <div>
            <span className={labelClass}>Etapa</span>
            <div className="mt-2">
              <Select ariaLabel="Etapa" value={f.stage} onChange={(v) => set({ stage: v as CrmProjectStage })} options={[...STAGES, { value: "pausado", label: "Pausado" }].map((s) => ({ value: s.value, label: s.label }))} />
            </div>
          </div>
          <label className="block">
            <span className={labelClass}>Prazo de entrega</span>
            <input type="date" className={`${inputClass} mt-2`} value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
          </label>
          <label className="block">
            <span className={labelClass}>Valor</span>
            <input className={`${inputClass} mt-2`} inputMode="decimal" value={f.value} onChange={(e) => set({ value: e.target.value })} placeholder="R$ 0,00" />
          </label>
        </div>
        <label className="block">
          <span className={labelClass}>Link (Figma, repositório, site de teste…)</span>
          <input className={`${inputClass} mt-2`} value={f.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://" />
        </label>
        <label className="block">
          <span className={labelClass}>Notas</span>
          <textarea className={`${textareaClass} mt-2 !min-h-28`} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Acessos, decisões, pendências do cliente…" />
        </label>
      </div>
    </Sheet>
  );
}
