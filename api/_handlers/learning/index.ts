import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { aiConfigured, currentGuide, generateReport, runAnalysis, type ReportRow, type Stats } from "../../_lib/learning.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateOnly = (v: unknown) => (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);

function summary(r: ReportRow) {
  const stats = r.stats as Partial<Stats>;
  return {
    id: String(r.id),
    weekStart: dateOnly(r.week_start),
    weekEnd: dateOnly(r.week_end),
    aiStatus: r.ai_status,
    aiError: r.ai_error,
    generatedBy: r.generated_by,
    createdAt: new Date(r.created_at).toISOString(),
    sent: stats.totals?.sent ?? 0,
    replies: stats.totals?.replies ?? 0,
    won: stats.totals?.won ?? 0,
    partial: Boolean(stats.week?.partial),
  };
}

/**
 * GET                  → { reports[], aiConfigured }
 * GET ?id=             → { report, markdown }
 * GET ?id=&download=1  → arquivo .md (o markdown não vai para o repositório)
 * POST { action: "generate", range?: "last" | "current" } → gera o relatório da semana
 * POST { action: "analyze", id }                           → pede de novo a análise da IA
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const id = String(req.query.id ?? "");
      if (id) {
        if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
        const row = await withAuth(async (db) => {
          const { rows } = await db.query(`SELECT * FROM prospect_learning_reports WHERE id = $1`, [id]);
          return rows[0] as ReportRow | undefined;
        });
        if (!row) return json(res, 404, { error: "Relatório não encontrado" });
        if (String(req.query.download ?? "") === "1") {
          const name = `aprendizado-funil-${dateOnly(row.week_start)}.md`;
          res.setHeader("Content-Type", "text/markdown; charset=utf-8");
          res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
          res.setHeader("Cache-Control", "no-store");
          return res.status(200).send(row.markdown);
        }
        return json(res, 200, { report: summary(row), markdown: row.markdown });
      }
      const rows = await withAuth(async (db) => {
        const { rows } = await db.query(`SELECT * FROM prospect_learning_reports ORDER BY week_start DESC LIMIT 52`);
        return rows as ReportRow[];
      });
      return json(res, 200, { reports: rows.map(summary), aiConfigured: aiConfigured() });
    }

    if (req.method === "POST") {
      const body = readBody<{ action?: string; range?: string; id?: string }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      if (body.action === "generate") {
        const id = await generateReport(withAuth, body.range === "current" ? "current" : "last", "manual");
        return json(res, 200, { id });
      }

      if (body.action === "analyze") {
        const id = String(body.id ?? "");
        if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
        const row = await withAuth(async (db) => {
          const { rows } = await db.query(`SELECT * FROM prospect_learning_reports WHERE id = $1`, [id]);
          const guide = (await currentGuide(db))?.content ?? "";
          return { report: rows[0] as ReportRow | undefined, guide };
        });
        if (!row.report) return json(res, 404, { error: "Relatório não encontrado" });
        await runAnalysis(withAuth, id, row.report.stats, row.guide);
        return json(res, 200, { id });
      }
      return json(res, 400, { error: "Ação inválida" });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("learning:", error);
    const missing = error instanceof Error && /prospect_learning_reports|prospect_guide/.test(error.message);
    return json(res, 500, { error: missing ? "Rode a migration 022_prospect_learning.sql no Neon" : "Falha ao processar o aprendizado" });
  }
}
