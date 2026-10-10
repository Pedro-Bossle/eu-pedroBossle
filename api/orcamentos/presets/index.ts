import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { requireSession, json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapPreset } from "../../_lib/mappers.js";

const SECTIONS = new Set(["timeline", "payment", "needs", "notes"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "GET") {
      const presets = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT * FROM text_presets
           ORDER BY section ASC, name ASC, created_at DESC`,
        );
        return rows.map(mapPreset);
      });
      return json(res, 200, { presets });
    }

    if (req.method === "POST") {
      const body = readBody<{
        id?: string;
        section?: string;
        name?: string;
        body?: string;
      }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      const section = String(body.section ?? "").trim();
      const name = String(body.name ?? "").trim();
      const text = String(body.body ?? "");
      if (!SECTIONS.has(section)) {
        return json(res, 400, { error: "Seção inválida" });
      }
      if (!name) return json(res, 400, { error: "Nome do preset obrigatório" });

      const id = String(body.id || randomUUID());
      const preset = await withAuth(async (db) => {
        await db.query(
          `INSERT INTO text_presets (id, section, name, body, created_at, updated_at)
           VALUES ($1, $2, $3, $4, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             section = EXCLUDED.section,
             name = EXCLUDED.name,
             body = EXCLUDED.body,
             updated_at = now()`,
          [id, section, name, text],
        );
        const { rows } = await db.query(
          "SELECT * FROM text_presets WHERE id = $1",
          [id],
        );
        return mapPreset(rows[0]);
      });
      return json(res, 200, { preset });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "").trim();
      if (!id) return json(res, 400, { error: "id obrigatório" });
      await withAuth(async (db) => {
        await db.query("DELETE FROM text_presets WHERE id = $1", [id]);
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha em presets" });
  }
}
