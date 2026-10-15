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
      const passwordHash = await bcrypt.hash(password, 10);
      const freshToken = generateShareToken();

      const proposal = await withAuth(async (db) => {
        const { rows: existing } = await db.query(
          "SELECT id, status, share_token FROM proposals WHERE id = $1",
          [proposalId],
        );
        if (!existing[0]) return null;

        const keepToken =
          existing[0].share_token && action !== "regenerate-token"
            ? String(existing[0].share_token)
            : freshToken;
        const nextStatus =
          String(existing[0].status) === "Em elaboração"
            ? "Enviado"
            : String(existing[0].status);

        await db.query(
          `UPDATE proposals SET
             share_token = $2,
             share_password_hash = $3,
             share_enabled = true,
             /* Reinicia validade a cada geração/regeneração do link */
             share_created_at = now(),
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
      const shareToken = String(proposal.shareToken ?? "");
      // Fallback relativo só para o painel (mesmo origin); e-mails usam URL absoluta confiável.
      const url =
        publicProposalUrl(shareToken, host) ?? `/orcamentos/p/${shareToken}`;

      return json(res, 200, {
        proposal,
        password,
        token: shareToken,
        url,
      });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("[proposals/share]", error);
    const detail =
      error instanceof Error ? error.message : "erro desconhecido";
    /* Colunas ausentes → migration 002 não aplicada */
    const needsMigration =
      /share_token|share_password|share_enabled|share_created/i.test(detail);
    return json(res, 500, {
      error: needsMigration
        ? "Schema desatualizado: rode npm run db:migrate (migration 002_proposal_share)"
        : "Falha ao gerenciar link da proposta",
      detail,
    });
  }
}
