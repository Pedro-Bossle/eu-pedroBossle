import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { hasBotToken, requireBot } from "../../_lib/prospectFunnel.js";
import type { Suggestion } from "../../_lib/learning.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_GUIDE = 20_000;

type GuideRow = {
  id: string;
  content: string;
  status: string;
  suggestions: Suggestion[];
  report_id: string | null;
  created_at: Date;
  decided_at: Date | null;
};

const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
const view = (r: GuideRow | undefined) =>
  r
    ? {
        id: String(r.id),
        content: r.content,
        status: r.status,
        suggestions: Array.isArray(r.suggestions) ? r.suggestions : [],
        reportId: r.report_id,
        createdAt: iso(r.created_at),
        decidedAt: iso(r.decided_at),
      }
    : null;

/**
 * Guia de comunicação dos bots.
 * Painel (sessão):
 *   GET                                  → { current, proposal }
 *   POST { action: "approve", id, content? } → aprova a proposta (opcionalmente editada)
 *   POST { action: "reject", id }            → recusa a proposta
 *   POST { action: "save", content }         → grava uma nova versão aprovada escrita por você
 * Bots (/bot/guide, chave com funil, mensagens ou funil_total): GET → só a versão aprovada.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bot = hasBotToken(req);
  if (bot) {
    if (!(await requireBot(req, res, ["funil", "mensagens", "funil_total"]))) return;
  } else if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const rows = await withAuth(async (db) => {
        const cur = await db.query(
          `SELECT * FROM prospect_guide WHERE status = 'aprovado' ORDER BY decided_at DESC NULLS LAST, created_at DESC LIMIT 1`,
        );
        const prop = bot
          ? { rows: [] as GuideRow[] }
          : await db.query(`SELECT * FROM prospect_guide WHERE status = 'proposto' ORDER BY created_at DESC LIMIT 1`);
        return { current: cur.rows[0] as GuideRow | undefined, proposal: prop.rows[0] as GuideRow | undefined };
      });
      if (bot) {
        return json(res, 200, {
          approved: Boolean(rows.current),
          guide: rows.current?.content ?? "",
          approvedAt: iso(rows.current?.decided_at ?? null),
        });
      }
      return json(res, 200, { current: view(rows.current), proposal: view(rows.proposal) });
    }

    if (bot) return json(res, 405, { error: "Method not allowed" });
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = readBody<{ action?: string; id?: string; content?: string }>(req);
    if (!body) return json(res, 400, { error: "JSON inválido" });
    const content = String(body.content ?? "").trim().slice(0, MAX_GUIDE);

    if (body.action === "save") {
      if (content.length < 20) return json(res, 400, { error: "Escreva o guia" });
      const row = await withAuth(async (db) => {
        await db.query(`UPDATE prospect_guide SET status = 'substituido', decided_at = now() WHERE status = 'aprovado'`);
        const { rows } = await db.query(
          `INSERT INTO prospect_guide (content, status, decided_at) VALUES ($1, 'aprovado', now()) RETURNING *`,
          [content],
        );
        return rows[0] as GuideRow;
      });
      return json(res, 200, { current: view(row) });
    }

    const id = String(body.id ?? "");
    if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });

    if (body.action === "approve") {
      const row = await withAuth(async (db) => {
        const found = await db.query(`SELECT id, content FROM prospect_guide WHERE id = $1 AND status = 'proposto' FOR UPDATE`, [id]);
        if (!found.rows[0]) return null;
        await db.query(`UPDATE prospect_guide SET status = 'substituido', decided_at = now() WHERE status = 'aprovado'`);
        const { rows } = await db.query(
          `UPDATE prospect_guide SET status = 'aprovado', decided_at = now(), content = $2 WHERE id = $1 RETURNING *`,
          [id, content.length >= 20 ? content : String(found.rows[0].content)],
        );
        return rows[0] as GuideRow;
      });
      if (!row) return json(res, 404, { error: "Proposta não encontrada (talvez já decidida)" });
      return json(res, 200, { current: view(row) });
    }

    if (body.action === "reject") {
      const { rowCount } = await withAuth((db) =>
        db.query(`UPDATE prospect_guide SET status = 'recusado', decided_at = now() WHERE id = $1 AND status = 'proposto'`, [id]),
      );
      if (!rowCount) return json(res, 404, { error: "Proposta não encontrada (talvez já decidida)" });
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: "Ação inválida" });
  } catch (error) {
    console.error("learning/guide:", error);
    const missing = error instanceof Error && /prospect_guide/.test(error.message);
    return json(res, 500, { error: missing ? "Rode a migration 022_prospect_learning.sql no Neon" : "Falha ao processar o guia" });
  }
}
