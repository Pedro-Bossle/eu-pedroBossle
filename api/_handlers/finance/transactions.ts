import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapTx } from "../../_lib/finMappers.js";

const TZ = "America/Sao_Paulo";

/**
 * GET ?month=YYYY-MM | ?q=texto → transações (do mês, ou busca nos últimos 2 anos)
 * PATCH { id, category?, ignored?, notes? } → ajuste manual (não é sobrescrito pelo sync)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const month = String(req.query.month ?? "");
      const q = String(req.query.q ?? "").trim().slice(0, 80);
      if (!/^\d{4}-\d{2}$/.test(month) && !q) return json(res, 400, { error: "Informe month=YYYY-MM ou q" });
      const { rows } = await withAuth((db) =>
        q
          ? db.query(
              `SELECT * FROM fin_transactions
               WHERE (description ILIKE $1 OR merchant ILIKE $1 OR notes ILIKE $1 OR category ILIKE $1)
                 AND date > now() - interval '2 years'
               ORDER BY date DESC LIMIT 500`,
              [`%${q.replace(/[%_\\]/g, "\\$&")}%`],
            )
          : db.query(
              `SELECT * FROM fin_transactions
               WHERE to_char(date AT TIME ZONE '${TZ}', 'YYYY-MM') = $1
               ORDER BY date DESC LIMIT 3000`,
              [month],
            ),
      );
      return json(res, 200, { transactions: rows.map(mapTx) });
    }

    if (req.method === "PATCH") {
      const b = readBody<{ id?: string; category?: string; ignored?: boolean; notes?: string }>(req);
      const id = String(b?.id ?? "");
      if (!id) return json(res, 400, { error: "id obrigatório" });
      const { rows } = await withAuth((db) =>
        db.query(
          `UPDATE fin_transactions SET
             category = COALESCE($2, category),
             ignored = COALESCE($3, ignored),
             notes = COALESCE($4, notes),
             category_manual = category_manual OR $2 IS NOT NULL OR $3 IS NOT NULL
           WHERE id = $1 RETURNING *`,
          [
            id,
            b?.category === undefined ? null : String(b.category).trim().slice(0, 60) || "Outros",
            b?.ignored === undefined ? null : Boolean(b.ignored),
            b?.notes === undefined ? null : String(b.notes).slice(0, 500),
          ],
        ),
      );
      if (!rows[0]) return json(res, 404, { error: "Transação não encontrada" });
      return json(res, 200, { transaction: mapTx(rows[0] as Record<string, unknown>) });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("finance tx:", error);
    return json(res, 500, { error: "Falha nas transações" });
  }
}
