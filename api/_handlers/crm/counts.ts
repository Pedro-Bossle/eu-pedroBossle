import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";

const TZ = "America/Sao_Paulo";
const TODAY = `(now() AT TIME ZONE '${TZ}')::date`;

/** Cada contador isolado: tabela de módulo não migrado vira 0 em vez de derrubar os outros. */
const COUNTS: Record<string, string> = {
  today: `SELECT count(*)::int AS n FROM crm_tasks WHERE done_at IS NULL AND (due_at AT TIME ZONE '${TZ}')::date <= ${TODAY}`,
  inbox: `SELECT count(*)::int AS n FROM contact_leads WHERE read_at IS NULL`,
  instagram: `SELECT count(*)::int AS n FROM ig_comments WHERE status = 'novo' AND NOT from_me`,
  prospects: `SELECT count(*)::int AS n FROM prospect_leads
              WHERE stage = 'aguardando' OR (stage = 'enviado' AND stage_changed_at < now() - interval '3 days')`,
  projects: `SELECT count(*)::int AS n FROM crm_projects WHERE stage NOT IN ('publicado', 'pausado') AND due_date < ${TODAY}`,
};

/** GET crm/counts → números do menu (leve, para atualizar a cada poucos minutos). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  try {
    const counts = await withAuth(async (db) => {
      const out: Record<string, number> = {};
      for (const [k, sql] of Object.entries(COUNTS)) {
        await db.query("SAVEPOINT c");
        try {
          out[k] = Number((await db.query(sql)).rows[0]?.n ?? 0);
          await db.query("RELEASE SAVEPOINT c");
        } catch {
          await db.query("ROLLBACK TO SAVEPOINT c");
          out[k] = 0;
        }
      }
      return out;
    });
    return json(res, 200, { counts });
  } catch (error) {
    console.error("crm counts:", error);
    return json(res, 500, { error: "Falha nos contadores" });
  }
}
