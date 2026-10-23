import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { GEMINI_DEFAULT_MODEL, checkGemini } from "../../_lib/gemini.js";
import {
  geminiApiKey,
  geminiConfigured,
  geminiModel,
  geminiModels,
} from "../../_lib/geminiEnv.js";

import { rateLimit } from "../../_lib/rateLimit.js";

/**
 * Status da integração Gemini (GET) e teste de conexão (POST).
 * Chave e modelo vêm de GEMINI_API_KEY / GEMINI_MODEL no ambiente.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await requireSession(req, res);
  if (!session) return;

  if (req.method === "POST") {
    if (!geminiConfigured()) {
      return json(res, 400, {
        error: "GEMINI_API_KEY não configurada no ambiente. Defina na Vercel (Production) e faça um novo deploy.",
      });
    }
    const rl = rateLimit(`prospects-check:${session.sub}`, 3, 60_000);
    if (!rl.ok) {
      return json(res, 429, { error: `Espere ${rl.retryAfterSec}s para testar de novo (limite do painel, não do Google).` });
    }
    try {
      const { model, ...check } = await checkGemini(geminiApiKey(), geminiModels());
      return json(res, 200, { check, model });
    } catch (error) {
      console.error(error);
      return json(res, 500, { error: "Falha ao testar o Gemini" });
    }
  }

  if (req.method !== "GET") {
    return json(res, 405, {
      error:
        "Method not allowed. Configure GEMINI_API_KEY e GEMINI_MODEL no ambiente (Vercel / .env).",
    });
  }

  try {
    const key = geminiApiKey();
    return json(res, 200, {
      settings: {
        configured: geminiConfigured(),
        last4: key ? key.slice(-4) : "",
        model: geminiModel(),
        fallbackModels: geminiModels().slice(1),
        defaultModel: GEMINI_DEFAULT_MODEL,
        updated: null,
        source: "env" as const,
      },
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "Falha ao ler a configuração do Gemini" });
  }
}
