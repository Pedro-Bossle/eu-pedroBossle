import { maskPhoneBr } from "../../src/lib/phoneMask.js";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../src/types/orcamentos.js";

const SITE = "https://dev-bossle.vercel.app";
const LOGO = `${SITE}/email/logo-devbossle.png`;
const FONT = "Montserrat, Arial, Helvetica, sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyBrl(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

/** E-mail de proposta no visual do portfólio (.dev Bossle). */
export function buildProposalEmailHtml(input: {
  proposal: OrcamentoProposal;
  client: OrcamentoClient;
  profile: OrcamentoProfile;
  share?: { url: string; password: string } | null;
}) {
  const { proposal, client, profile, share } = input;
  const projectName = escapeHtml(proposal.company || "Proposta");
  const clientName = escapeHtml(client.name || "");
  const senderName = escapeHtml(profile.name || "Pedro Bossle");
  const senderTitle = escapeHtml(profile.title || "Desenvolvedor Web");
  const senderPhone = escapeHtml(
    profile.phone ? maskPhoneBr(profile.phone) : "",
  );
  const senderEmail = escapeHtml(profile.email || "");
  const portfolio = (profile.portfolio || SITE).trim();
  const portfolioHref = isHttpUrl(portfolio) ? portfolio : SITE;
  const portfolioLabel = escapeHtml(
    portfolio.replace(/^https?:\/\//i, "").replace(/\/$/, "") || "dev-bossle.vercel.app",
  );
  const linkedin = (profile.linkedin || "").trim();
  const validityLabel = `${proposal.validity} dia${proposal.validity === 1 ? "" : "s"}`;
  const version = escapeHtml(proposal.version || "1");
  const total = escapeHtml(moneyBrl(proposal.total));
  const ideaRaw =
    (proposal.idea || "").trim() ||
    "Projeto de desenvolvimento web sob medida.";
  const idea = escapeHtml(ideaRaw).replace(/\r?\n/g, "<br />");

  const traffic = `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
      <tr>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#eab308;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;font-size:0;line-height:0">&nbsp;</span></td>
      </tr>
    </table>`;

  const metaRow = (label: string, value: string) => `
    <tr>
      <td style="font-family:${FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;padding:10px 0 2px 0">${label}</td>
    </tr>
    <tr>
      <td style="font-family:${FONT};font-size:16px;line-height:22px;font-weight:700;color:#121212;padding:0 0 4px 0;border-bottom:1px solid #e5e7eb">${value}</td>
    </tr>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Proposta · ${projectName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f9f9">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f9f9f9" style="background-color:#f9f9f9;margin:0;padding:0">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:560px;width:100%">

          <!-- Header -->
          <tr>
            <td bgcolor="#F3F4F6" style="background-color:#F3F4F6;border:1px solid #e5e7eb;border-bottom:0;padding:14px 20px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                <tr>
                  <td valign="middle" style="vertical-align:middle">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                      <tr>
                        <td valign="middle" style="padding:0 10px 0 0;vertical-align:middle">${traffic}</td>
                        <td valign="middle" style="font-family:${FONT};font-size:14px;font-weight:700;color:#121212;vertical-align:middle">
                          .dev Bossle
                          <span style="font-weight:300;color:#6b7280">&nbsp;/&nbsp;orçamentos</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" style="vertical-align:middle">
                    <a href="${SITE}" style="text-decoration:none">
                      <img src="${LOGO}" width="140" height="18" alt="devbossle" style="display:block;width:140px;height:18px;border:0;outline:none" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 24px 8px 24px">
              <div style="font-family:${FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#007a55;font-weight:600;padding:0 0 8px 0">
                Proposta de projeto
              </div>
              <div style="font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:#121212;letter-spacing:-0.02em;padding:0 0 12px 0">
                ${projectName}
              </div>
              <div style="height:3px;background-color:#007a55;width:56px;font-size:0;line-height:0">&nbsp;</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:20px 24px 8px 24px;font-family:${FONT};font-size:14px;line-height:22px;color:#121212">
              <p style="margin:0 0 14px 0">Olá${clientName ? `, <strong>${clientName}</strong>` : ""},</p>
              <p style="margin:0 0 18px 0;color:#374151">
                Segue em anexo a documentação da proposta (PDF). Você também pode abrir o link abaixo para visualizar online, comentar e aprovar ou recusar.
              </p>
              <p style="margin:0 0 20px 0;color:#4b5563;font-size:13px;line-height:20px">
                ${idea}
              </p>

              ${
                share?.url && share?.password
                  ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#ecfdf5" style="border-collapse:collapse;background-color:#ecfdf5;border:1px solid #a7f3d0;margin:0 0 18px 0">
                <tr>
                  <td style="padding:14px 16px;font-family:${FONT}">
                    <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#047857;font-weight:700;padding:0 0 8px 0">Acesso online</div>
                    <div style="font-size:13px;line-height:20px;color:#065f46;padding:0 0 6px 0">
                      <strong>Link:</strong>
                      <a href="${escapeHtml(share.url)}" style="color:#047857;word-break:break-all">${escapeHtml(share.url)}</a>
                    </div>
                    <div style="font-size:13px;line-height:20px;color:#065f46">
                      <strong>Senha:</strong> ${escapeHtml(share.password)}
                    </div>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f4f6f3" style="border-collapse:collapse;background-color:#f4f6f3;border-left:4px solid #007a55">
                <tr>
                  <td style="padding:14px 16px">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                      ${metaRow("Valor", total)}
                      ${metaRow("Validade", escapeHtml(validityLabel))}
                      ${metaRow("Versão", version)}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0 0;color:#374151">
                Qualquer dúvida, responda este e-mail — fico à disposição.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:24px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;border-top:1px solid #e5e7eb">
                <tr>
                  <td style="padding:20px 0 0 0">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                      <tr>
                        <td valign="middle" style="padding:0 16px 0 0;vertical-align:middle">
                          <a href="${SITE}" style="text-decoration:none">
                            <img src="${LOGO}" width="150" height="19" alt="devbossle" style="display:block;width:150px;height:19px;border:0" />
                          </a>
                        </td>
                        <td width="2" bgcolor="#007a55" style="width:2px;background-color:#007a55;font-size:1px;line-height:1px">&nbsp;</td>
                        <td valign="middle" style="padding:0 0 0 16px;vertical-align:middle;font-family:${FONT}">
                          <div style="font-size:15px;line-height:20px;font-weight:700;color:#121212">${senderName}</div>
                          <div style="font-size:13px;line-height:18px;font-weight:600;color:#007a55;padding:1px 0 0 0">${senderTitle}</div>
                          <div style="font-size:12px;line-height:18px;color:#6b7280;padding:2px 0 6px 0">Sites e sistemas sob medida</div>
                          ${
                            senderEmail
                              ? `<div style="font-size:12px;line-height:18px"><a href="mailto:${senderEmail}" style="color:#121212;text-decoration:none">${senderEmail}</a></div>`
                              : ""
                          }
                          ${
                            senderPhone
                              ? `<div style="font-size:12px;line-height:18px;color:#121212">${senderPhone}</div>`
                              : ""
                          }
                          <div style="font-size:12px;line-height:18px">
                            <a href="${escapeHtml(portfolioHref)}" style="color:#121212;text-decoration:none">${portfolioLabel}</a>
                          </div>
                          ${
                            linkedin
                              ? `<div style="font-size:12px;line-height:18px;padding:4px 0 0 0"><a href="${escapeHtml(linkedin)}" style="color:#007a55;text-decoration:none;font-weight:600">LinkedIn</a></div>`
                              : ""
                          }
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:16px 8px 0 8px;font-family:${FONT};font-size:11px;line-height:16px;color:#9ca3af">
              Enviado pelo painel de orçamentos ·
              <a href="${SITE}" style="color:#007a55;text-decoration:none">.dev Bossle</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
