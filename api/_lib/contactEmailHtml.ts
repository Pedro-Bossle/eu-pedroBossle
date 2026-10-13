const SITE = "https://www.devbossle.com.br";
const LOGO = `${SITE}/email/logo-devbossle.png`;
const BRAND_FONT = "Montserrat, Arial, Helvetica, sans-serif";
const BRAND_GREEN = "#007a55";

type EmailTheme = {
  label: string;
  pageBg: string;
  cardBg: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  border: string;
  radius: string;
  font: string;
  vibe: string;
};

/** Temas e-mail-safe (cores sólidas) alinhados aos estilos do formulário. */
const EMAIL_THEMES: Record<string, EmailTheme> = {
  minimalism: {
    label: "Minimalism",
    pageBg: "#f7f7f5",
    cardBg: "#ffffff",
    ink: "#171717",
    muted: "#737373",
    accent: "#171717",
    accentInk: "#ffffff",
    border: "#e5e5e5",
    radius: "8px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Limpo, sem firula — o conteúdo manda.",
  },
  swiss: {
    label: "Swiss Design",
    pageBg: "#fafafa",
    cardBg: "#ffffff",
    ink: "#171717",
    muted: "#525252",
    accent: "#c41e3a",
    accentInk: "#ffffff",
    border: "#171717",
    radius: "0px",
    font: "Helvetica Neue, Helvetica, Arial, sans-serif",
    vibe: "Tipo cartaz suíço: grade firme e tipografia no centro.",
  },
  "neo-brutalism": {
    label: "Neo-Brutalism",
    pageBg: "#f7f2d8",
    cardBg: "#fffdf5",
    ink: "#171717",
    muted: "#44403c",
    accent: "#e85d75",
    accentInk: "#ffffff",
    border: "#171717",
    radius: "4px",
    font: "Arial Black, Arial, Helvetica, sans-serif",
    vibe: "Grosso, barulhento e sem medo de parecer ousado.",
  },
  claymorphism: {
    label: "Claymorphism",
    pageBg: "#e8eefc",
    cardBg: "#f8faff",
    ink: "#1e293b",
    muted: "#64748b",
    accent: "#4f6bed",
    accentInk: "#ffffff",
    border: "#dbe4f5",
    radius: "20px",
    font: "Verdana, Geneva, sans-serif",
    vibe: "Botões e cards macios, quase dá pra apertar.",
  },
  glassmorphism: {
    label: "Glassmorphism",
    pageBg: "#1e293b",
    cardBg: "#0f172a",
    ink: "#f8fafc",
    muted: "#cbd5e1",
    accent: "#38bdf8",
    accentInk: "#0f172a",
    border: "#475569",
    radius: "16px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Aquele efeito de vidro fosco que virou moda.",
  },
  neumorphism: {
    label: "Neumorphism",
    pageBg: "#e8e9ef",
    cardBg: "#eef0f5",
    ink: "#2d3142",
    muted: "#6b7280",
    accent: "#5b5fc7",
    accentInk: "#ffffff",
    border: "#d5d7e0",
    radius: "16px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Relevo suave, tudo parecendo sair do fundo.",
  },
  cyberpunk: {
    label: "Cyberpunk",
    pageBg: "#12121a",
    cardBg: "#1c1c26",
    ink: "#f4f4f5",
    muted: "#a1a1aa",
    accent: "#e879f9",
    accentInk: "#12121a",
    border: "#e879f9",
    radius: "4px",
    font: "Courier New, Courier, monospace",
    vibe: "Escuro, neon e clima de filme sci-fi.",
  },
  cybercore: {
    label: "Cybercore",
    pageBg: "#0b1220",
    cardBg: "#111827",
    ink: "#e2e8f0",
    muted: "#94a3b8",
    accent: "#22d3ee",
    accentInk: "#0b1220",
    border: "#22d3ee",
    radius: "6px",
    font: "Courier New, Courier, monospace",
    vibe: "Visual de terminal: grid, ciano e cara técnica.",
  },
  synthwave: {
    label: "Synthwave",
    pageBg: "#1a1030",
    cardBg: "#2a1848",
    ink: "#f5e9ff",
    muted: "#c4b5d8",
    accent: "#f472b6",
    accentInk: "#1a1030",
    border: "#f472b6",
    radius: "12px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Anos 80, pôr do sol e fita VHS.",
  },
  y2k: {
    label: "Y2K Aesthetic",
    pageBg: "#fdf2f8",
    cardBg: "#ffffff",
    ink: "#4a044e",
    muted: "#9d174d",
    accent: "#db2777",
    accentInk: "#ffffff",
    border: "#f9a8d4",
    radius: "20px",
    font: "Trebuchet MS, Arial, Helvetica, sans-serif",
    vibe: "Nostalgia dos anos 2000 — chrome, bolhas e rosa.",
  },
  "pixel-art": {
    label: "Pixel Art",
    pageBg: "#1e2433",
    cardBg: "#2a3142",
    ink: "#e5e7eb",
    muted: "#9ca3af",
    accent: "#4ade80",
    accentInk: "#14532d",
    border: "#4ade80",
    radius: "0px",
    font: "Courier New, Courier, monospace",
    vibe: "Pixelado de propósito, clima de jogo antigo.",
  },
  scrapbook: {
    label: "Scrapbook",
    pageBg: "#f5efe6",
    cardBg: "#fffaf3",
    ink: "#292524",
    muted: "#78716c",
    accent: "#b45309",
    accentInk: "#fffbeb",
    border: "#d6a574",
    radius: "10px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Parece colagem de caderno: kraft, recorte e cola.",
  },
  surrealism: {
    label: "Surrealism",
    pageBg: "#f5f3ff",
    cardBg: "#ffffff",
    ink: "#3b0764",
    muted: "#6b7280",
    accent: "#7c3aed",
    accentInk: "#ffffff",
    border: "#c4b5fd",
    radius: "18px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Estranho de propósito — formas e cores que não batem.",
  },
  bento: {
    label: "Bento Grid",
    pageBg: "#f5f5f7",
    cardBg: "#ffffff",
    ink: "#1d1d1f",
    muted: "#6e6e73",
    accent: "#0071e3",
    accentInk: "#ffffff",
    border: "#d2d2d7",
    radius: "18px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Tudo em caixinhas organizadas, estilo dashboard moderno.",
  },
  editorial: {
    label: "Editorial Design",
    pageBg: "#faf7f2",
    cardBg: "#ffffff",
    ink: "#171717",
    muted: "#57534e",
    accent: "#b91c1c",
    accentInk: "#ffffff",
    border: "#171717",
    radius: "0px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Clima de revista: título grande, hierarquia clara.",
  },
  maximalism: {
    label: "Maximalism",
    pageBg: "#fff7ed",
    cardBg: "#ffffff",
    ink: "#1c1917",
    muted: "#57534e",
    accent: "#db2777",
    accentInk: "#ffffff",
    border: "#1c1917",
    radius: "12px",
    font: "Montserrat, Arial, Helvetica, sans-serif",
    vibe: "Cor demais, detalhe demais — e está tudo bem.",
  },
  luxury: {
    label: "Luxury Typography",
    pageBg: "#141210",
    cardBg: "#1c1917",
    ink: "#f5f0e6",
    muted: "#a8a29e",
    accent: "#c9a227",
    accentInk: "#141210",
    border: "#c9a227",
    radius: "2px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Escuro, dourado e cara de marca premium.",
  },
  "conceptual-sketch": {
    label: "Conceptual Sketch",
    pageBg: "#f4f1ea",
    cardBg: "#fffdf8",
    ink: "#292524",
    muted: "#78716c",
    accent: "#292524",
    accentInk: "#fafaf9",
    border: "#a8a29e",
    radius: "2px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Rascunho de ideia — linhas soltas, ainda em processo.",
  },
  ethereal: {
    label: "Ethereal",
    pageBg: "#faf5ff",
    cardBg: "#ffffff",
    ink: "#312e81",
    muted: "#6b7280",
    accent: "#8b5cf6",
    accentInk: "#ffffff",
    border: "#e9d5ff",
    radius: "20px",
    font: "Verdana, Geneva, sans-serif",
    vibe: "Leve, suave, com um ar quase sonhador.",
  },
  bohemian: {
    label: "Bohemian",
    pageBg: "#f3e7d3",
    cardBg: "#faf6ef",
    ink: "#3f2e22",
    muted: "#78716c",
    accent: "#9a3412",
    accentInk: "#fff7ed",
    border: "#c4a484",
    radius: "12px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Aconchegante, terracota e cara de ateliê.",
  },
  victorian: {
    label: "Victorian",
    pageBg: "#1c1410",
    cardBg: "#261c16",
    ink: "#f5efe0",
    muted: "#a8a29e",
    accent: "#c9a227",
    accentInk: "#1c1410",
    border: "#c9a227",
    radius: "4px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Ornamento clássico, um pouco teatral.",
  },
  "wabi-sabi": {
    label: "Wabi-Sabi",
    pageBg: "#ebe4d8",
    cardBg: "#f5f0e8",
    ink: "#44403c",
    muted: "#78716c",
    accent: "#78716c",
    accentInk: "#fafaf9",
    border: "#c4b8a5",
    radius: "8px",
    font: "Georgia, Times New Roman, serif",
    vibe: "Simples e imperfeito de propósito — sem polimento demais.",
  },
};

function escapeHtml(value: string) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveTheme(styleId?: string, styleLabel?: string): EmailTheme {
  const id = String(styleId ?? "").trim();
  if (id && EMAIL_THEMES[id]) return EMAIL_THEMES[id]!;
  const byLabel = Object.values(EMAIL_THEMES).find(
    (t) => t.label.toLowerCase() === String(styleLabel ?? "").trim().toLowerCase(),
  );
  return byLabel ?? EMAIL_THEMES.minimalism!;
}

function trafficLights() {
  return `
    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
      <tr>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0 5px 0 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#eab308;font-size:0;line-height:0">&nbsp;</span></td>
        <td style="padding:0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;font-size:0;line-height:0">&nbsp;</span></td>
      </tr>
    </table>`;
}

function metaRow(label: string, value: string) {
  return `
    <tr>
      <td style="font-family:${BRAND_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;padding:10px 0 2px 0">${label}</td>
    </tr>
    <tr>
      <td style="font-family:${BRAND_FONT};font-size:15px;line-height:22px;font-weight:700;color:#121212;padding:0 0 4px 0;border-bottom:1px solid #e5e7eb">${value}</td>
    </tr>`;
}

/** Notificação para você — mesmo visual dos e-mails de proposta/reset. */
export function buildContactNotifyHtml(input: {
  name: string;
  email: string;
  idea: string;
  style: string;
  styleId?: string;
}) {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const idea = escapeHtml(input.idea).replace(/\n/g, "<br />");
  const theme = resolveTheme(input.styleId, input.style);
  const styleLabel = escapeHtml(input.style || theme.label);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Novo contato · ${name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9f9f9">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f9f9f9" style="background-color:#f9f9f9;margin:0;padding:0">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:560px;width:100%">

          <tr>
            <td bgcolor="#F3F4F6" style="background-color:#F3F4F6;border:1px solid #e5e7eb;border-bottom:0;padding:14px 20px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                <tr>
                  <td valign="middle" style="vertical-align:middle">
                    <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                      <tr>
                        <td valign="middle" style="padding:0 10px 0 0;vertical-align:middle">${trafficLights()}</td>
                        <td valign="middle" style="font-family:${BRAND_FONT};font-size:14px;font-weight:700;color:#121212;vertical-align:middle">
                          .dev Bossle
                          <span style="font-weight:300;color:#6b7280">&nbsp;/&nbsp;contato</span>
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

          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:28px 24px 8px 24px">
              <div style="font-family:${BRAND_FONT};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_GREEN};font-weight:600;padding:0 0 8px 0">
                Novo lead · site
              </div>
              <div style="font-family:${BRAND_FONT};font-size:24px;line-height:30px;font-weight:700;color:#121212;letter-spacing:-0.02em;padding:0 0 12px 0">
                ${name}
              </div>
              <div style="height:3px;background-color:${BRAND_GREEN};width:56px;font-size:0;line-height:0">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:20px 24px 8px 24px;font-family:${BRAND_FONT};font-size:14px;line-height:22px;color:#121212">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#f4f6f3" style="border-collapse:collapse;background-color:#f4f6f3;border-left:4px solid ${BRAND_GREEN};margin:0 0 18px 0">
                <tr>
                  <td style="padding:14px 16px">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse">
                      ${metaRow("E-mail", `<a href="mailto:${email}" style="color:#121212;text-decoration:none">${email}</a>`)}
                      ${metaRow("Estilo escolhido", styleLabel)}
                    </table>
                  </td>
                </tr>
              </table>

              <div style="font-family:${BRAND_FONT};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;font-weight:700;padding:0 0 8px 0">Ideia</div>
              <div style="font-family:${BRAND_FONT};font-size:14px;line-height:22px;color:#374151;padding:0 0 8px 0">${idea}</div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:18px 0 0 0;border-collapse:collapse">
                <tr>
                  <td bgcolor="${theme.accent}" style="background-color:${theme.accent};border-radius:2px;padding:10px 14px">
                    <div style="font-family:${BRAND_FONT};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${theme.accentInk};opacity:0.85">Preview do estilo</div>
                    <div style="font-family:${BRAND_FONT};font-size:14px;font-weight:700;color:${theme.accentInk};padding:4px 0 0 0">${styleLabel}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0 0;color:#374151">
                Responda este e-mail para falar direto com o lead (reply-to configurado).
              </p>
            </td>
          </tr>

          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:20px 24px">
              <div style="font-family:${BRAND_FONT};font-size:12px;line-height:18px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px">
                Formulário · <a href="${SITE}/#contratar" style="color:${BRAND_GREEN};text-decoration:none">devbossle.com.br/#contratar</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Auto-reply ao cliente — visual do estilo que ele escolheu. */
export function buildContactAutoReplyHtml(input: {
  name: string;
  style?: string;
  styleId?: string;
}) {
  const theme = resolveTheme(input.styleId, input.style);
  const name = escapeHtml(input.name || "");
  const styleLabel = escapeHtml(input.style || theme.label);
  const vibe = escapeHtml(theme.vibe);
  const font = theme.font;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recebi sua mensagem</title>
</head>
<body style="margin:0;padding:0;background-color:${theme.pageBg}">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="${theme.pageBg}" style="background-color:${theme.pageBg};margin:0;padding:0">
    <tr>
      <td align="center" style="padding:28px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;max-width:560px;width:100%">

          <tr>
            <td bgcolor="${theme.accent}" style="background-color:${theme.accent};border:2px solid ${theme.border};border-bottom:0;border-radius:${theme.radius} ${theme.radius} 0 0;padding:14px 20px">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="font-family:${font};font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;color:${theme.accentInk}">
                    ${styleLabel}
                  </td>
                  <td align="right" style="font-family:${font};font-size:12px;font-weight:600;color:${theme.accentInk}">
                    Pedro Bossle
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="${theme.cardBg}" style="background-color:${theme.cardBg};border-left:2px solid ${theme.border};border-right:2px solid ${theme.border};padding:28px 24px 12px 24px">
              <div style="font-family:${font};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${theme.accent};font-weight:700;padding:0 0 10px 0">
                Mensagem recebida
              </div>
              <div style="font-family:${font};font-size:24px;line-height:32px;font-weight:700;color:${theme.ink};letter-spacing:-0.02em;padding:0 0 10px 0">
                Recebi sua mensagem${name ? `, ${name}` : ""}
              </div>
              <div style="height:3px;background-color:${theme.accent};width:56px;font-size:0;line-height:0">&nbsp;</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="${theme.cardBg}" style="background-color:${theme.cardBg};border-left:2px solid ${theme.border};border-right:2px solid ${theme.border};padding:18px 24px;font-family:${font};font-size:15px;line-height:24px;color:${theme.ink}">
              <p style="margin:0 0 14px 0;color:${theme.muted}">
                Obrigado por escolher o estilo <strong style="color:${theme.ink}">${styleLabel}</strong>.
                ${vibe}
              </p>
              <p style="margin:0 0 14px 0;color:${theme.muted}">
                Em breve respondo com os próximos passos para o seu projeto.
              </p>
              <p style="margin:0;color:${theme.muted}">
                Enquanto isso, confira trabalhos em
                <a href="${SITE}" style="color:${theme.accent};font-weight:700;text-decoration:none">devbossle.com.br</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td bgcolor="${theme.cardBg}" style="background-color:${theme.cardBg};border:2px solid ${theme.border};border-top:0;border-radius:0 0 ${theme.radius} ${theme.radius};padding:8px 24px 24px 24px">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:8px 0 0 0">
                <tr>
                  <td bgcolor="${theme.accent}" style="background-color:${theme.accent};border-radius:${theme.radius === "0px" ? "0" : "8px"}">
                    <a href="${SITE}/#contratar" style="display:inline-block;padding:12px 20px;font-family:${font};font-size:13px;font-weight:700;color:${theme.accentInk};text-decoration:none">
                      Ver o site
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0 0;font-family:${font};font-size:13px;line-height:20px;color:${theme.muted}">
                Pedro Bossle · desenvolvimento web
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
