import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, readBody, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { UUID } from "../../_lib/crm.js";

const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const day = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

export function mapPayment(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    clientId: String(r.client_id),
    clientName: r.client_name ? String(r.client_name) : null,
    clientPhone: r.client_phone ? String(r.client_phone) : null,
    proposalId: r.proposal_id ? String(r.proposal_id) : null,
    description: String(r.description ?? ""),
    amount: Number(r.amount ?? 0),
    dueDate: day(r.due_date),
    paidAt: iso(r.paid_at),
    method: String(r.method ?? ""),
  };
}

const COLS = `p.*, c.name AS client_name, c.phone AS client_phone`;
const FROM = `crm_payments p JOIN clients c ON c.id = p.client_id`;
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Body = {
  id?: string;
  clientId?: string;
  proposalId?: string | null;
  description?: string;
  amount?: number;
  dueDate?: string;
  method?: string;
  paid?: boolean;
  /** Gera parcelas: total dividido em N, mensais a partir de dueDate. */
  installments?: { total: number; count: number; firstDue: string; labels?: string[] };
};

/**
 * Cobranças.
 * GET ?clientId | ?scope=open → lista
 * POST { clientId, description, amount, dueDate } → cria; com `installments`, gera várias
 * PATCH { id, paid, method? } → marca paga/aberta (paga registra no histórico)
 * DELETE ?id → apaga
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  try {
    if (req.method === "GET") {
      const clientId = req.query.clientId ? String(req.query.clientId) : null;
      const open = req.query.scope === "open";
      const { rows } = await withAuth((db) =>
        db.query(
          `SELECT ${COLS} FROM ${FROM} WHERE ($1::text IS NULL OR p.client_id = $1) AND (NOT $2 OR p.paid_at IS NULL)
           ORDER BY p.paid_at IS NOT NULL, p.due_date LIMIT 500`,
          [clientId, open],
        ),
      );
      return json(res, 200, { payments: rows.map(mapPayment) });
    }

    if (req.method === "POST") {
      const b = readBody<Body>(req);
      const clientId = String(b?.clientId ?? "");
      if (!clientId) return json(res, 400, { error: "Cliente obrigatório" });
      const proposalId = b?.proposalId || null;

      if (b?.installments) {
        const { total, count, firstDue, labels } = b.installments;
        const n = Math.max(1, Math.min(24, Math.floor(Number(count) || 1)));
        const t = Math.round(Number(total) * 100);
        if (!(t > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(String(firstDue))) return json(res, 400, { error: "Total e data inválidos" });
        // centavos distribuídos para fechar exatamente o total
        const base = Math.floor(t / n);
        const rows = await withAuth(async (db) => {
          const out = [];
          for (let i = 0; i < n; i += 1) {
            const cents = base + (i < t - base * n ? 1 : 0);
            const desc = labels?.[i] ?? (n === 1 ? String(b.description || "Pagamento") : `${b.description || "Parcela"} ${i + 1}/${n}`);
            const { rows } = await db.query(
              `INSERT INTO crm_payments (client_id, proposal_id, description, amount, due_date)
               VALUES ($1, $2, $3, $4, ($5::date + ($6 || ' months')::interval)::date) RETURNING id`,
              [clientId, proposalId, desc.slice(0, 120), cents / 100, firstDue, String(i)],
            );
            out.push(rows[0]!.id);
          }
          const { rows } = await db.query(`SELECT ${COLS} FROM ${FROM} WHERE p.id = ANY($1) ORDER BY p.due_date`, [out]);
          return rows;
        });
        return json(res, 201, { payments: rows.map(mapPayment) });
      }

      const amount = Number(b?.amount);
      const due = String(b?.dueDate ?? "");
      if (!(amount >= 0) || !/^\d{4}-\d{2}-\d{2}$/.test(due)) return json(res, 400, { error: "Valor e vencimento obrigatórios" });
      const { rows } = await withAuth(async (db) => {
        if (b?.id) {
          if (!UUID.test(b.id)) throw new Error("id inválido");
          await db.query(
            `UPDATE crm_payments SET description=$2, amount=$3, due_date=$4, method=$5, updated_at=now() WHERE id=$1`,
            [b.id, String(b.description ?? "").slice(0, 120), amount, due, String(b.method ?? "").slice(0, 40)],
          );
          return db.query(`SELECT ${COLS} FROM ${FROM} WHERE p.id = $1`, [b.id]);
        }
        const ins = await db.query(
          `INSERT INTO crm_payments (client_id, proposal_id, description, amount, due_date, method) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [clientId, proposalId, String(b?.description ?? "Pagamento").slice(0, 120), amount, due, String(b?.method ?? "").slice(0, 40)],
        );
        return db.query(`SELECT ${COLS} FROM ${FROM} WHERE p.id = $1`, [ins.rows[0]!.id]);
      });
      return json(res, 201, { payment: mapPayment(rows[0]!) });
    }

    if (req.method === "PATCH") {
      const b = readBody<Body>(req);
      const id = String(b?.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      const paid = Boolean(b?.paid);
      const { rows } = await withAuth(async (db) => {
        const before = await db.query(`SELECT paid_at FROM crm_payments WHERE id = $1`, [id]);
        const wasPaid = Boolean(before.rows[0]?.paid_at);
        const r = await db.query(
          `UPDATE crm_payments SET paid_at = CASE WHEN $2 THEN COALESCE(paid_at, now()) ELSE NULL END,
             method = COALESCE(NULLIF($3, ''), method), updated_at = now()
           WHERE id = $1 RETURNING client_id, description, amount`,
          [id, paid, String(b?.method ?? "")],
        );
        const p = r.rows[0];
        if (p && paid && !wasPaid) {
          await db.query(`INSERT INTO crm_activities (client_id, kind, body) VALUES ($1, 'pagamento', $2)`, [
            p.client_id,
            `Recebido ${brl(Number(p.amount))} — ${p.description}${b?.method ? ` (${b.method})` : ""}.`,
          ]);
        }
        return db.query(`SELECT ${COLS} FROM ${FROM} WHERE p.id = $1`, [id]);
      });
      if (!rows[0]) return json(res, 404, { error: "Cobrança não encontrada" });
      return json(res, 200, { payment: mapPayment(rows[0]) });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id ?? "");
      if (!UUID.test(id)) return json(res, 400, { error: "id inválido" });
      await withAuth((db) => db.query(`DELETE FROM crm_payments WHERE id = $1`, [id]));
      return json(res, 200, { ok: true });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("crm payments:", error);
    return json(res, 500, { error: error instanceof Error ? error.message : "Falha nas cobranças" });
  }
}
