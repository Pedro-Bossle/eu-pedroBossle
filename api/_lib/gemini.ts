/**
 * Busca de leads com a API do Gemini usando o embasamento no Google Maps
 * (negócios reais, com endereço, telefone e site) e na Pesquisa Google
 * (para olhar os sites encontrados). Roda só no servidor: a chave não vai ao navegador.
 */

/**
 * Flash padrão para chaves novas (AI Studio).
 * gemini-2.5-flash ainda existe, mas o Google devolve 404 para projetos novos —
 * a própria API recomenda gemini-3.8-flash.
 */
export const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";

/**
 * Modelos tentados quando o principal não tem busca liberada.
 * Os 2.5 têm busca grátis no plano gratuito (até 500 pedidos/dia na Pesquisa
 * Google e 500 no Maps); os 3.x só com faturamento. Projetos novos podem não
 * ter acesso ao 2.5 (404) — aí o fallback é pulado.
 */
export const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

/** Pesquisa Google + Maps juntos só a partir do 3.5; antes disso, só o Maps. */
export function groundingTools(model: string): Record<string, unknown>[] {
  const m = model.match(/gemini-(\d+)(?:\.(\d+))?/i);
  const version = m ? Number(m[1]) + Number(m[2] ?? 0) / 10 : 99;
  return version >= 3.5 ? [{ googleMaps: {} }, { googleSearch: {} }] : [{ googleMaps: {} }];
}

/** Vale tentar o próximo modelo? (busca não liberada ou modelo indisponível) */
const tryNext = (e: unknown) =>
  e instanceof GeminiError && (e.code === "free_tier_grounding" || e.code === "model_not_found");

function allModelsFailed(models: string[], errors: GeminiError[]): GeminiError {
  const freeTier = errors.some((e) => e.code === "free_tier_grounding");
  const old = models.filter((m) => /gemini-2\./.test(m));
  const oldMissing = old.length > 0 && errors.filter((e) => e.code === "model_not_found").length >= old.length;
  const detail = errors.map((e, i) => `${models[i]}: ${e.detail || e.message}`).join(" | ").slice(0, 600);
  if (freeTier && oldMissing) {
    return new GeminiError(
      "Esta chave é de um projeto novo no plano gratuito: os modelos 3.x não têm busca no Google sem faturamento, e o Google não libera o Gemini 2.5 (que tem busca grátis) para projetos novos. Use uma chave de um projeto mais antigo que ainda acessa o 2.5 — como a do seu outro sistema — ou ative o faturamento.",
      429,
      "free_tier_grounding",
      detail,
    );
  }
  const last = errors[errors.length - 1];
  return new GeminiError(last.message, last.status, last.code, detail);
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** Coordenadas para puxar os resultados do Maps para a cidade certa. */
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  "caxias do sul": { latitude: -29.1678, longitude: -51.1794 },
  "bento goncalves": { latitude: -29.1699, longitude: -51.5185 },
  farroupilha: { latitude: -29.2227, longitude: -51.3419 },
  "flores da cunha": { latitude: -29.0289, longitude: -51.1817 },
  "garibaldi": { latitude: -29.2564, longitude: -51.5336 },
  "carlos barbosa": { latitude: -29.2969, longitude: -51.5028 },
  "nova petropolis": { latitude: -29.3758, longitude: -51.1136 },
  gramado: { latitude: -29.3734, longitude: -50.8762 },
  canela: { latitude: -29.3658, longitude: -50.8156 },
  "porto alegre": { latitude: -30.0346, longitude: -51.2177 },
};

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export type GeminiLead = {
  name: string;
  niche: string;
  address: string;
  neighborhood: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  problems: string;
  pitch: string;
  mapsUrl: string;
};

export type GeminiErrorCode =
  | "free_tier_grounding"
  | "rate_limit_minute"
  | "quota_daily"
  | "quota"
  | "invalid_key"
  | "forbidden"
  | "model_not_found"
  | "timeout"
  | "network"
  | "blocked"
  | "bad_format"
  | "unknown";

export class GeminiError extends Error {
  status: number;
  code: GeminiErrorCode;
  /** Mensagem original do Google (para diagnóstico no painel). */
  detail: string;
  constructor(message: string, status = 502, code: GeminiErrorCode = "unknown", detail = "") {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

type GoogleErrorBody = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: {
      "@type"?: string;
      retryDelay?: string;
      violations?: { quotaMetric?: string; quotaId?: string; quotaValue?: string }[];
    }[];
  };
};

/**
 * Traduz o erro do Google em algo acionável.
 * Importante: no plano gratuito o Google NÃO libera embasamento no Google Maps
 * nem na Pesquisa Google ("Not available" na tabela de preços). Uma chave sem
 * faturamento recebe 429 com limite 0 já no primeiro pedido, mesmo sem uso no dia.
 */
export function explainGeminiError(status: number, body: GoogleErrorBody, model: string): GeminiError {
  const msg = body.error?.message ?? "";
  const detail = msg.slice(0, 400);
  const details = body.error?.details ?? [];
  const violations = details.flatMap((d) => d.violations ?? []);
  const quotaText = [msg, ...violations.map((v) => `${v.quotaId ?? ""} ${v.quotaMetric ?? ""} ${v.quotaValue ?? ""}`)].join(" ");
  const retry = details.find((d) => d.retryDelay)?.retryDelay ?? "";
  const retrySec = Math.ceil(parseFloat(retry) || 0);

  if (status === 400 && /api key/i.test(msg)) {
    return new GeminiError("A GEMINI_API_KEY foi recusada pelo Google. Confira a chave no ambiente (Vercel / .env) e faça um novo deploy.", 400, "invalid_key", detail);
  }
  if (status === 403) {
    return new GeminiError("A chave não tem permissão para a API do Gemini. No Google Cloud, libere a “Generative Language API” nas restrições da chave.", 403, "forbidden", detail);
  }
  if (status === 404) {
    return new GeminiError(
      `O modelo "${model}" não está disponível para esta chave. Defina GEMINI_MODEL=${GEMINI_DEFAULT_MODEL} no ambiente.`,
      400,
      "model_not_found",
      detail,
    );
  }
  if (status === 429) {
    const zeroLimit =
      /limit:\s*0\b/i.test(msg) ||
      violations.some((v) => v.quotaValue === "0") ||
      (/free_?tier/i.test(quotaText) && /ground|search|maps/i.test(quotaText));
    if (zeroLimit) {
      return new GeminiError(
        `No plano gratuito, o ${model} não tem busca no Google Maps nem na Pesquisa Google — por isso o 429 mesmo sem uso no dia. Use o Gemini 2.5 Flash (busca grátis, até 500 pedidos/dia) ou ative o faturamento do projeto no Google AI Studio.`,
        429,
        "free_tier_grounding",
        detail,
      );
    }
    if (/per.?minute|PerMinute/i.test(quotaText) || (retrySec > 0 && retrySec <= 120)) {
      return new GeminiError(
        `Limite por minuto do Gemini atingido. Tente de novo em ${retrySec || 60}s.`,
        429,
        "rate_limit_minute",
        detail,
      );
    }
    if (/per.?day|PerDay/i.test(quotaText)) {
      return new GeminiError(
        "Cota diária do Gemini esgotada. Ela reinicia à meia-noite no horário do Pacífico (5h em Brasília).",
        429,
        "quota_daily",
        detail,
      );
    }
    return new GeminiError(
      "O Google recusou por cota (429). Veja o detalhe abaixo e confira o uso em aistudio.google.com/rate-limit.",
      429,
      "quota",
      detail,
    );
  }
  return new GeminiError(msg ? `Gemini: ${msg.slice(0, 200)}` : `Gemini respondeu com erro ${status}.`, 502, "unknown", detail);
}

async function callGemini(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new GeminiError("O Gemini demorou demais para responder. Tente com menos resultados.", 504, "timeout");
    }
    throw new GeminiError("Não foi possível falar com o Gemini agora.", 502, "network");
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw explainGeminiError(res.status, data as GoogleErrorBody, model);
  return data;
}

export type GeminiCheck = {
  key: { ok: boolean; message: string; detail?: string };
  grounding: { ok: boolean; message: string; code?: GeminiErrorCode; detail?: string } | null;
};

/**
 * Diagnóstico em duas etapas:
 * 1. pedido simples (sem ferramentas) — confirma chave e modelo, funciona até no plano gratuito;
 * 2. pedido com Pesquisa Google — confirma se o projeto libera embasamento (exige faturamento).
 */
export async function checkGemini(apiKey: string, models: string[]): Promise<GeminiCheck & { model: string }> {
  const primary = models[0];
  try {
    await callGemini(apiKey, primary, { contents: [{ role: "user", parts: [{ text: "Responda apenas: OK" }] }] }, 20_000);
  } catch (e) {
    const err = e as GeminiError;
    // Modelo principal indisponível: o teste de busca abaixo ainda tenta os de reserva
    if (err.code !== "model_not_found") {
      return { key: { ok: false, message: err.message, detail: err.detail }, grounding: null, model: primary };
    }
  }
  const errors: GeminiError[] = [];
  for (const model of models) {
    try {
      await callGemini(
        apiKey,
        model,
        {
          contents: [{ role: "user", parts: [{ text: "Em uma frase curta: onde fica a Prefeitura de Caxias do Sul?" }] }],
          tools: groundingTools(model),
        },
        30_000,
      );
      return {
        key: { ok: true, message: "Chave funcionando." },
        grounding: {
          ok: true,
          message:
            model === primary
              ? `Busca no Google liberada com ${model}.`
              : `Busca liberada com ${model} (o ${primary} não tem busca nesta chave). A Prospecção vai usar o ${model} automaticamente.`,
        },
        model,
      };
    } catch (e) {
      if (!tryNext(e)) {
        const err = e as GeminiError;
        return { key: { ok: true, message: "Chave funcionando." }, grounding: { ok: false, message: err.message, code: err.code, detail: err.detail }, model };
      }
      errors.push(e as GeminiError);
    }
  }
  const err = allModelsFailed(models, errors);
  return {
    key: { ok: true, message: "Chave funcionando." },
    grounding: { ok: false, message: err.message, code: err.code, detail: err.detail },
    model: primary,
  };
}

function buildPrompt(niche: string, city: string, limit: number, skip: string[]) {
  const skipText = skip.length
    ? `\nJá tenho estes negócios na lista, não repita nenhum deles: ${skip.join("; ")}.`
    : "";
  return `Você ajuda a Dev Bossle, que faz sites para negócios locais, a encontrar clientes.

Use o Google Maps para encontrar até ${limit} negócios do nicho "${niche}" em ${city}. Dê preferência a negócios que não têm site próprio ou que têm um site fraco.

Para cada negócio que tiver site, use a Pesquisa Google para conferir o site e anote problemas reais e concretos, por exemplo: fora do ar, não abre direito no celular, muito lento, sem botão de WhatsApp, telefone ou endereço desatualizado, visual muito antigo, sem informação de serviços ou horário. Não invente nada: deixe o campo vazio quando não tiver certeza.${skipText}

Responda SOMENTE com um array JSON, sem nenhum texto antes ou depois. Cada item deve ter exatamente estas chaves:
- "nome": nome do negócio como aparece no Google Maps
- "nicho": tipo de negócio, curto
- "endereco": rua e número
- "bairro": bairro
- "telefone": telefone principal, com DDD
- "whatsapp": número de WhatsApp com DDD, se o negócio divulgar um (senão vazio)
- "email": e-mail público, se houver
- "site": endereço do site próprio; vazio se não tiver (perfil de Instagram, Facebook, Linktree ou diretório NÃO conta como site)
- "instagram": @ do Instagram, se houver
- "problemas": problemas encontrados no site, em frases curtas separadas por ";" (vazio se não tiver site)
- "argumento": uma ou duas frases dizendo por que um site novo ajudaria esse negócio a conseguir mais clientes`;
}

/** Pega o array JSON da resposta; null quando não há um array legível. */
function extractJsonArray(text: string): unknown[] | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

type MapsChunk = { maps?: { uri?: string; title?: string; placeId?: string } };

export async function searchLeadsWithGemini(opts: {
  apiKey: string;
  /** Em ordem de preferência; o próximo só é tentado se o anterior não tiver busca liberada. */
  models: string[];
  niche: string;
  city: string;
  limit: number;
  skip: string[];
  timeoutMs?: number;
}): Promise<{ leads: GeminiLead[]; queries: string[]; model: string }> {
  const errors: GeminiError[] = [];
  for (const model of opts.models) {
    try {
      return { ...(await searchWithModel({ ...opts, model })), model };
    } catch (e) {
      if (!tryNext(e)) throw e;
      errors.push(e as GeminiError);
    }
  }
  throw allModelsFailed(opts.models, errors);
}

async function searchWithModel(opts: {
  apiKey: string;
  model: string;
  niche: string;
  city: string;
  limit: number;
  skip: string[];
  timeoutMs?: number;
}): Promise<{ leads: GeminiLead[]; queries: string[] }> {
  const coords = CITY_COORDS[plain(opts.city)];
  const body: Record<string, unknown> = {
    contents: [
      { role: "user", parts: [{ text: buildPrompt(opts.niche, opts.city, opts.limit, opts.skip) }] },
    ],
    tools: groundingTools(opts.model),
  };
  if (coords) body.toolConfig = { retrievalConfig: { latLng: coords } };

  const data = (await callGemini(opts.apiKey, opts.model, body, opts.timeoutMs ?? 55_000)) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
      groundingMetadata?: { groundingChunks?: MapsChunk[]; webSearchQueries?: string[] };
    }[];
    promptFeedback?: { blockReason?: string };
  };

  const cand = data.candidates?.[0];
  if (!cand) {
    throw new GeminiError(
      data.promptFeedback?.blockReason
        ? "O Gemini recusou a busca. Tente descrever o nicho de outro jeito."
        : "O Gemini não devolveu resultados.",
      502,
      data.promptFeedback?.blockReason ? "blocked" : "unknown",
    );
  }

  const text = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const rows = extractJsonArray(text);
  if (rows === null) {
    throw new GeminiError("O Gemini respondeu fora do formato esperado. Tente buscar de novo.", 502, "bad_format");
  }
  const chunks = (cand.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.maps)
    .filter((m): m is { uri?: string; title?: string } => Boolean(m?.uri));

  const leads: GeminiLead[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = str(r.nome ?? r.name);
    if (!name) continue;
    const key = plain(name);
    const chunk = chunks.find((c) => {
      const t = plain(c.title ?? "");
      return t && (t === key || t.includes(key) || key.includes(t));
    });
    leads.push({
      name,
      niche: str(r.nicho ?? r.niche),
      address: str(r.endereco ?? r.address),
      neighborhood: str(r.bairro ?? r.neighborhood),
      phone: str(r.telefone ?? r.phone),
      whatsapp: str(r.whatsapp),
      email: str(r.email),
      website: str(r.site ?? r.website),
      instagram: str(r.instagram),
      problems: str(r.problemas ?? r.problems),
      pitch: str(r.argumento ?? r.pitch),
      mapsUrl: chunk?.uri ?? "",
    });
  }

  return { leads, queries: cand.groundingMetadata?.webSearchQueries ?? [] };
}
