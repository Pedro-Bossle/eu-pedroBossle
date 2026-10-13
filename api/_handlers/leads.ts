import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../_lib/auth.js";
import { withAuth } from "../_lib/db.js";

export type ContactLead = {
  id: string;
  name: string;
  email: string;
  idea: string;
  style: string;
  styleId: string;
  created: string;
  readAt: string | null;
};

function mapLead(row: Record<string, unknown>): ContactLead {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    idea: String(row.idea ?? ""),
    style: String(row.style ?? ""),
    styleId: String(row.style_id ?? ""),
    created:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? ""),
    readAt:
      row.read_at == null
        ? null
        : row.read_at instanceof Date
          ? row.read_at.toISOString()
          : String(row.read_at),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const leads = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT id, name, email, idea, style, style_id, created_at, read_at
           FROM contact_leads
           ORDER BY created_at DESC
           LIMIT 200`,
        );
        return rows.map((r) => mapLead(r as Record<string, unknown>));
      });
      return json(res, 200, { leads });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const body = readBody<{ id?: string }>(req) ?? {};
      const id = String(req.query.id ?? body.id ?? "").trim();
      if (!id) return json(res, 400, { error: "id obrigatório" });

      const lead = await withAuth(async (db) => {
        const { rows } = await db.query(
          `UPDATE contact_leads
           SET read_at = coalesce(read_at, now())
           WHERE id = $1
           RETURNING id, name, email, idea, style, style_id, created_at, read_at`,
          [id],
        );
        return rows[0] ? mapLead(rows[0] as Record<string, unknown>) : null;
      });

      if (!lead) return json(res, 404, { error: "Lead não encontrado" });
      return json(res, 200, { lead });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha nos leads" });
  }
}
