const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

export const TASK_KINDS = ["tarefa", "follow-up", "reuniao", "ligacao", "entrega", "cobranca"] as const;
export const ACTIVITY_KINDS = ["nota", "ligacao", "reuniao", "email", "whatsapp", "pagamento", "entrega"] as const;

export const TASK_COLS = `t.id, t.title, t.notes, t.kind, t.priority, t.due_at, t.all_day, t.done_at,
  t.client_id, t.proposal_id, t.lead_id, t.created_at,
  c.name AS client_name, COALESCE(NULLIF(p.company, ''), p.id) AS proposal_label, l.name AS lead_name`;
export const TASK_FROM = `crm_tasks t
  LEFT JOIN clients c ON c.id = t.client_id
  LEFT JOIN proposals p ON p.id = t.proposal_id
  LEFT JOIN prospect_leads l ON l.id = t.lead_id`;

export function mapTask(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    notes: String(r.notes ?? ""),
    kind: String(r.kind ?? "tarefa"),
    priority: Number(r.priority ?? 1),
    dueAt: iso(r.due_at),
    allDay: Boolean(r.all_day),
    doneAt: iso(r.done_at),
    clientId: r.client_id ? String(r.client_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    proposalId: r.proposal_id ? String(r.proposal_id) : null,
    proposalLabel: r.proposal_label ? String(r.proposal_label) : null,
    leadId: r.lead_id ? String(r.lead_id) : null,
    leadName: r.lead_name ? String(r.lead_name) : null,
    created: iso(r.created_at),
  };
}

export function mapActivity(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    kind: String(r.kind ?? "nota"),
    body: String(r.body ?? ""),
    at: iso(r.at),
  };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
