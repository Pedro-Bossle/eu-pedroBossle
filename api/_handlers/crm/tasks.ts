import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { TASK_COLS, TASK_FROM, TASK_KINDS, UUID, mapTask } from "../../_lib/crm.js";

type Body = {
  id?: string;
  title?: string;
  notes?: string;
  kind?: string;
  priority?: number;
  dueAt?: string | null;
  allDay?: boolean;
  done?: boolean;
  clientId?: string | null;
  proposalId?: string | null;
  leadId?: string | null;
};

/**
 * Tarefas e follow-ups.
 * GET ?scope=open|done|all&clientId=… → lista
 * POST {…} → cria ou atualiza (com id)
 * PATCH { id, done } → conclui/reabre
 * DELETE ?id → apaga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const scope = String(req.query.scope ?? "open");
      const clientId = req.query.clientId ? String(req.query.clientId) : null;
      const where = [
        scope === "open" ? "t.done_at IS NULL" : scope === "done" ? "t.done_at IS NOT NULL" : "true",
        clientId ? "t.client_id = $1" : "true",
      ].join(" AND ");
      const { rows } = await withAuth((db) =>
        db.query(
          `SELECT ${TASK_COLS} FROM ${TASK_FROM} WHERE ${where}
           ORDER BY t.done_at DESC NULLS FIRST, t.due_at ASC NULLS LAST, t.priority DESC, t.created_at DESC
           LIMIT 500`,
          clientId ? [clientId] : [],
        ),
      );
      return json(res, 200, { tasks: rows.map(mapTask) });
    }

    if (req.method === "POST") {
      const b = readBody<Body>(req);
      if (!b) return json(res, 400, { error: "JSON inválido" });
      const title = String(b.title ?? "").trim().slice(0, 200);
      if (!title) return json(res, 400, { error: "Dê um título para a tarefa" });
      const kind = (TASK_KINDS as readonly string[]).includes(String(b.kind)) ? String(b.kind) : "tarefa";
      const due = b.dueAt ? new Date(b.dueAt) : null;
      if (due && Number.isNaN(due.getTime())) return json(res, 400, { error: "Data inválida" });
      const leadId = b.leadId && UUID.test(b.leadId) ? b.leadId : null;
      const params = [
        title,
        String(b.notes ?? "").slice(0, 4000),
        kind,
        Math.max(0, Math.min(2, Number(b.priority ?? 1))),
        due,
        b.allDay !== false,
        b.clientId || null,
        b.proposalId || null,
        leadId,
      ];
      const task = await withAuth(async (db) => {
        let id = b.id;
        if (id) {
          if (!UUID.test(id)) throw new Error("id inválido");
          await db.query(
            `UPDATE crm_tasks SET title=$2, notes=$3, kind=$4, priority=$5, due_at=$6, all_day=$7,
               client_id=$8, proposal_id=$9, lead_id=$10, updated_at=now() WHERE id=$1`,
            [id, ...params],
          );
        } else {
          const { rows } = await db.query(
            `INSERT INTO crm_tasks (title, notes, kind, priority, due_at, all_day, client_id, proposal_id, lead_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            params,
          );
          id = String(rows[0]!.id);
        }
        const { rows } = await db.query(`SELECT ${TASK_COLS} FROM ${TASK_FROM} WHERE t.id = $1`, [id]);
        return rows[0] ? mapTask(rows[0]) : null;
      });
      return json(res, 200, { task });
    }

    if (req.method === "PATCH") {
      const b = readBody<Body>(req);
      const id = String(b?.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      const { rows } = await withAuth(async (db) => {
        await db.query(`UPDATE crm_tasks SET done_at = CASE WHEN $2 THEN now() ELSE NULL END, updated_at = now() WHERE id = $1`, [
          id,
          Boolean(b?.done),
        ]);
        return db.query(`SELECT ${TASK_COLS} FROM ${TASK_FROM} WHERE t.id = $1`, [id]);
      });
      if (!rows[0]) return json(res, 404, { error: "Tarefa não encontrada" });
      return json(res, 200, { task: mapTask(rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM crm_tasks WHERE id = $1`, [id]));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("crm tasks:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha nas tarefas" });
  }
}
