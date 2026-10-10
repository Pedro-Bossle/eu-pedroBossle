import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  json,
  readBody,
  requireSession,
} from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";
import { mapClient, mapProfile, mapProposal } from "../../_lib/mappers.js";
import { buildProposalEmailHtml } from "../../_lib/proposalEmailHtml.js";
import { getResend, getResendFrom } from "../../_lib/resend.js";

/** ~2.1MB PDF → ~2.8MB base64, abaixo do limite típico de 4.5MB do body. */
const MAX_PDF_BYTES = 2_100_000;

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function stripDataUrl(base64: string) {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(",");
  if (trimmed.startsWith("data:") && comma !== -1) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!(await requireSession(req, res))) return;

  const body = readBody<{
    id?: string;
    pdfBase64?: string;
    to?: string;
    shareUrl?: string;
    sharePassword?: string;
  }>(req);
  if (!body) {
    return json(res, 400, { error: "JSON inválido" });
  }

  const id = String(body.id ?? "").trim();
  const pdfBase64 = stripDataUrl(String(body.pdfBase64 ?? ""));
  if (!id) return json(res, 400, { error: "id obrigatório" });
  if (!pdfBase64) return json(res, 400, { error: "PDF obrigatório" });

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = Buffer.from(pdfBase64, "base64");
  } catch {
    return json(res, 400, { error: "PDF em base64 inválido" });
  }
  if (!pdfBuffer.length) {
    return json(res, 400, { error: "PDF vazio" });
  }
  if (pdfBuffer.length > MAX_PDF_BYTES) {
    return json(res, 413, { error: "PDF muito grande para envio" });
  }

  try {
    const payload = await withAuth(async (db) => {
      const { rows: proposalRows } = await db.query(
        "SELECT * FROM proposals WHERE id = $1",
        [id],
      );
      if (!proposalRows[0]) {
        return { error: "Orçamento não encontrado", status: 404 as const };
      }
      const proposal = mapProposal(proposalRows[0]);

      const { rows: clientRows } = await db.query(
        "SELECT * FROM clients WHERE id = $1",
        [proposal.clientId],
      );
      if (!clientRows[0]) {
        return {
          error: "Cliente do orçamento não encontrado",
          status: 400 as const,
        };
      }
      const client = mapClient(clientRows[0]);

      const { rows: profileRows } = await db.query(
        "SELECT * FROM profile WHERE id = 1",
      );
      const profile = profileRows[0]
        ? mapProfile(profileRows[0])
        : mapProfile({});

      return { proposal, client, profile };
    });

    if ("error" in payload) {
      return json(res, payload.status, { error: payload.error });
    }

    const { proposal, client, profile } = payload;
    const to = String(body.to ?? client.email ?? "").trim().toLowerCase();
    if (!to || !isEmail(to)) {
      return json(res, 400, {
        error: "Cliente sem e-mail válido. Cadastre o e-mail antes de enviar.",
      });
    }

    const from = getResendFrom();
    const resend = getResend();
    const projectName = proposal.company || "Proposta";
    const filename = `proposta-${projectName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "orcamento"}.pdf`;

    const shareUrl = String(body.shareUrl ?? "").trim();
    const sharePassword = String(body.sharePassword ?? "").trim();
    const html = buildProposalEmailHtml({
      proposal,
      client,
      profile,
      share:
        shareUrl && sharePassword
          ? { url: shareUrl, password: sharePassword }
          : null,
    });

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: `Proposta · ${projectName}`,
      html,
      replyTo: profile.email && isEmail(profile.email) ? profile.email : undefined,
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error(error);
      return json(res, 502, {
        error: error.message || "Falha ao enviar e-mail",
      });
    }

    await withAuth(async (db) => {
      await db.query(
        `UPDATE proposals
         SET status = 'Enviado', updated_at = now()
         WHERE id = $1`,
        [id],
      );
    });

    return json(res, 200, { ok: true, id: data?.id ?? null, to });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Falha ao enviar orçamento";
    return json(res, 500, { error: message });
  }
}
