import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { pluggy, pluggyConfigured } from "../../_lib/pluggy.js";
import { WEBHOOK_HEADER, webhookSecret } from "../../_lib/pluggyWebhook.js";
import { resolvePublicBaseUrl } from "../../_lib/publicUrl.js";

type Hook = { id: string; event: string; url: string; disabledAt?: string | null; createdAt?: string };

function webhookUrl(req: VercelRequest): string | null {
  const env = process.env.PLUGGY_WEBHOOK_URL?.trim();
  if (env) return env;
  const base = resolvePublicBaseUrl(String(req.headers.host ?? ""));
  if (!base) return null;
  const url = `${new URL(base).origin}/api/orcamentos/finance/webhook`;
  return url.startsWith("https://") ? url : null; // a Pluggy só chama https público
}

/**
 * GET  → { url, registered, hook }
 * POST → registra (ou atualiza) o webhook "all" na Pluggy apontando para este painel
 * DELETE → remove o webhook
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (!pluggyConfigured()) return json(res, 400, { error: "Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel" });
  const url = webhookUrl(req);

  try {
    const list = await pluggy<{ results?: Hook[] } | Hook[]>("/webhooks");
    const hooks = Array.isArray(list) ? list : (list.results ?? []);
    const mine = url ? hooks.find((h) => h.url === url) : undefined;

    if (req.method === "GET") {
      return json(res, 200, { url, registered: Boolean(mine && !mine.disabledAt), hook: mine ?? null });
    }

    if (req.method === "POST") {
      if (!url) {
        return json(res, 400, {
          error: "Defina ORCAMENTOS_PUBLIC_URL (https) ou PLUGGY_WEBHOOK_URL para a Pluggy conseguir chamar o painel",
        });
      }
      const body = { event: "all", url, headers: { [WEBHOOK_HEADER]: webhookSecret() } };
      const hook = mine
        ? await pluggy<Hook>(`/webhooks/${encodeURIComponent(mine.id)}`, { method: "PATCH", body })
        : await pluggy<Hook>("/webhooks", { method: "POST", body });
      return json(res, 200, { url, registered: true, hook });
    }

    if (req.method === "DELETE") {
      if (mine) await pluggy(`/webhooks/${encodeURIComponent(mine.id)}`, { method: "DELETE" });
      return json(res, 200, { url, registered: false, hook: null });
    }

    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("pluggy webhook setup:", error);
    return json(res, 502, { error: error instanceof Error ? error.message : "Falha ao falar com a Pluggy" });
  }
}
