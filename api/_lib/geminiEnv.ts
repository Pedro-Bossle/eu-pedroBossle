import { GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODELS } from "./gemini.js";

/** Chave e modelo vêm do ambiente (Vercel / .env) — não da sessão nem do Neon. */
export function geminiApiKey(): string {
  return String(process.env.GEMINI_API_KEY ?? "").trim();
}

export function geminiModel(): string {
  const fromEnv = String(process.env.GEMINI_MODEL ?? "").trim();
  return fromEnv || GEMINI_DEFAULT_MODEL;
}

/**
 * Ordem de tentativa na busca: GEMINI_MODEL e depois os de reserva
 * (GEMINI_FALLBACK_MODELS separados por vírgula; padrão 2.5 Flash e Flash-Lite,
 * que têm busca grátis). GEMINI_FALLBACK_MODELS=none desliga a reserva.
 */
export function geminiModels(): string[] {
  const raw = String(process.env.GEMINI_FALLBACK_MODELS ?? "").trim();
  const fallbacks =
    raw.toLowerCase() === "none"
      ? []
      : raw
        ? raw.split(",").map((s) => s.trim()).filter(Boolean)
        : GEMINI_FALLBACK_MODELS;
  return [...new Set([geminiModel(), ...fallbacks])];
}

export function geminiConfigured(): boolean {
  return geminiApiKey().length >= 20;
}
