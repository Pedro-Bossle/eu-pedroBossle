import { GEMINI_DEFAULT_MODEL } from "./gemini.js";

/** Chave e modelo vêm do ambiente (Vercel / .env) — não da sessão nem do Neon. */
export function geminiApiKey(): string {
  return String(process.env.GEMINI_API_KEY ?? "").trim();
}

export function geminiModel(): string {
  const fromEnv = String(process.env.GEMINI_MODEL ?? "").trim();
  return fromEnv || GEMINI_DEFAULT_MODEL;
}

export function geminiConfigured(): boolean {
  return geminiApiKey().length >= 20;
}
