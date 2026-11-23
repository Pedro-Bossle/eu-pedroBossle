import type { PoolClient } from "@neondatabase/serverless";
import { open, seal } from "./secretBox.js";

/**
 * Instagram API com login do Instagram (graph.instagram.com).
 * Escopos: instagram_business_basic, instagram_business_content_publish,
 * instagram_business_manage_comments, instagram_business_manage_insights.
 */
const GRAPH = "https://graph.instagram.com";
const version = () => process.env.META_GRAPH_VERSION?.trim() || "v24.0";

export const IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
];

export class IgError extends Error {
  code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.code = code;
  }
}

type Params = Record<string, string | number | boolean | undefined>;

export async function ig<T = Record<string, unknown>>(
  token: string,
  path: string,
  opts: { method?: "GET" | "POST" | "DELETE"; params?: Params; versioned?: boolean } = {},
): Promise<T> {
  const method = opts.method ?? "GET";
  const base = opts.versioned === false ? GRAPH : `${GRAPH}/${version()}`;
  const url = new URL(path.startsWith("http") ? path : `${base}/${path.replace(/^\//, "")}`);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined) params.set(k, String(v));
  }
  if (!url.searchParams.has("access_token")) params.set("access_token", token);

  let res: Response;
  if (method === "POST") {
    res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  } else {
    for (const [k, v] of params) url.searchParams.set(k, v);
    res = await fetch(url, { method });
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number; error_user_msg?: string };
  };
  if (!res.ok || data.error) {
    const e = data.error;
    throw new IgError(e?.error_user_msg || e?.message || `Instagram ${res.status}`, e?.code ?? res.status);
  }
  return data as T;
}

// ---------- Credencial ----------

export type IgAccountMeta = {
  userId: string;
  username: string;
  name: string;
  picture: string;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
  accountType: string;
  connectedAt: string;
  refreshedAt: string;
  expiryGuessed?: boolean;
  insights28d?: Record<string, number>;
  insightsAt?: string;
  publishQuota?: { used: number; total: number } | null;
};

export type IgCredential = { token: string; meta: IgAccountMeta; expiresAt: Date | null };

const PROVIDER = "instagram";

export async function loadIgCredential(db: PoolClient): Promise<IgCredential | null> {
  const { rows } = await db.query(
    `SELECT secret_enc, meta, expires_at FROM integration_credentials WHERE provider = $1`,
    [PROVIDER],
  );
  const row = rows[0];
  if (!row?.secret_enc) return null;
  return {
    token: open(String(row.secret_enc)),
    meta: row.meta as IgAccountMeta,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
  };
}

export async function saveIgCredential(
  db: PoolClient,
  token: string,
  meta: IgAccountMeta,
  expiresAt: Date | null,
) {
  await db.query(
    `INSERT INTO integration_credentials (provider, secret_enc, last4, meta, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (provider) DO UPDATE SET
       secret_enc = EXCLUDED.secret_enc, last4 = EXCLUDED.last4, meta = EXCLUDED.meta,
       expires_at = EXCLUDED.expires_at, updated_at = now()`,
    [PROVIDER, seal(token), token.slice(-4), JSON.stringify(meta), expiresAt],
  );
}

export async function saveIgMeta(db: PoolClient, meta: IgAccountMeta) {
  await db.query(
    `UPDATE integration_credentials SET meta = $2, updated_at = now() WHERE provider = $1`,
    [PROVIDER, JSON.stringify(meta)],
  );
}

export async function deleteIgCredential(db: PoolClient) {
  await db.query(`DELETE FROM integration_credentials WHERE provider = $1`, [PROVIDER]);
}

type MeResponse = {
  id?: string;
  user_id?: string | number;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  account_type?: string;
};

export async function fetchProfile(token: string): Promise<Omit<IgAccountMeta, "connectedAt" | "refreshedAt">> {
  const me = await ig<MeResponse>(token, "me", {
    params: {
      fields:
        "user_id,username,name,profile_picture_url,followers_count,follows_count,media_count,account_type",
    },
  });
  const userId = String(me.user_id ?? me.id ?? "");
  if (!userId) throw new IgError("Não consegui ler o ID da conta do Instagram");
  return {
    userId,
    username: me.username ?? "",
    name: me.name ?? "",
    picture: me.profile_picture_url ?? "",
    followers: me.followers_count ?? null,
    follows: me.follows_count ?? null,
    mediaCount: me.media_count ?? null,
    accountType: me.account_type ?? "",
  };
}

/** Troca token curto (OAuth) por um de 60 dias. Exige META_APP_SECRET. */
export async function exchangeLongLived(token: string): Promise<{ token: string; expiresIn: number } | null> {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return null;
  try {
    const r = await ig<{ access_token: string; expires_in: number }>(token, "access_token", {
      versioned: false,
      params: { grant_type: "ig_exchange_token", client_secret: secret },
    });
    return { token: r.access_token, expiresIn: Number(r.expires_in) || 60 * 86400 };
  } catch {
    return null; // já era longo, ou app secret de outro app
  }
}

/** Conecta com um token (colado no painel ou vindo do OAuth). */
export async function connectIg(db: PoolClient, rawToken: string): Promise<IgAccountMeta> {
  let token = rawToken.trim();
  let expiresAt: Date;
  let guessed = false;
  const exchanged = await exchangeLongLived(token);
  if (exchanged) {
    token = exchanged.token;
    expiresAt = new Date(Date.now() + exchanged.expiresIn * 1000);
  } else {
    // Token longo colado à mão: tenta renovar para descobrir a validade real
    const refreshed = await refreshToken(token).catch(() => null);
    if (refreshed) {
      token = refreshed.token;
      expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
    } else {
      expiresAt = new Date(Date.now() + 60 * 86400 * 1000);
      guessed = true;
    }
  }
  const profile = await fetchProfile(token);
  const now = new Date().toISOString();
  const meta: IgAccountMeta = { ...profile, connectedAt: now, refreshedAt: now, expiryGuessed: guessed };
  await saveIgCredential(db, token, meta, expiresAt);
  return meta;
}

async function refreshToken(token: string) {
  const r = await ig<{ access_token: string; expires_in: number }>(token, "refresh_access_token", {
    versioned: false,
    params: { grant_type: "ig_refresh_token" },
  });
  return { token: r.access_token, expiresIn: Number(r.expires_in) || 60 * 86400 };
}

/** Renova o token se faltar menos de `days` dias (o Instagram só renova tokens com 24h+). */
export async function refreshIfNeeded(db: PoolClient, cred: IgCredential, days = 20): Promise<IgCredential> {
  const left = cred.expiresAt ? cred.expiresAt.getTime() - Date.now() : 0;
  const age = Date.now() - new Date(cred.meta.refreshedAt || 0).getTime();
  if (left > days * 86400_000 || age < 86400_000) return cred;
  const r = await refreshToken(cred.token);
  const meta = { ...cred.meta, refreshedAt: new Date().toISOString(), expiryGuessed: false };
  const expiresAt = new Date(Date.now() + r.expiresIn * 1000);
  await saveIgCredential(db, r.token, meta, expiresAt);
  return { token: r.token, meta, expiresAt };
}

// ---------- Sincronização (biblioteca, métricas, comentários) ----------

type IgMediaApi = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
};

type IgCommentApi = {
  id: string;
  text?: string;
  username?: string;
  timestamp?: string;
  hidden?: boolean;
  replies?: { data?: IgCommentApi[] };
};

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return out;
}

async function mediaInsights(token: string, m: IgMediaApi) {
  for (const metric of ["reach,saved,shares,views", "reach,saved,shares", "reach"]) {
    try {
      const r = await ig<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
        token,
        `${m.id}/insights`,
        { params: { metric } },
      );
      const vals: Record<string, number> = {};
      for (const d of r.data ?? []) {
        vals[d.name] = Number(d.total_value?.value ?? d.values?.[0]?.value ?? 0);
      }
      return vals;
    } catch {
      /* tenta um conjunto menor de métricas */
    }
  }
  return null;
}

export type SyncResult = { media: number; comments: number; insights: number; warnings: string[] };

export async function syncInstagram(db: PoolClient, cred: IgCredential, opts: { pages?: number } = {}): Promise<SyncResult> {
  const { token } = cred;
  const warnings: string[] = [];

  // Perfil + insights da conta (28 dias) + cota de publicação
  const profile = await fetchProfile(token);
  const meta: IgAccountMeta = { ...cred.meta, ...profile };
  try {
    const until = Math.floor(Date.now() / 1000);
    const since = until - 28 * 86400;
    const r = await ig<{ data: { name: string; total_value?: { value: number } }[] }>(
      token,
      `${profile.userId}/insights`,
      {
        params: {
          metric: "reach,views,accounts_engaged,total_interactions,profile_links_taps",
          period: "day",
          metric_type: "total_value",
          since,
          until,
        },
      },
    );
    meta.insights28d = Object.fromEntries((r.data ?? []).map((d) => [d.name, Number(d.total_value?.value ?? 0)]));
    meta.insightsAt = new Date().toISOString();
  } catch (e) {
    warnings.push(`Insights da conta: ${e instanceof Error ? e.message : e}`);
  }
  try {
    const q = await ig<{ data: { quota_usage?: number; config?: { quota_total?: number } }[] }>(
      token,
      `${profile.userId}/content_publishing_limit`,
      { params: { fields: "quota_usage,config" } },
    );
    const d = q.data?.[0];
    meta.publishQuota = d ? { used: Number(d.quota_usage ?? 0), total: Number(d.config?.quota_total ?? 100) } : null;
  } catch {
    meta.publishQuota = null;
  }
  await saveIgMeta(db, meta);

  // Mídias (paginado)
  const media: IgMediaApi[] = [];
  let next: string | null = `${profile.userId}/media`;
  let first = true;
  for (let page = 0; next && page < (opts.pages ?? 4); page += 1) {
    const r: { data?: IgMediaApi[]; paging?: { next?: string } } = await ig(token, next, {
      params: first
        ? {
            fields:
              "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
            limit: 50,
          }
        : {},
    });
    first = false;
    media.push(...(r.data ?? []));
    next = r.paging?.next ?? null;
  }

  for (const m of media) {
    await db.query(
      `INSERT INTO ig_media (id, caption, media_type, media_product_type, media_url, thumbnail_url,
         permalink, posted_at, like_count, comments_count, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
       ON CONFLICT (id) DO UPDATE SET
         caption = EXCLUDED.caption, media_type = EXCLUDED.media_type,
         media_product_type = EXCLUDED.media_product_type, media_url = EXCLUDED.media_url,
         thumbnail_url = EXCLUDED.thumbnail_url, permalink = EXCLUDED.permalink,
         posted_at = EXCLUDED.posted_at, like_count = EXCLUDED.like_count,
         comments_count = EXCLUDED.comments_count, synced_at = now()`,
      [
        m.id,
        m.caption ?? "",
        m.media_type ?? "",
        m.media_product_type ?? "",
        m.media_url ?? "",
        m.thumbnail_url ?? "",
        m.permalink ?? "",
        m.timestamp ?? null,
        m.like_count ?? null,
        m.comments_count ?? null,
      ],
    );
  }

  // Métricas dos 30 posts mais recentes
  const recent = media.slice(0, 30);
  const insights = await pool(recent, 5, (m) => mediaInsights(token, m));
  let insightCount = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const v = insights[i];
    if (!v) continue;
    insightCount += 1;
    await db.query(
      `UPDATE ig_media SET reach = $2, views = $3, saved = $4, shares = $5, insights_at = now() WHERE id = $1`,
      [recent[i]!.id, v.reach ?? null, v.views ?? null, v.saved ?? null, v.shares ?? null],
    );
  }

  // Comentários dos 25 posts recentes que têm comentário
  const withComments = media.filter((m) => (m.comments_count ?? 0) > 0).slice(0, 25);
  const commentCount = await syncComments(db, token, profile.username, withComments.map((m) => m.id), warnings);

  return { media: media.length, comments: commentCount, insights: insightCount, warnings };
}

/**
 * Baixa de novo os comentários (e respostas) das mídias informadas e grava em ig_comments.
 * As mídias precisam já existir em ig_media (FK). Devolve quantos comentários foram gravados.
 */
export async function syncComments(
  db: PoolClient,
  token: string,
  username: string,
  mediaIds: string[],
  warnings: string[] = [],
): Promise<number> {
  const me = username.toLowerCase();
  const threads = await pool(mediaIds, 5, async (mediaId) => {
    try {
      const r = await ig<{ data?: IgCommentApi[] }>(token, `${mediaId}/comments`, {
        params: { fields: "id,text,username,timestamp,hidden,replies{id,text,username,timestamp}", limit: 50 },
      });
      return { mediaId, comments: r.data ?? [] };
    } catch (e) {
      warnings.push(`Comentários de ${mediaId}: ${e instanceof Error ? e.message : e}`);
      return { mediaId, comments: [] as IgCommentApi[] };
    }
  });

  let commentCount = 0;
  const upsertComment = async (mediaId: string, c: IgCommentApi, parentId: string | null, answered: boolean) => {
    const fromMe = (c.username ?? "").toLowerCase() === me;
    const status = fromMe || answered ? "respondido" : "novo";
    await db.query(
      `INSERT INTO ig_comments (id, media_id, parent_id, username, text, posted_at, from_me, hidden, status, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text, hidden = EXCLUDED.hidden, synced_at = now(),
         status = CASE WHEN ig_comments.status = 'novo' AND EXCLUDED.status = 'respondido'
                       THEN 'respondido' ELSE ig_comments.status END`,
      [c.id, mediaId, parentId, c.username ?? "", c.text ?? "", c.timestamp ?? null, fromMe, Boolean(c.hidden), status],
    );
    commentCount += 1;
  };
  for (const t of threads) {
    for (const c of t.comments) {
      const replies = c.replies?.data ?? [];
      const answered = replies.some((r) => (r.username ?? "").toLowerCase() === me);
      await upsertComment(t.mediaId, c, null, answered);
      for (const r of replies) {
        // Respostas de terceiros dentro da thread também entram como "novo"
        const answeredLater = replies.some(
          (x) => (x.username ?? "").toLowerCase() === me && (x.timestamp ?? "") > (r.timestamp ?? ""),
        );
        await upsertComment(t.mediaId, r, c.id, answeredLater);
      }
    }
  }
  return commentCount;
}

/**
 * Atualização puxada pelo webhook (comentário/menção novos).
 * Com mediaId conhecido em ig_media: só os comentários dessa mídia.
 * Sem mediaId, ou mídia que ainda não está na biblioteca: sincronização leve (1 página de mídias).
 */
export async function refreshCommentsFromWebhook(db: PoolClient, cred: IgCredential, mediaId?: string): Promise<number> {
  if (mediaId && /^\d{5,30}$/.test(mediaId)) {
    const { rows } = await db.query(`SELECT 1 FROM ig_media WHERE id = $1`, [mediaId]);
    if (rows[0]) return syncComments(db, cred.token, cred.meta.username, [mediaId]);
  }
  const r = await syncInstagram(db, cred, { pages: 1 });
  return r.comments;
}

// ---------- Publicação ----------

export type IgPostRow = {
  id: string;
  kind: "image" | "carousel" | "reel" | "story";
  caption: string;
  media_urls: string[];
  cover_url: string;
  share_to_feed: boolean;
  container_id: string;
  child_ids: string[];
  attempts: number;
};

const isVideo = (url: string) => /\.(mp4|mov|m4v)(\?|#|$)/i.test(url);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function containerStatus(token: string, id: string) {
  const r = await ig<{ status_code?: string; status?: string }>(token, id, {
    params: { fields: "status_code,status" },
  });
  return { code: r.status_code ?? "IN_PROGRESS", detail: r.status ?? "" };
}

async function createContainer(token: string, userId: string, params: Params) {
  const r = await ig<{ id: string }>(token, `${userId}/media`, { method: "POST", params });
  return r.id;
}

export type PublishOutcome =
  | { state: "published"; mediaId: string; permalink: string }
  | { state: "pending"; containerId: string; childIds: string[] }
  | { state: "error"; error: string; containerId: string; childIds: string[] };

/**
 * Cria o(s) container(s) e publica quando o Instagram terminar de processar.
 * Vídeos podem levar minutos: nesse caso devolve "pending" e o próximo cron continua.
 */
export async function publishPost(cred: IgCredential, post: IgPostRow, waitMs = 20_000): Promise<PublishOutcome> {
  const { token } = cred;
  const userId = cred.meta.userId;
  const urls = post.media_urls.filter(Boolean);
  let containerId = post.container_id;
  const childIds = [...post.child_ids];

  try {
    if (!urls.length) throw new IgError("Adicione pelo menos uma mídia (URL pública)");

    if (!containerId) {
      if (post.kind === "carousel") {
        if (urls.length < 2 || urls.length > 10) throw new IgError("Carrossel precisa de 2 a 10 mídias");
        if (!childIds.length) {
          for (const url of urls) {
            childIds.push(
              await createContainer(
                token,
                userId,
                isVideo(url)
                  ? { media_type: "VIDEO", video_url: url, is_carousel_item: true }
                  : { image_url: url, is_carousel_item: true },
              ),
            );
          }
        }
        // Filhos de vídeo precisam terminar antes do container do carrossel
        const statuses = await Promise.all(childIds.map((id) => containerStatus(token, id)));
        const bad = statuses.find((s) => s.code === "ERROR" || s.code === "EXPIRED");
        if (bad) throw new IgError(`Mídia do carrossel recusada: ${bad.detail || bad.code}`);
        if (statuses.some((s) => s.code !== "FINISHED")) {
          return { state: "pending", containerId: "", childIds };
        }
        containerId = await createContainer(token, userId, {
          media_type: "CAROUSEL",
          children: childIds.join(","),
          caption: post.caption,
        });
      } else if (post.kind === "reel") {
        const url = urls[0]!;
        if (!isVideo(url)) throw new IgError("Reels precisa de um vídeo (.mp4 ou .mov)");
        containerId = await createContainer(token, userId, {
          media_type: "REELS",
          video_url: url,
          caption: post.caption,
          share_to_feed: post.share_to_feed,
          cover_url: post.cover_url || undefined,
        });
      } else if (post.kind === "story") {
        const url = urls[0]!;
        containerId = await createContainer(
          token,
          userId,
          isVideo(url) ? { media_type: "STORIES", video_url: url } : { media_type: "STORIES", image_url: url },
        );
      } else {
        const url = urls[0]!;
        if (isVideo(url)) throw new IgError("Para vídeo no feed use o tipo Reels");
        containerId = await createContainer(token, userId, { image_url: url, caption: post.caption });
      }
    }

    // Espera o processamento (curto para imagem; vídeo continua no próximo ciclo)
    const deadline = Date.now() + waitMs;
    let status = await containerStatus(token, containerId);
    while (status.code === "IN_PROGRESS" && Date.now() < deadline) {
      await sleep(3000);
      status = await containerStatus(token, containerId);
    }
    if (status.code === "ERROR" || status.code === "EXPIRED") {
      throw new IgError(`Instagram recusou a mídia: ${status.detail || status.code}`);
    }
    if (status.code !== "FINISHED" && status.code !== "PUBLISHED") {
      if (post.attempts >= 40) throw new IgError("O Instagram não terminou de processar a mídia a tempo");
      return { state: "pending", containerId, childIds };
    }

    const published = await ig<{ id: string }>(token, `${userId}/media_publish`, {
      method: "POST",
      params: { creation_id: containerId },
    });
    let permalink = "";
    try {
      const m = await ig<{ permalink?: string }>(token, published.id, { params: { fields: "permalink" } });
      permalink = m.permalink ?? "";
    } catch {
      /* stories não têm permalink público */
    }
    return { state: "published", mediaId: published.id, permalink };
  } catch (e) {
    return { state: "error", error: e instanceof Error ? e.message : String(e), containerId, childIds };
  }
}

/**
 * Publica os posts vencidos. O UPDATE … SKIP LOCKED "reserva" cada post, então o cron e o
 * painel podem rodar juntos sem publicar duas vezes.
 */
export async function publishDue(
  withAuth: <T>(fn: (db: PoolClient) => Promise<T>) => Promise<T>,
  onlyId?: string,
): Promise<{ processed: number; published: number; pending: number; errors: number; skipped?: string }> {
  const cred = await withAuth(async (db) => {
    const c = await loadIgCredential(db);
    return c ? await refreshIfNeeded(db, c).catch(() => c) : null;
  });
  if (!cred) return { processed: 0, published: 0, pending: 0, errors: 0, skipped: "Instagram não conectado" };

  const claimed = await withAuth(async (db) => {
    const { rows } = await db.query(
      `UPDATE ig_posts SET status = 'publicando', attempts = attempts + 1, updated_at = now()
       WHERE id IN (
         SELECT id FROM ig_posts
         WHERE ($1::uuid IS NULL OR id = $1::uuid)
           AND ((status = 'agendado' AND scheduled_at <= now())
             OR (status = 'publicando' AND updated_at < now() - interval '2 minutes'))
         ORDER BY scheduled_at NULLS FIRST
         LIMIT 5
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, kind, caption, media_urls, cover_url, share_to_feed, container_id, child_ids, attempts`,
      [onlyId ?? null],
    );
    return rows as IgPostRow[];
  });

  const summary = { processed: claimed.length, published: 0, pending: 0, errors: 0 };
  for (const post of claimed) {
    const out = await publishPost(cred, post, claimed.length > 2 ? 8_000 : 20_000);
    await withAuth(async (db) => {
      if (out.state === "published") {
        summary.published += 1;
        await db.query(
          `UPDATE ig_posts SET status = 'publicado', published_media_id = $2, permalink = $3,
             published_at = now(), error = '', updated_at = now() WHERE id = $1`,
          [post.id, out.mediaId, out.permalink],
        );
      } else if (out.state === "pending") {
        summary.pending += 1;
        // updated_at antigo de propósito: o próximo ciclo pega de novo
        await db.query(
          `UPDATE ig_posts SET container_id = $2, child_ids = $3, updated_at = now() - interval '5 minutes'
           WHERE id = $1`,
          [post.id, out.containerId, out.childIds],
        );
      } else {
        summary.errors += 1;
        await db.query(
          `UPDATE ig_posts SET status = 'erro', error = $2, container_id = $3, child_ids = $4, updated_at = now()
           WHERE id = $1`,
          [post.id, out.error.slice(0, 500), out.containerId, out.childIds],
        );
      }
    });
  }
  return summary;
}
