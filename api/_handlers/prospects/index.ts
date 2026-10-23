import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import {
  PROSPECT_COLUMNS,
  mapProspect,
  sanitizeProspect,
  upsertProspect,
  type ProspectInput,
} from "../../_lib/prospects.js";

const MAX_IMPORT = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    // Lista todos os leads de prospecção
    if (req.method === "GET") {
      const leads = await withAuth(async (db) => {
        const { rows } = await db.query(
          `SELECT ${PROSPECT_COLUMNS} FROM prospect_leads
           ORDER BY created_at DESC
           LIMIT 2000`,
        );
        return rows.map((r) => mapProspect(r as Record<string, unknown>));
      });
      return json(res, 200, { leads });
    }

    // Cria/edita um lead, ou importa vários ({ leads: [...] })
    if (req.method === "POST") {
      const body = readBody<ProspectInput & { leads?: ProspectInput[] }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      if (Array.isArray(body.leads)) {
        if (body.leads.length > MAX_IMPORT) {
          return json(res, 400, {
            error: `Importe no máximo ${MAX_IMPORT} leads por vez`,
          });
        }
        const result = await withAuth(async (db) => {
          let added = 0;
          let updated = 0;
          let skipped = 0;
          for (const raw of body.leads ?? []) {
            if (!raw || typeof raw !== "object") {
              skipped += 1;
              continue;
            }
            const clean = sanitizeProspect({ source: "import", ...raw });
            if (!clean.name) {
              skipped += 1;
              continue;
            }
            const { inserted } = await upsertProspect(db, clean);
            if (inserted) added += 1;
            else updated += 1;
          }
          const { rows } = await db.query(
            `SELECT ${PROSPECT_COLUMNS} FROM prospect_leads
             ORDER BY created_at DESC LIMIT 2000`,
          );
          return {
            added,
            updated,
            skipped,
            leads: rows.map((r) => mapProspect(r as Record<string, unknown>)),
          };
        });
        return json(res, 200, result);
      }

      const clean = sanitizeProspect(body);
      if (!clean.name) return json(res, 400, { error: "Nome obrigatório" });

      const id = String(body.id ?? "").trim();
      const lead = await withAuth(async (db) => {
        if (id && UUID.test(id)) {
          // Edição: sobrescreve os campos com o que está no formulário
          const { rows } = await db.query(
            `UPDATE prospect_leads SET
               name = $2, niche = $3, city = $4, address = $5, neighborhood = $6,
               website = $7, email = $8, whatsapp = $9, phone = $10, instagram = $11,
               problems = $12, pitch = $13, message = $14, updated_at = now()
             WHERE id = $1
             RETURNING ${PROSPECT_COLUMNS}`,
            [
              id, clean.name, clean.niche, clean.city, clean.address,
              clean.neighborhood, clean.website, clean.email, clean.whatsapp,
              clean.phone, clean.instagram, clean.problems, clean.pitch,
              clean.message,
            ],
          );
          if (rows[0]) return mapProspect(rows[0] as Record<string, unknown>);
        }
        return (await upsertProspect(db, clean)).lead;
      });
      return json(res, 200, { lead });
    }

    // Atualização parcial: status e mensagem
    if (req.method === "PATCH") {
      const body = readBody<{
        id?: string;
        sent?: boolean;
        replied?: boolean;
        message?: string;
      }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });
      const id = String(body.id ?? "").trim();
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });

      const sets: string[] = [];
      const params: unknown[] = [id];
      if (typeof body.sent === "boolean") {
        params.push(body.sent);
        sets.push(
          `sent = $${params.length}`,
          `sent_at = CASE WHEN $${params.length} THEN coalesce(sent_at, now()) END`,
        );
      }
      if (typeof body.replied === "boolean") {
        params.push(body.replied);
        sets.push(
          `replied = $${params.length}`,
          `replied_at = CASE WHEN $${params.length} THEN coalesce(replied_at, now()) END`,
        );
      }
      if (typeof body.message === "string") {
        params.push(body.message.slice(0, 2000));
        sets.push(`message = $${params.length}`);
      }
      if (!sets.length) return json(res, 400, { error: "Nada para atualizar" });

      const lead = await withAuth(async (db) => {
        const { rows } = await db.query(
          `UPDATE prospect_leads SET ${sets.join(", ")}, updated_at = now()
           WHERE id = $1
           RETURNING ${PROSPECT_COLUMNS}`,
          params,
        );
        return rows[0] ? mapProspect(rows[0] as Record<string, unknown>) : null;
      });
      if (!lead) return json(res, 404, { error: "Lead não encontrado" });
      return json(res, 200, { lead });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "").trim();
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth(async (db) => {
        await db.query("DELETE FROM prospect_leads WHERE id = $1", [id]);
      });
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha nos leads de prospecção" });
  }
}
