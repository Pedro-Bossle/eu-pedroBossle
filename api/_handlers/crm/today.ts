import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { PoolClient } from "@neondatabase/serverless";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { TASK_COLS, TASK_FROM, mapTask } from "../../_lib/crm.js";

const TZ = "America/Sao_Paulo";
const TODAY = `(now() AT TIME ZONE '${TZ}')::date`;
const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));

/** Cada bloco roda isolado: se uma tabela ainda não existe (migration pendente), o resto continua. */
async function safe<T>(fn: (db: PoolClient) => Promise<T>): Promise<T | null> {
  try {
    return await withAuth(fn);
  } catch (e) {
    console.warn("crm today:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * GET crm/today → tudo que pede atenção hoje, numa chamada só:
 * tarefas (atrasadas, hoje, próximos 7 dias), clientes para contatar, propostas paradas,
 * funil, inbox, Instagram, faturas e indicadores do negócio.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const [tasks, contacts, proposals, funnel, inbox, instagram, finance, kpis] = await Promise.all([
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT ${TASK_COLS}, (t.due_at AT TIME ZONE '${TZ}')::date AS due_day FROM ${TASK_FROM}
         WHERE t.done_at IS NULL AND (t.due_at IS NULL OR (t.due_at AT TIME ZONE '${TZ}')::date <= ${TODAY} + 7)
         ORDER BY t.due_at ASC NULLS LAST, t.priority DESC LIMIT 200`,
      );
      const today = await db.query(`SELECT ${TODAY}::text AS d`);
      const d = String(today.rows[0]!.d);
      const doneToday = await db.query(
        `SELECT count(*)::int AS n FROM crm_tasks WHERE (done_at AT TIME ZONE '${TZ}')::date = ${TODAY}`,
      );
      const list = rows.map((r) => ({ ...mapTask(r), dueDay: r.due_day ? String(r.due_day instanceof Date ? r.due_day.toISOString().slice(0, 10) : r.due_day).slice(0, 10) : null }));
      return {
        today: d,
        overdue: list.filter((t) => t.dueDay && t.dueDay < d),
        dueToday: list.filter((t) => t.dueDay === d),
        upcoming: list.filter((t) => t.dueDay && t.dueDay > d),
        noDate: list.filter((t) => !t.dueDay).slice(0, 10),
        doneToday: Number(doneToday.rows[0]!.n),
      };
    }),
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT id, name, company, phone, email, next_contact_at, status FROM clients
         WHERE next_contact_at IS NOT NULL AND next_contact_at <= ${TODAY} AND status <> 'encerrado'
         ORDER BY next_contact_at LIMIT 20`,
      );
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        company: String(r.company ?? ""),
        phone: String(r.phone ?? ""),
        email: String(r.email ?? ""),
        nextContactAt: iso(r.next_contact_at)?.slice(0, 10) ?? null,
      }));
    }),
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT p.id, p.company, p.total, p.status, p.updated_at, c.name AS client_name, c.phone AS client_phone,
                EXTRACT(day FROM now() - p.updated_at)::int AS days
         FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
         WHERE p.status = 'Enviado' AND p.updated_at < now() - interval '4 days'
         ORDER BY p.updated_at LIMIT 10`,
      );
      return rows.map((r) => ({
        id: String(r.id),
        title: String(r.company || r.id),
        clientName: r.client_name ? String(r.client_name) : "",
        clientPhone: r.client_phone ? String(r.client_phone) : "",
        total: Number(r.total ?? 0),
        days: Number(r.days ?? 0),
      }));
    }),
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT
           count(*) FILTER (WHERE stage = 'aguardando')::int AS awaiting,
           count(*) FILTER (WHERE stage = 'enviado' AND stage_changed_at < now() - interval '3 days')::int AS followups,
           count(*) FILTER (WHERE stage = 'respondeu')::int AS replied,
           count(*) FILTER (WHERE stage = 'proposta')::int AS proposals
         FROM prospect_leads`,
      );
      return rows[0] as { awaiting: number; followups: number; replied: number; proposals: number };
    }),
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT id, name, idea, created_at FROM contact_leads WHERE read_at IS NULL ORDER BY created_at DESC LIMIT 5`,
      );
      const c = await db.query(`SELECT count(*)::int AS n FROM contact_leads WHERE read_at IS NULL`);
      return {
        unread: Number(c.rows[0]!.n),
        latest: rows.map((r) => ({ id: String(r.id), name: String(r.name), idea: String(r.idea ?? "").slice(0, 140), at: iso(r.created_at) })),
      };
    }),
    safe(async (db) => {
      const posts = await db.query(
        `SELECT id, kind, caption, scheduled_at, status, media_urls[1] AS thumb FROM ig_posts
         WHERE (status IN ('agendado', 'publicando') AND (scheduled_at AT TIME ZONE '${TZ}')::date = ${TODAY})
            OR status = 'erro'
         ORDER BY scheduled_at LIMIT 10`,
      );
      const c = await db.query(`SELECT count(*)::int AS n FROM ig_comments WHERE status = 'novo' AND NOT from_me`);
      const next = await db.query(
        `SELECT scheduled_at FROM ig_posts WHERE status = 'agendado' AND scheduled_at > now() ORDER BY scheduled_at LIMIT 1`,
      );
      return {
        posts: posts.rows.map((r) => ({
          id: String(r.id),
          kind: String(r.kind),
          caption: String(r.caption ?? "").slice(0, 120),
          at: iso(r.scheduled_at),
          status: String(r.status),
          thumb: String(r.thumb ?? ""),
        })),
        newComments: Number(c.rows[0]!.n),
        nextPostAt: iso(next.rows[0]?.scheduled_at),
      };
    }),
    safe(async (db) => {
      const bills = await db.query(
        `SELECT id, name, balance, bill_due_date FROM fin_accounts
         WHERE type = 'CREDIT' AND NOT hidden AND bill_due_date BETWEEN ${TODAY} AND ${TODAY} + 7 AND balance > 0
         ORDER BY bill_due_date`,
      );
      const over = await db.query(
        `SELECT b.category, b.monthly_limit, COALESCE(-sum(t.amount), 0) AS spent
         FROM fin_budgets b
         LEFT JOIN fin_transactions t ON t.category = b.category AND NOT t.ignored AND t.amount < 0
           AND to_char(t.date AT TIME ZONE '${TZ}', 'YYYY-MM') = to_char(now() AT TIME ZONE '${TZ}', 'YYYY-MM')
         GROUP BY b.category, b.monthly_limit
         HAVING COALESCE(-sum(t.amount), 0) > b.monthly_limit * 0.85`,
      );
      return {
        bills: bills.rows.map((r) => ({ id: String(r.id), name: String(r.name), amount: Number(r.balance), due: iso(r.bill_due_date)?.slice(0, 10) ?? null })),
        budgets: over.rows.map((r) => ({ category: String(r.category), limit: Number(r.monthly_limit), spent: Number(r.spent) })),
      };
    }),
    safe(async (db) => {
      const { rows } = await db.query(
        `SELECT
           (SELECT COALESCE(sum(monthly_value), 0) FROM clients WHERE status IN ('ativo', 'recorrente')) AS mrr,
           (SELECT count(*) FROM clients WHERE status IN ('ativo', 'recorrente'))::int AS active_clients,
           (SELECT COALESCE(sum(total), 0) FROM proposals WHERE status IN ('Em elaboração', 'Enviado')) AS pipeline,
           (SELECT COALESCE(sum(total), 0) FROM proposals WHERE status = 'Aprovado'
              AND to_char(updated_at AT TIME ZONE '${TZ}', 'YYYY-MM') = to_char(now() AT TIME ZONE '${TZ}', 'YYYY-MM')) AS won_month,
           (SELECT count(*) FROM proposals WHERE status = 'Aprovado')::int AS won_total,
           (SELECT count(*) FROM proposals WHERE status IN ('Aprovado', 'Recusado'))::int AS decided`,
      );
      const r = rows[0]!;
      return {
        mrr: Number(r.mrr),
        activeClients: Number(r.active_clients),
        pipeline: Number(r.pipeline),
        wonMonth: Number(r.won_month),
        winRate: Number(r.decided) ? Math.round((Number(r.won_total) / Number(r.decided)) * 100) : null,
      };
    }),
  ]);

  return json(res, 200, { tasks, contacts, proposals, funnel, inbox, instagram, finance, kpis });
}
