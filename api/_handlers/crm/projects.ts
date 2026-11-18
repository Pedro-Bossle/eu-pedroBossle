import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { UUID } from "../../_lib/crm.js";

const STAGES = ["briefing", "layout", "desenvolvimento", "revisao", "publicado", "pausado"];
const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const day = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

const COLS = `pr.*, c.name AS client_name,
  (SELECT count(*) FROM crm_tasks t WHERE t.done_at IS NULL AND (t.proposal_id = pr.proposal_id OR (pr.client_id IS NOT NULL AND t.client_id = pr.client_id AND t.kind = 'entrega')))::int AS open_tasks`;
const FROM = `crm_projects pr LEFT JOIN clients c ON c.id = pr.client_id`;

function mapProject(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    clientId: r.client_id ? String(r.client_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    proposalId: r.proposal_id ? String(r.proposal_id) : null,
    title: String(r.title ?? ""),
    stage: String(r.stage ?? "briefing"),
    dueDate: day(r.due_date),
    value: Number(r.value ?? 0),
    notes: String(r.notes ?? ""),
    link: String(r.link ?? ""),
    openTasks: Number(r.open_tasks ?? 0),
    stageChangedAt: iso(r.stage_changed_at),
    created: iso(r.created_at),
  };
}

type Body = {
  id?: string;
  title?: string;
  clientId?: string | null;
  stage?: string;
  dueDate?: string | null;
  value?: number;
  notes?: string;
  link?: string;
};

/**
 * Projetos/entregas.
 * GET ?clientId → lista
 * POST {…} → cria/atualiza
 * PATCH { id, stage } → muda de etapa (registra no histórico do cliente ao publicar)
 * DELETE ?id → apaga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  try {
    if (req.method === "GET") {
      const clientId = req.query.clientId ? String(req.query.clientId) : null;
      const { rows } = await withAuth((db) =>
        db.query(`SELECT ${COLS} FROM ${FROM} WHERE ($1::text IS NULL OR pr.client_id = $1) ORDER BY pr.due_date NULLS LAST, pr.created_at DESC LIMIT 300`, [clientId]),
      );
      return json(res, 200, { projects: rows.map(mapProject) });
    }

    if (req.method === "POST") {
      const b = readBody<Body>(req);
      const title = String(b?.title ?? "").trim().slice(0, 160);
      if (!title) return json(res, 400, { error: "Dê um nome ao projeto" });
      const stage = STAGES.includes(String(b?.stage)) ? String(b?.stage) : "briefing";
      const due = b?.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ? b.dueDate : null;
      const params = [title, b?.clientId || null, stage, due, Math.max(0, Number(b?.value) || 0), String(b?.notes ?? "").slice(0, 4000), String(b?.link ?? "").slice(0, 300)];
      const { rows } = await withAuth(async (db) => {
        let id = b?.id;
        if (id) {
          if (!UUID.test(id)) throw new Error("id inválido");
          await db.query(
            `UPDATE crm_projects SET title=$2, client_id=$3,
               stage_changed_at = CASE WHEN stage <> $4 THEN now() ELSE stage_changed_at END,
               stage=$4, due_date=$5, value=$6, notes=$7, link=$8, updated_at=now() WHERE id=$1`,
            [id, ...params],
          );
        } else {
          const ins = await db.query(
            `INSERT INTO crm_projects (title, client_id, stage, due_date, value, notes, link) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            params,
          );
          id = String(ins.rows[0]!.id);
        }
        return db.query(`SELECT ${COLS} FROM ${FROM} WHERE pr.id = $1`, [id]);
      });
      return json(res, 200, { project: mapProject(rows[0]!) });
    }

    if (req.method === "PATCH") {
      const b = readBody<Body>(req);
      const id = String(b?.id ?? "");
      if (!UUID.test(id) || !STAGES.includes(String(b?.stage))) return json(res, 400, { error: "Dados inválidos" });
      const { rows } = await withAuth(async (db) => {
        const r = await db.query(
          `UPDATE crm_projects SET stage = $2, stage_changed_at = now(), updated_at = now()
           WHERE id = $1 AND stage <> $2 RETURNING client_id, title`,
          [id, b!.stage],
        );
        const p = r.rows[0];
        if (p?.client_id && b!.stage === "publicado") {
          await db.query(`INSERT INTO crm_activities (client_id, kind, body) VALUES ($1, 'entrega', $2)`, [p.client_id, `Projeto publicado: ${p.title}.`]);
        }
        return db.query(`SELECT ${COLS} FROM ${FROM} WHERE pr.id = $1`, [id]);
      });
      if (!rows[0]) return json(res, 404, { error: "Projeto não encontrado" });
      return json(res, 200, { project: mapProject(rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM crm_projects WHERE id = $1`, [id]));
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("crm projects:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha nos projetos" });
  }
}
