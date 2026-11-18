import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";

/** Tabelas no backup. Credenciais (integration_credentials, bot_tokens) ficam de fora de propósito. */
const TABLES = [
  "profile",
  "clients",
  "proposals",
  "text_presets",
  "crm_tasks",
  "crm_activities",
  "crm_payments",
  "crm_projects",
  "prospect_leads",
  "prospect_events",
  "contact_leads",
  "ig_posts",
  "ig_media",
  "ig_comments",
  "fin_rules",
  "fin_budgets",
];

/** GET crm/export → JSON com todos os dados do painel (para guardar fora do Neon). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  try {
    const data = await withAuth(async (db) => {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) {
        await db.query("SAVEPOINT s");
        try {
          const { rows } = await db.query(`SELECT * FROM ${t}`);
          out[t] = rows;
          await db.query("RELEASE SAVEPOINT s");
        } catch {
          await db.query("ROLLBACK TO SAVEPOINT s"); // tabela ainda não criada (migration pendente)
        }
      }
      return out;
    });
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="devbossle-backup-${stamp}.json"`);
    return json(res, 200, { exportedAt: new Date().toISOString(), version: 1, tables: data });
  } catch (error) {
    console.error("crm export:", error);
    return json(res, 500, { error: "Falha ao gerar o backup" });
  }
}
