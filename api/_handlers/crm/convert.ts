import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapClient } from "../../_lib/mappers.js";
import { UUID } from "../../_lib/crm.js";
import { maskPhoneBr } from "../../../src/lib/phoneMask.js";

/**
 * POST { from: "lead" | "contact", id } → cria (ou reaproveita) o cliente a partir de um
 * lead do funil ou de um contato do site, registra no histórico e devolve o cliente.
 * Se já existir cliente com o mesmo telefone ou e-mail, devolve esse em vez de duplicar.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const b = readBody<{ from?: string; id?: string }>(req);
  const from = String(b?.from ?? "");
  const id = String(b?.id ?? "");
  if (!["lead", "contact"].includes(from) || !UUID.test(id)) return json(res, 400, { error: "Dados inválidos" });

  try {
    const out = await withAuth(async (db) => {
      let data: { name: string; company: string; phone: string; email: string; link: string; notes: string; source: string; tags: string[]; history: string };
      if (from === "lead") {
        const { rows } = await db.query(`SELECT * FROM prospect_leads WHERE id = $1`, [id]);
        const l = rows[0];
        if (!l) return { status: 404, body: { error: "Lead não encontrado" } };
        data = {
          name: String(l.name),
          company: String(l.name),
          phone: String(l.whatsapp || l.phone || ""),
          email: String(l.email ?? ""),
          link: String(l.website || l.instagram || ""),
          notes: [l.problems, l.detail].filter(Boolean).join("\n"),
          source: "Prospecção",
          tags: l.niche ? [String(l.niche).slice(0, 30)] : [],
          history: `Veio do funil de prospecção${l.city ? ` (${l.city})` : ""}.${l.reply_text ? ` Resposta: “${String(l.reply_text).slice(0, 300)}”` : ""}`,
        };
      } else {
        const { rows } = await db.query(`SELECT * FROM contact_leads WHERE id = $1`, [id]);
        const c = rows[0];
        if (!c) return { status: 404, body: { error: "Contato não encontrado" } };
        data = {
          name: String(c.name),
          company: "",
          phone: "",
          email: String(c.email ?? ""),
          link: "",
          notes: String(c.idea ?? ""),
          source: "Site",
          tags: [],
          history: `Pediu contato pelo site${c.style ? ` (estilo ${c.style})` : ""}: “${String(c.idea ?? "").slice(0, 400)}”`,
        };
        await db.query(`UPDATE contact_leads SET read_at = COALESCE(read_at, now()) WHERE id = $1`, [id]);
      }

      const digits = data.phone.replace(/\D/g, "").slice(-8);
      const existing = await db.query(
        `SELECT * FROM clients
         WHERE ($1 <> '' AND lower(email) = lower($1))
            OR ($2 <> '' AND right(regexp_replace(phone, '\\D', '', 'g'), 8) = $2)
         LIMIT 1`,
        [data.email, digits.length === 8 ? digits : ""],
      );
      if (existing.rows[0]) return { status: 200, body: { client: mapClient(existing.rows[0]), existed: true } };

      const clientId = randomUUID();
      const { rows } = await db.query(
        `INSERT INTO clients (id, name, company, phone, email, link, notes, status, tags, source, next_contact_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'lead',$8,$9, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 1)
         RETURNING *`,
        [clientId, data.name, data.company, data.phone ? maskPhoneBr(data.phone) : "", data.email, data.link, data.notes, data.tags, data.source],
      );
      await db.query(`INSERT INTO crm_activities (client_id, kind, body) VALUES ($1, 'nota', $2)`, [clientId, data.history]);
      return { status: 201, body: { client: mapClient(rows[0]), existed: false } };
    });
    return json(res, out.status, out.body);
  } catch (error) {
    console.error("crm convert:", error);
    return json(res, 500, { error: "Falha ao criar o cliente" });
  }
}
