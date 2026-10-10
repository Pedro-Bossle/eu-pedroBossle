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

  const body = readBody<{
    token?: string;
    action?: string;
    note?: string;
  }>(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });

  const token = String(body.token ?? "").trim();
  const action = String(body.action ?? "").trim();
  const note = String(body.note ?? "");
  if (!token) return json(res, 400, { error: "token obrigatório" });
  if (action !== "approve" && action !== "reject") {
    return json(res, 400, { error: "action deve ser approve ou reject" });
  }
  if (!(await requireProposalSession(req, res, token))) return;

  const status = action === "approve" ? "Aprovado" : "Recusado";

  try {
    const result = await withDb(async (db) => {
      const { rows } = await db.query(
        "SELECT public_set_decision($1, $2, $3) AS data",
        [token, status, note],
      );
      return rows[0]?.data ?? null;
    });

    if (!result) {
      return json(res, 404, { error: "Link inválido ou desativado" });
    }

    const data = typeof result === "string" ? JSON.parse(result) : result;
    return json(res, 200, data);
  } catch (error) {
    console.error(error);
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("já decidida")) {
      return json(res, 409, { error: "Esta proposta já foi decidida" });
    }
    if (msg.includes("não encontrada")) {
      return json(res, 404, { error: "Link inválido ou desativado" });
    }
    return json(res, 500, { error: "Falha ao registrar decisão" });
  }
}
