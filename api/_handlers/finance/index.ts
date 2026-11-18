import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapAccount, mapInvestment, mapItem } from "../../_lib/finMappers.js";
import { pluggyConfigured, syncAllItems } from "../../_lib/pluggy.js";

const ITEM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TZ = "America/Sao_Paulo";

/**
 * GET → conexões, contas, investimentos, regras, orçamentos e resumo dos últimos 13 meses
 * POST { itemId } → cadastra uma conexão do Meu Pluggy e já sincroniza
 * PATCH { accountId, hidden } → esconde uma conta dos totais
 * DELETE ?itemId → remove a conexão e tudo dela
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const data = await withAuth(async (db) => {
        const items = await db.query(`SELECT * FROM fin_items ORDER BY created_at`);
        const accounts = await db.query(
          `SELECT a.*, i.connector_name FROM fin_accounts a JOIN fin_items i ON i.id = a.item_id
           ORDER BY a.type, a.name`,
        );
        const investments = await db.query(`SELECT * FROM fin_investments ORDER BY balance DESC`);
        const rules = await db.query(`SELECT id, pattern, category, ignore FROM fin_rules ORDER BY created_at DESC`);
        const budgets = await db.query(`SELECT category, monthly_limit FROM fin_budgets ORDER BY category`);
        const months = await db.query(
          `SELECT to_char(t.date AT TIME ZONE '${TZ}', 'YYYY-MM') AS month,
                  COALESCE(sum(t.amount) FILTER (WHERE t.amount > 0), 0) AS income,
                  COALESCE(-sum(t.amount) FILTER (WHERE t.amount < 0), 0) AS expense
           FROM fin_transactions t JOIN fin_accounts a ON a.id = t.account_id
           WHERE NOT t.ignored AND NOT a.hidden
             AND t.date >= date_trunc('month', now() AT TIME ZONE '${TZ}') - interval '12 months'
           GROUP BY 1 ORDER BY 1`,
        );
        const categories = await db.query(
          `SELECT DISTINCT category FROM fin_transactions WHERE category <> ''
           UNION SELECT category FROM fin_budgets UNION SELECT category FROM fin_rules WHERE category <> ''
           ORDER BY 1`,
        );
        return {
          items: items.rows.map(mapItem),
          accounts: accounts.rows.map(mapAccount),
          investments: investments.rows.map(mapInvestment),
          rules: rules.rows.map((r) => ({ id: String(r.id), pattern: r.pattern, category: r.category, ignore: r.ignore })),
          budgets: budgets.rows.map((r) => ({ category: String(r.category), limit: Number(r.monthly_limit) })),
          months: months.rows.map((r) => ({ month: r.month, income: Number(r.income), expense: Number(r.expense) })),
          categories: categories.rows.map((r) => String(r.category)),
        };
      });
      return json(res, 200, { configured: pluggyConfigured(), ...data });
    }

    if (req.method === "POST") {
      const b = readBody<{ itemId?: string }>(req);
      const itemId = String(b?.itemId ?? "").trim();
      if (!ITEM_ID.test(itemId)) return json(res, 400, { error: "Item ID inválido (formato UUID)" });
      if (!pluggyConfigured()) return json(res, 400, { error: "Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel" });
      await withAuth((db) => db.query(`INSERT INTO fin_items (id) VALUES ($1) ON CONFLICT DO NOTHING`, [itemId]));
      const [result] = await syncAllItems(withAuth, { onlyId: itemId });
      return json(res, 200, { result });
    }

    if (req.method === "PATCH") {
      const b = readBody<{ accountId?: string; hidden?: boolean }>(req);
      if (!b?.accountId) return json(res, 400, { error: "accountId obrigatório" });
      await withAuth((db) =>
        db.query(`UPDATE fin_accounts SET hidden = $2 WHERE id = $1`, [String(b.accountId), Boolean(b.hidden)]),
      );
      return json(res, 200, { ok: true });
    }

    if (req.method === "DELETE") {
      const itemId = String(req.query.itemId ?? "");
      if (!ITEM_ID.test(itemId)) return json(res, 400, { error: "Item ID inválido" });
      await withAuth((db) => db.query(`DELETE FROM fin_items WHERE id = $1`, [itemId]));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("finance:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha nas finanças" });
  }
}
