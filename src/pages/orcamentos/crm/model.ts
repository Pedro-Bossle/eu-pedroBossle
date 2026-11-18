import { parsePhone } from "../../../lib/orcamentos/prospects";
import type { ClientStatus, CrmActivityKind, CrmTask, CrmTaskInput, CrmTaskKind } from "../../../types/orcamentos";

export const TASK_KINDS: { value: CrmTaskKind; label: string; icon: string }[] = [
  { value: "tarefa", label: "Tarefa", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { value: "follow-up", label: "Follow-up", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { value: "ligacao", label: "Ligação", icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" },
  { value: "reuniao", label: "Reunião", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
  { value: "entrega", label: "Entrega", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12" },
  { value: "cobranca", label: "Cobrança", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
];
export const TASK_KIND_LABEL = Object.fromEntries(TASK_KINDS.map((k) => [k.value, k.label])) as Record<CrmTaskKind, string>;
export const TASK_KIND_ICON = Object.fromEntries(TASK_KINDS.map((k) => [k.value, k.icon])) as Record<CrmTaskKind, string>;

export const REPEATS = [
  { value: "none", label: "Não repetir" },
  { value: "daily", label: "Todo dia" },
  { value: "weekdays", label: "Dias úteis" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo mês" },
];
export const REPEAT_LABEL = Object.fromEntries(REPEATS.map((r) => [r.value, r.label])) as Record<string, string>;
export const REPEAT_ICON = "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3";

export const PRIORITIES = [
  { value: "0", label: "Baixa" },
  { value: "1", label: "Normal" },
  { value: "2", label: "Alta" },
];

export const ACTIVITY_KINDS: { value: CrmActivityKind; label: string; icon: string }[] = [
  { value: "nota", label: "Nota", icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" },
  { value: "whatsapp", label: "WhatsApp", icon: TASK_KINDS[1]!.icon },
  { value: "ligacao", label: "Ligação", icon: TASK_KINDS[2]!.icon },
  { value: "reuniao", label: "Reunião", icon: TASK_KINDS[3]!.icon },
  { value: "email", label: "E-mail", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" },
  { value: "entrega", label: "Entrega", icon: TASK_KINDS[4]!.icon },
  { value: "pagamento", label: "Pagamento", icon: TASK_KINDS[5]!.icon },
];
export const ACTIVITY_LABEL = Object.fromEntries(ACTIVITY_KINDS.map((k) => [k.value, k.label])) as Record<CrmActivityKind, string>;
export const ACTIVITY_ICON = Object.fromEntries(ACTIVITY_KINDS.map((k) => [k.value, k.icon])) as Record<CrmActivityKind, string>;

export const CLIENT_STATUSES: { value: ClientStatus; label: string; dot: string; chip: string }[] = [
  { value: "lead", label: "Lead", dot: "#2a78d6", chip: "bg-sky-500/10 text-sky-800 dark:text-sky-300" },
  { value: "ativo", label: "Ativo", dot: "#1f9d6a", chip: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" },
  { value: "recorrente", label: "Recorrente", dot: "#6250d6", chip: "bg-violet-500/10 text-violet-800 dark:text-violet-300" },
  { value: "pausado", label: "Pausado", dot: "#d97706", chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300" },
  { value: "encerrado", label: "Encerrado", dot: "#8a93a0", chip: "bg-sunken text-muted" },
];
export const clientStatus = (s?: string) => CLIENT_STATUSES.find((x) => x.value === s) ?? CLIENT_STATUSES[1]!;

// ---------- Datas ----------

/** YYYY-MM-DD no fuso local. */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Data de vencimento legível: "Hoje", "Amanhã", "Ontem", "seg, 24 nov"… */
export function dueLabel(dueAt: string | null, allDay = true): { text: string; tone: "late" | "today" | "soon" | "later" | "none" } {
  if (!dueAt) return { text: "Sem data", tone: "none" };
  const d = new Date(dueAt);
  const today = ymd(new Date());
  const key = ymd(d);
  const time = allDay ? "" : ` · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  if (key === today) return { text: `Hoje${time}`, tone: "today" };
  if (key === ymd(addDays(new Date(), 1))) return { text: `Amanhã${time}`, tone: "soon" };
  if (key === ymd(addDays(new Date(), -1))) return { text: `Ontem${time}`, tone: "late" };
  const label = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "");
  return { text: `${label}${time}`, tone: key < today ? "late" : "later" };
}

export const relTime = (iso: string | null) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};

// ---------- Contato ----------

export function waLink(phone: string, text = "") {
  const p = parsePhone(phone);
  return p ? `https://wa.me/${p.wa}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;
}
export const telLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 ? `tel:+55${d.replace(/^55/, "")}` : null;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (n: number) => brl.format(n);

/** Valor inicial do editor (nova tarefa ou edição). */
export type TaskDraft = CrmTaskInput & { id?: string };

export function draftFromTask(t: CrmTask): TaskDraft {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    kind: t.kind,
    priority: t.priority,
    dueAt: t.dueAt,
    allDay: t.allDay,
    repeat: t.repeat ?? "none",
    clientId: t.clientId,
    proposalId: t.proposalId,
    leadId: t.leadId,
  };
}

