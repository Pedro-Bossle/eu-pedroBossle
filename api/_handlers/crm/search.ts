import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";

/** GET crm/search?q= → clientes, propostas, leads do funil e tarefas (para o Ctrl+K). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  const q = String(req.query.q ?? "").trim().slice(0, 60);
  if (q.length < 2) return json(res, 200, { results: [] });
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  try {
    const results = await withAuth(async (db) => {
      const out: { type: string; id: string; title: string; sub: string }[] = [];
      const run = async (sql: string, map: (r: Record<string, unknown>) => (typeof out)[number]) => {
        await db.query("SAVEPOINT s");
        try {
          const { rows } = await db.query(sql, [like]);
          out.push(...rows.map(map));
          await db.query("RELEASE SAVEPOINT s");
        } catch {
          await db.query("ROLLBACK TO SAVEPOINT s");
        }
      };
      await run(
        `SELECT id, name, company, email FROM clients
         WHERE name ILIKE $1 OR company ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR array_to_string(tags, ' ') ILIKE $1
         ORDER BY name LIMIT 6`,
        (r) => ({ type: "client", id: String(r.id), title: String(r.name), sub: String(r.company || r.email || "") }),
      );
      await run(
        `SELECT p.id, p.company, p.status, p.total, c.name AS client FROM proposals p LEFT JOIN clients c ON c.id = p.client_id
         WHERE p.company ILIKE $1 OR p.idea ILIKE $1 OR c.name ILIKE $1 ORDER BY p.updated_at DESC LIMIT 6`,
        (r) => ({ type: "proposal", id: String(r.id), title: String(r.company || "Orçamento"), sub: `${r.client ?? ""} · ${r.status}` }),
      );
      await run(
        `SELECT id, name, niche, city, stage FROM prospect_leads WHERE name ILIKE $1 OR niche ILIKE $1 OR city ILIKE $1
         ORDER BY updated_at DESC LIMIT 5`,
        (r) => ({ type: "lead", id: String(r.id), title: String(r.name), sub: [r.niche, r.city].filter(Boolean).join(" · ") }),
      );
      await run(
        `SELECT id, title, due_at FROM crm_tasks WHERE done_at IS NULL AND (title ILIKE $1 OR notes ILIKE $1)
         ORDER BY due_at NULLS LAST LIMIT 5`,
        (r) => ({
          type: "task",
          id: String(r.id),
          title: String(r.title),
          sub: r.due_at ? new Date(String(r.due_at)).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "sem data",
        }),
      );
      return out;
    });
    return json(res, 200, { results });
  } catch (error) {
    console.error("crm search:", error);
    return json(res, 500, { error: "Falha na busca" });
  }
}
