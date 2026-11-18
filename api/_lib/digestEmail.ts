import type { TodayData } from "./crmToday.js";
import { withAuth } from "./db.js";
import { getResend, getResendFrom } from "./resend.js";
import { resolvePublicBaseUrl, appPathPrefix } from "./publicUrl.js";

const ink = "#18202a";
const muted = "#5b6573";
const line = "#e2e6eb";
const accent = "#127a5c";
const danger = "#b93a32";
const font = "Montserrat, Arial, Helvetica, sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).replace(/\./g, "") : "";

function section(title: string, rows: string[], tone = ink) {
  if (!rows.length) return "";
  return `
  <tr><td style="padding:22px 28px 6px;font:600 13px ${font};color:${tone};">${esc(title)}</td></tr>
  ${rows.map((r) => `<tr><td style="padding:8px 28px;border-top:1px solid ${line};font:400 14px/1.45 ${font};color:${ink};">${r}</td></tr>`).join("")}`;
}

/** HTML do resumo diário (tabelas simples, compatível com clientes de e-mail). */
export function buildDigestHtml(d: TodayData, opts: { name: string; panelUrl: string }) {
  const t = d.tasks;
  const sub = (s: string) => `<span style="color:${muted};font-size:12px;">${s}</span>`;
  const taskRow = (x: NonNullable<TodayData["tasks"]>["overdue"][number]) =>
    `${esc(x.title)}${x.clientName ? ` ${sub(`· ${esc(x.clientName)}`)}` : ""}${x.dueAt ? ` ${sub(`· ${shortDate(x.dueAt)}`)}` : ""}`;
  const k = d.kpis;
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

  const body = [
    section("Atrasadas", (t?.overdue ?? []).map(taskRow), danger),
    section("Para hoje", (t?.dueToday ?? []).map(taskRow)),
    section(
      "Retomar contato",
      (d.contacts ?? []).map((c) => `${esc(c.name)}${c.company ? ` ${sub(`· ${esc(c.company)}`)}` : ""}`),
    ),
    section(
      "Propostas sem resposta",
      (d.proposals ?? []).map((p) => `${esc(p.title)} ${sub(`· ${esc(p.clientName)} · ${brl(p.total)} · enviada há ${p.days} dias`)}`),
    ),
    section(
      "Funil",
      [
        d.funnel?.awaiting ? plural(d.funnel.awaiting, "mensagem para aprovar", "mensagens para aprovar") : "",
        d.funnel?.followups ? plural(d.funnel.followups, "follow-up vencido", "follow-ups vencidos") : "",
        d.funnel?.replied ? plural(d.funnel.replied, "lead respondeu", "leads responderam") : "",
        d.inbox?.unread ? plural(d.inbox.unread, "contato novo do site", "contatos novos do site") : "",
      ].filter(Boolean),
    ),
    section(
      "Instagram",
      [
        ...(d.instagram?.posts ?? []).map((p) =>
          p.status === "erro" ? `<span style="color:${danger}">Erro ao publicar:</span> ${esc(p.caption || "post")}` : `${esc(p.caption || "Post")} ${sub(`· sai às ${p.at ? new Date(p.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : ""}`)}`,
        ),
        d.instagram?.newComments ? plural(d.instagram.newComments, "comentário esperando resposta", "comentários esperando resposta") : "",
      ].filter(Boolean),
    ),
    section(
      "Finanças",
      [
        ...(d.finance?.bills ?? []).map((b) => `Fatura ${esc(b.name)}: ${brl(b.amount)} ${sub(`· vence ${b.due ? new Date(`${b.due}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}`)}`),
        ...(d.finance?.budgets ?? []).map((b) => `${esc(b.category)}: ${Math.round((b.spent / b.limit) * 100)}% do orçamento`),
      ],
    ),
  ].join("");

  const kpis = k
    ? `<tr><td style="padding:18px 28px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${line};border-radius:12px;">
          <tr>
            ${[
              ["Recorrente", brl(k.mrr)],
              ["Em negociação", brl(k.pipeline)],
              ["Fechado no mês", brl(k.wonMonth)],
            ]
              .map(
                ([a, b], i) =>
                  `<td style="padding:12px 14px;${i ? `border-left:1px solid ${line};` : ""}font:400 11px ${font};color:${muted};">${a}<br><span style="font:600 15px ${font};color:${ink};">${b}</span></td>`,
              )
              .join("")}
          </tr>
        </table></td></tr>`
    : "";

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid ${line};border-radius:16px;">
        <tr><td style="padding:26px 28px 0;font:400 13px ${font};color:${muted};">${esc(today.charAt(0).toUpperCase() + today.slice(1))}</td></tr>
        <tr><td style="padding:4px 28px 0;font:600 22px ${font};color:${ink};">Bom dia${opts.name ? `, ${esc(opts.name.split(" ")[0]!)}` : ""}</td></tr>
        <tr><td style="padding:6px 28px 0;font:400 14px ${font};color:${muted};">${(t?.dueToday.length ?? 0)} para hoje · ${plural(t?.overdue.length ?? 0, "atrasada", "atrasadas")}</td></tr>
        ${kpis}
        ${body}
        <tr><td style="padding:24px 28px 28px;">
          <a href="${opts.panelUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font:600 14px ${font};padding:12px 20px;border-radius:10px;">Abrir o painel</a>
        </td></tr>
      </table>
      <p style="font:400 11px ${font};color:${muted};margin:14px 0 0;">Resumo diário do CRM Dev Bossle. Para desligar, defina CRM_DIGEST=off na Vercel.</p>
    </td></tr>
  </table></body></html>`;
}

/** Tem algo que valha um e-mail hoje? */
export function digestHasContent(d: TodayData) {
  return Boolean(
    d.tasks?.overdue.length ||
      d.tasks?.dueToday.length ||
      d.contacts?.length ||
      d.proposals?.length ||
      d.funnel?.awaiting ||
      d.funnel?.followups ||
      d.funnel?.replied ||
      d.inbox?.unread ||
      d.instagram?.posts.length ||
      d.instagram?.newComments ||
      d.finance?.bills.length ||
      d.finance?.budgets.length,
  );
}

/** Envia o resumo. `force` manda mesmo sem pendências (botão de teste). */
export async function sendDigest(d: TodayData, opts: { force?: boolean; host?: string } = {}) {
  if (process.env.CRM_DIGEST === "off" && !opts.force) return { skipped: "CRM_DIGEST=off" };
  if (!opts.force && !digestHasContent(d)) return { skipped: "nada pendente hoje" };
  const profile = await withAuth(async (db) => {
    const { rows } = await db.query(`SELECT name, email FROM profile WHERE id = 1`);
    return rows[0] as { name?: string; email?: string } | undefined;
  });
  const to = process.env.CRM_DIGEST_EMAIL?.trim() || process.env.CONTACT_NOTIFY_EMAIL?.trim() || profile?.email?.trim();
  if (!to) return { skipped: "sem e-mail de destino (CRM_DIGEST_EMAIL ou Meus dados)" };
  const base = resolvePublicBaseUrl(opts.host) ?? "https://orcamentos.devbossle.com.br";
  const panelUrl = `${base}${appPathPrefix(base)}`;
  const t = d.tasks;
  const subject = `Hoje: ${(t?.dueToday.length ?? 0)} tarefas${t?.overdue.length ? `, ${t.overdue.length} atrasadas` : ""}${d.proposals?.length ? ` · ${d.proposals.length} propostas paradas` : ""}`;
  const r = await getResend().emails.send({
    from: getResendFrom(),
    to,
    subject,
    html: buildDigestHtml(d, { name: profile?.name ?? "", panelUrl }),
  });
  if (r.error) throw new Error(r.error.message);
  return { sent: to, id: r.data?.id ?? null };
}
