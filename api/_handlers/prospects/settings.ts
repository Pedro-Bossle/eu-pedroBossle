import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { GEMINI_DEFAULT_MODEL } from "../../_lib/gemini.js";
import {
  geminiApiKey,
  geminiConfigured,
  geminiModel,
} from "../../_lib/geminiEnv.js";

/**
 * Status da integração Gemini (somente leitura).
 * Chave e modelo vêm de GEMINI_API_KEY / GEMINI_MODEL no ambiente.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;

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
