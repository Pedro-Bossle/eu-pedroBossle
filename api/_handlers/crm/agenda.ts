import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { PoolClient } from "@neondatabase/serverless";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { TASK_COLS, TASK_FROM, mapTask } from "../../_lib/crm.js";
import { dayStart } from "../../_lib/sqlTime.js";

const TZ = "America/Sao_Paulo";
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const ymd = (v: unknown) => iso(v)?.slice(0, 10) ?? "";

type Item = {
  key: string;
  type: "task" | "delivery" | "payment" | "post" | "contact";
  day: string;
  time: string | null;
  title: string;
  sub: string;
  done: boolean;
  ref: string;
  clientId: string | null;
  task?: ReturnType<typeof mapTask>;
};

async function part(db: PoolClient, fn: () => Promise<Item[]>): Promise<Item[]> {
  await db.query("SAVEPOINT a");
  try {
    const r = await fn();
    await db.query("RELEASE SAVEPOINT a");
    return r;
  } catch {
    await db.query("ROLLBACK TO SAVEPOINT a"); // tabela de um módulo ainda não migrado
    return [];
  }
}

/** GET crm/agenda?from=YYYY-MM-DD&to=YYYY-MM-DD → tudo que tem data no período, num formato só. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  const from = String(req.query.from ?? "");
  const to = String(req.query.to ?? "");
  if (!DAY.test(from) || !DAY.test(to)) return json(res, 400, { error: "from/to obrigatórios (YYYY-MM-DD)" });

  try {
    const items = await withAuth(async (db) => {
      const local = (col: string) => `(${col} AT TIME ZONE '${TZ}')`;
      const out: Item[] = [];
      out.push(
        ...(await part(db, async () => {
          const { rows } = await db.query(
            `SELECT ${TASK_COLS}, to_char(${local("t.due_at")}, 'YYYY-MM-DD') AS d, to_char(${local("t.due_at")}, 'HH24:MI') AS hm
             FROM ${TASK_FROM} WHERE t.due_at >= ${dayStart("$1::date")} AND t.due_at < ${dayStart("$2::date + 1")}`,
            [from, to],
          );
          return rows.map((r) => {
            const task = mapTask(r);
            return {
              key: `t-${task.id}`,
              type: "task" as const,
              day: String(r.d),
              time: task.allDay ? null : String(r.hm),
              title: task.title,
              sub: task.clientName ?? task.leadName ?? "",
              done: Boolean(task.doneAt),
              ref: task.id,
              clientId: task.clientId,
              task,
            };
          });
        })),
        ...(await part(db, async () => {
          const { rows } = await db.query(
            `SELECT pr.id, pr.title, pr.stage, pr.due_date, pr.client_id, c.name AS client_name
             FROM crm_projects pr LEFT JOIN clients c ON c.id = pr.client_id
             WHERE pr.due_date BETWEEN $1 AND $2 AND pr.stage <> 'pausado'`,
            [from, to],
          );
          return rows.map((r) => ({
            key: `d-${r.id}`,
            type: "delivery" as const,
            day: ymd(r.due_date),
            time: null,
            title: `Entrega: ${r.title}`,
            sub: String(r.client_name ?? ""),
            done: r.stage === "publicado",
            ref: String(r.id),
            clientId: r.client_id ? String(r.client_id) : null,
          }));
        })),
        ...(await part(db, async () => {
          const { rows } = await db.query(
            `SELECT p.id, p.description, p.amount, p.due_date, p.paid_at, p.client_id, c.name AS client_name
             FROM crm_payments p JOIN clients c ON c.id = p.client_id WHERE p.due_date BETWEEN $1 AND $2`,
            [from, to],
          );
          return rows.map((r) => ({
            key: `p-${r.id}`,
            type: "payment" as const,
            day: ymd(r.due_date),
            time: null,
            title: `${r.client_name}: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(r.amount))}`,
            sub: String(r.description ?? ""),
            done: Boolean(r.paid_at),
            ref: String(r.id),
            clientId: String(r.client_id),
          }));
        })),
        ...(await part(db, async () => {
          const { rows } = await db.query(
            `SELECT id, kind, caption, status, to_char(${local("COALESCE(published_at, scheduled_at)")}, 'YYYY-MM-DD') AS d,
                    to_char(${local("COALESCE(published_at, scheduled_at)")}, 'HH24:MI') AS hm
             FROM ig_posts
             WHERE status <> 'rascunho' AND (
               (published_at >= ${dayStart("$1::date")} AND published_at < ${dayStart("$2::date + 1")})
               OR (published_at IS NULL AND scheduled_at >= ${dayStart("$1::date")} AND scheduled_at < ${dayStart("$2::date + 1")}))`,
            [from, to],
          );
          return rows.map((r) => ({
            key: `ig-${r.id}`,
            type: "post" as const,
            day: String(r.d),
            time: String(r.hm),
            title: String(r.caption || "Post").slice(0, 80),
            sub: r.status === "erro" ? "Erro ao publicar" : r.status === "publicado" ? "Publicado" : "Agendado",
            done: r.status === "publicado",
            ref: String(r.id),
            clientId: null,
          }));
        })),
        ...(await part(db, async () => {
          const { rows } = await db.query(
            `SELECT id, name, company, next_contact_at FROM clients WHERE next_contact_at BETWEEN $1 AND $2 AND status <> 'encerrado'`,
            [from, to],
          );
          return rows.map((r) => ({
            key: `c-${r.id}`,
            type: "contact" as const,
            day: ymd(r.next_contact_at),
            time: null,
            title: `Contatar ${r.name}`,
            sub: String(r.company ?? ""),
            done: false,
            ref: String(r.id),
            clientId: String(r.id),
          }));
        })),
      );
      return out.sort((a, b) => (a.day + (a.time ?? "00:00")).localeCompare(b.day + (b.time ?? "00:00")));
    });
    return json(res, 200, { items });
  } catch (error) {
    console.error("crm agenda:", error);
    return json(res, 500, { error: "Falha na agenda" });
  }
}
