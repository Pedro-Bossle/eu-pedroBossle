import { appPathPrefix, resolvePublicBaseUrl } from "./publicUrl.js";

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

export function buildPasswordResetEmailHtml(input: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const name = escapeHtml(input.name || "Pedro");
  const resetUrl = escapeHtml(input.resetUrl);
  const minutes = input.expiresMinutes;

  const traffic = `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
      <tr>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#eab308;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;font-size:0;line-height:0">&nbsp;</span></td>
      </tr>
    </table>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redefinir senha · Orçamentos</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f9f9">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f9f9f9" style="background-color:#f9f9f9">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:560px;width:100%">
          <tr>
            <td bgcolor="#F3F4F6" style="background-color:#F3F4F6;border:1px solid #e5e7eb;border-bottom:0;padding:14px 20px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td valign="middle">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="padding:0 10px 0 0">${traffic}</td>
                        <td style="font-family:${FONT};font-size:14px;font-weight:700;color:#121212">
                          .dev Bossle
                          <span style="font-weight:300;color:#6b7280">&nbsp;/&nbsp;orçamentos</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <a href="${SITE}" style="text-decoration:none">
                      <img src="${LOGO}" width="140" height="18" alt="devbossle" style="display:block;border:0;width:140px;height:18px" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 24px 8px 24px">
              <div style="font-family:${FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#007a55;font-weight:600;padding:0 0 8px 0">
                Segurança
              </div>
              <div style="font-family:${FONT};font-size:24px;line-height:30px;font-weight:700;color:#121212;letter-spacing:-0.02em;padding:0 0 12px 0">
                Redefinir senha
              </div>
              <div style="height:3px;background-color:#007a55;width:56px;font-size:0;line-height:0">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:20px 24px;font-family:${FONT};font-size:14px;line-height:22px;color:#121212">
              <p style="margin:0 0 14px 0">Olá${name ? `, <strong>${name}</strong>` : ""},</p>
              <p style="margin:0 0 18px 0;color:#374151">
                Recebemos um pedido para redefinir a senha do painel de orçamentos. Use o botão abaixo — o link expira em <strong>${minutes} minutos</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 22px 0">
                <tr>
                  <td bgcolor="#121212" style="background-color:#121212;border-radius:2px">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">
                      Escolher nova senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px 0;font-size:12px;line-height:18px;color:#6b7280">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="margin:0 0 18px 0;font-size:12px;line-height:18px;word-break:break-all">
                <a href="${resetUrl}" style="color:#007a55;text-decoration:none">${resetUrl}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:20px;color:#6b7280">
                Se você não pediu isso, ignore este e-mail — a senha atual continua válida.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:18px 24px;font-family:${FONT};font-size:11px;line-height:16px;color:#9ca3af">
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

export function passwordResetUrl(
  token: string,
  reqHost?: string,
): string | null {
  const base = resolvePublicBaseUrl(reqHost);
  if (!base) return null;
  const q = `token=${encodeURIComponent(token)}`;
  return `${base}${appPathPrefix(base)}/redefinir-senha?${q}`;
}
