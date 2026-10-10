import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  json,
  readBody,
  requireProposalSession,
} from "../../_lib/auth.js";
import { withDb } from "../../_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  const body = readBody<{ token?: string; body?: string }>(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });

  const token = String(body.token ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!token) return json(res, 400, { error: "token obrigatório" });
  if (!text) return json(res, 400, { error: "Comentário vazio" });
  if (!(await requireProposalSession(req, res, token))) return;

  try {
    const comment = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT public_add_comment($1, 'client', $2) AS data",
        [token, text],
      );
      return rows[0]?.data ?? null;
    });

    if (!comment) {
      return json(res, 404, { error: "Link inválido ou desativado" });
    }

    const data = typeof comment === "string" ? JSON.parse(comment) : comment;
    return json(res, 200, { comment: data });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message.includes("vazia")
        ? "Comentário vazio"
        : "Falha ao comentar";
    return json(res, 500, { error: message });
  }
}
