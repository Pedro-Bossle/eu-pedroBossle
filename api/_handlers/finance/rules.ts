import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Regras e orçamentos.
 * POST { type: "rule", pattern, category, ignore, apply } → cria regra (apply = reaplica no histórico)
 * POST { type: "budget", category, limit } → define limite mensal (limit 0/null apaga)
 * DELETE ?id → apaga regra
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "POST") {
      const b = readBody<{
        type?: string;
        pattern?: string;
        category?: string;
        ignore?: boolean;
        apply?: boolean;
        limit?: number | null;
      }>(req);
      const category = String(b?.category ?? "").trim().slice(0, 60);

      if (b?.type === "budget") {
        if (!category) return json(res, 400, { error: "Categoria obrigatória" });
        const limit = Number(b.limit ?? 0);
        await withAuth((db) =>
          !limit || limit <= 0
            ? db.query(`DELETE FROM fin_budgets WHERE category = $1`, [category])
            : db.query(
                `INSERT INTO fin_budgets (category, monthly_limit) VALUES ($1, $2)
                 ON CONFLICT (category) DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit, updated_at = now()`,
                [category, Math.round(limit * 100) / 100],
              ),
        );
        return json(res, 200, { ok: true });
      }

      const pattern = String(b?.pattern ?? "").trim().slice(0, 80);
      if (pattern.length < 2) return json(res, 400, { error: "O texto da regra precisa de 2+ caracteres" });
      if (!category && !b?.ignore) return json(res, 400, { error: "Escolha uma categoria ou marque ignorar" });
      const out = await withAuth(async (db) => {
        const { rows } = await db.query(
          `INSERT INTO fin_rules (pattern, category, ignore) VALUES ($1, $2, $3) RETURNING id`,
          [pattern, category, Boolean(b?.ignore)],
        );
        let applied = 0;
        if (b?.apply !== false) {
          const r = await db.query(
            `UPDATE fin_transactions SET
               category = CASE WHEN $2 <> '' THEN $2 ELSE category END,
               ignored = $3
             WHERE NOT category_manual AND position(lower($1) in lower(description)) > 0`,
            [pattern, category, Boolean(b?.ignore)],
          );
          applied = r.rowCount ?? 0;
        }
        return { id: String(rows[0]!.id), applied };
      });
      return json(res, 201, out);
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM fin_rules WHERE id = $1`, [id]));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("finance rules:", error);
    return json(res, 500, { error: "Falha nas regras" });
  }
}
