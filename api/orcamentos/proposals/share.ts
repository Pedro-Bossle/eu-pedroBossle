import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { requireSession, json, readBody } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapProposal } from "../../_lib/mappers.js";
import {
  generateSharePassword,
  generateShareToken,
  publicProposalUrl,
} from "../../_lib/sharePassword.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

  try {
    if (req.method === "POST") {
      const body = readBody<{ proposalId?: string; action?: string }>(req);
      if (!body) return json(res, 400, { error: "JSON inválido" });

      const proposalId = String(body.proposalId ?? "").trim();
      if (!proposalId) return json(res, 400, { error: "proposalId obrigatório" });

      const action = String(body.action ?? "enable");

      if (action === "disable") {
        const proposal = await withAuth(async (db) => {
          const { rowCount } = await db.query(
            `UPDATE proposals
             SET share_enabled = false, updated_at = now()
             WHERE id = $1`,
            [proposalId],
          );
          if (!rowCount) return null;
          const { rows } = await db.query(
            "SELECT * FROM proposals WHERE id = $1",
            [proposalId],
          );
          return mapProposal(rows[0]);
        });
        if (!proposal) return json(res, 404, { error: "Proposta não encontrada" });
        return json(res, 200, { proposal, disabled: true });
      }

      const password = generateSharePassword(8);
      const passwordHash = await bcrypt.hash(password, 12);
      const token = generateShareToken();

      const proposal = await withAuth(async (db) => {
        const { rows: existing } = await db.query(
          "SELECT id, status, share_token FROM proposals WHERE id = $1",
          [proposalId],
        );
        if (!existing[0]) return null;

        const keepToken =
          existing[0].share_token && action !== "regenerate-token"
            ? String(existing[0].share_token)
            : token;
        const nextStatus =
          String(existing[0].status) === "Em elaboração"
            ? "Enviado"
            : String(existing[0].status);

        await db.query(
          `UPDATE proposals SET
             share_token = $2,
             share_password_hash = $3,
             share_enabled = true,
             share_created_at = COALESCE(share_created_at, now()),
             status = $4,
             updated_at = now()
           WHERE id = $1`,
          [proposalId, keepToken, passwordHash, nextStatus],
        );

        const { rows } = await db.query(
          "SELECT * FROM proposals WHERE id = $1",
          [proposalId],
        );
        return mapProposal(rows[0]);
      });

      if (!proposal) return json(res, 404, { error: "Proposta não encontrada" });

      const host = String(req.headers.host ?? "");
      const url = publicProposalUrl(String(proposal.shareToken), host);

      return json(res, 200, {
        proposal,
        password,
        token: proposal.shareToken,
        url,
      });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao gerenciar link da proposta" });
  }
}
