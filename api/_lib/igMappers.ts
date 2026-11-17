const iso = (v: unknown) =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);
const num = (v: unknown) => (v == null ? null : Number(v));

export function mapPost(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    kind: String(r.kind),
    caption: String(r.caption ?? ""),
    mediaUrls: (r.media_urls as string[] | null) ?? [],
    coverUrl: String(r.cover_url ?? ""),
    shareToFeed: Boolean(r.share_to_feed),
    scheduledAt: iso(r.scheduled_at),
    status: String(r.status),
    publishedMediaId: String(r.published_media_id ?? ""),
    permalink: String(r.permalink ?? ""),
    error: String(r.error ?? ""),
    attempts: Number(r.attempts ?? 0),
    tags: (r.tags as string[] | null) ?? [],
    notes: String(r.notes ?? ""),
    publishedAt: iso(r.published_at),
    created: iso(r.created_at),
    updated: iso(r.updated_at),
  };
}

export function mapMedia(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    caption: String(r.caption ?? ""),
    mediaType: String(r.media_type ?? ""),
    productType: String(r.media_product_type ?? ""),
    mediaUrl: String(r.media_url ?? ""),
    thumbnailUrl: String(r.thumbnail_url ?? ""),
    permalink: String(r.permalink ?? ""),
    postedAt: iso(r.posted_at),
    likes: num(r.like_count),
    comments: num(r.comments_count),
    reach: num(r.reach),
    views: num(r.views),
    saved: num(r.saved),
    shares: num(r.shares),
    tags: (r.tags as string[] | null) ?? [],
    notes: String(r.notes ?? ""),
  };
}

export function mapComment(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    mediaId: String(r.media_id),
    parentId: r.parent_id ? String(r.parent_id) : null,
    username: String(r.username ?? ""),
    text: String(r.text ?? ""),
    postedAt: iso(r.posted_at),
    fromMe: Boolean(r.from_me),
    hidden: Boolean(r.hidden),
    status: String(r.status),
    mediaPermalink: String(r.permalink ?? ""),
    mediaThumb: String(r.thumb ?? ""),
    mediaCaption: String(r.media_caption ?? ""),
  };
}

export const POST_COLS = `id, kind, caption, media_urls, cover_url, share_to_feed, scheduled_at, status,
  published_media_id, permalink, error, attempts, tags, notes, published_at, created_at, updated_at`;

export function cleanTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((t) => String(t).trim().replace(/^#/, "").slice(0, 40)).filter(Boolean))].slice(0, 20);
}
