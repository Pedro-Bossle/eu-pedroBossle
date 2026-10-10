import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireProposalSession } from "../../_lib/auth.js";
import { withDb } from "../../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const token = String(req.query.token ?? "").trim();
  if (!token) return json(res, 400, { error: "token obrigatório" });
  if (!(await requireProposalSession(req, res, token))) return;

  try {
    const payload = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT public_get_proposal_payload($1) AS data",
        [token],
      );
      return rows[0]?.data ?? null;
    });

    if (!payload) {
      return json(res, 404, { error: "Link inválido ou desativado" });
    }

    const data = typeof payload === "string" ? JSON.parse(payload) : payload;

    const toIso = (value: unknown) => {
      if (value == null) return null;
      if (typeof value === "string") return value;
      try {
        return new Date(value as string | number | Date).toISOString();
      } catch {
        return String(value);
      }
    };

    if (data?.proposal) {
      data.proposal.created = toIso(data.proposal.created) ?? data.proposal.created;
      data.proposal.clientDecidedAt = toIso(data.proposal.clientDecidedAt);
    }
    if (Array.isArray(data?.comments)) {
      data.comments = data.comments.map(
        (c: { id: string; author: string; body: string; created: unknown }) => ({
          ...c,
          created: toIso(c.created) ?? c.created,
        }),
      );
    }

    return json(res, 200, data);
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao carregar proposta" });
  }
}
