/**
 * Busca de leads com a API do Gemini usando o embasamento no Google Maps
 * (negócios reais, com endereço, telefone e site) e na Pesquisa Google
 * (para olhar os sites encontrados). Roda só no servidor: a chave não vai ao navegador.
 */

/** Flash estável no free tier (Maps grounding ~500 req/dia). */
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

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

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
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
    tools: [{ googleMaps: {} }, { googleSearch: {} }],
  };
  if (coords) body.toolConfig = { retrievalConfig: { latLng: coords } };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 55_000);
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(opts.model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new GeminiError("O Gemini demorou demais para responder. Tente com menos resultados.", 504);
    }
    throw new GeminiError("Não foi possível falar com o Gemini agora.");
  } finally {
    clearTimeout(timer);
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
      groundingMetadata?: { groundingChunks?: MapsChunk[]; webSearchQueries?: string[] };
    }[];
    promptFeedback?: { blockReason?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message ?? "";
    if (res.status === 400 && /api key/i.test(msg)) {
      throw new GeminiError("A chave do Gemini foi recusada. Confira a chave salva em Prospecção → Gemini.", 400);
    }
    if (res.status === 403) {
      throw new GeminiError("A chave não tem permissão para a API do Gemini. Confira as restrições da chave no Google Cloud.", 403);
    }
    if (res.status === 404) {
      throw new GeminiError(`O modelo "${opts.model}" não foi encontrado. Troque o modelo em Prospecção → Gemini.`, 400);
    }
    if (res.status === 429) {
      throw new GeminiError(
        "Cota do Google AI Studio esgotada (429). A chave está ok — no free tier o Maps/Search grounding costuma ser ~500 pedidos/dia. Espere o reset (meia-noite PT) ou ative faturamento no projeto Google Cloud / AI Studio.",
        429,
      );
    }
    throw new GeminiError(msg ? `Gemini: ${msg}` : `Gemini respondeu com erro ${res.status}.`);
  }

  const cand = data.candidates?.[0];
  if (!cand) {
    throw new GeminiError(
      data.promptFeedback?.blockReason
        ? "O Gemini recusou a busca. Tente descrever o nicho de outro jeito."
        : "O Gemini não devolveu resultados.",
    );
  }

  const text = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("");
  const rows = extractJsonArray(text);
  if (rows === null) {
    throw new GeminiError("O Gemini respondeu fora do formato esperado. Tente buscar de novo.");
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
