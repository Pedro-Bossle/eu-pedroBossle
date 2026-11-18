import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import Select from "./ui/Select";
import InstagramIcon from "../../components/icons/InstagramIcon";
import { orcamentosApi } from "../../lib/orcamentos/api";
import { peek, remember } from "../../lib/orcamentos/cache";
import type {
  IgComment,
  IgMedia,
  IgOverview,
  IgPost,
  IgPostInput,
  IgPostKind,
} from "../../types/orcamentos";
import { btn, btnDanger, btnDangerSm, btnPrimary, btnSm, cardClass, control, focusRing, inputClass, labelClass, pill, tabItem, tabList } from "./panelStyles";

type Props = { showToast: (msg: string) => void };
type View = "calendario" | "posts" | "biblioteca" | "comentarios" | "conta";

const VIEWS: { id: View; label: string }[] = [
  { id: "calendario", label: "Calendário" },
  { id: "posts", label: "Posts" },
  { id: "biblioteca", label: "Biblioteca" },
  { id: "comentarios", label: "Comentários" },
  { id: "conta", label: "Conta" },
];

const KIND_LABEL: Record<IgPostKind, string> = {
  image: "Foto",
  carousel: "Carrossel",
  reel: "Reels",
  story: "Story",
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  agendado: "Agendado",
  publicando: "Publicando",
  publicado: "Publicado",
  erro: "Erro",
};

const STATUS_CHIP: Record<string, string> = {
  rascunho: "border-line-strong bg-sunken text-muted",
  agendado: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  publicando: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  publicado: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  erro: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200",
  instagram: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
};

const areaClass = `${control} w-full min-h-36 resize-y px-3.5 py-2.5 text-base leading-relaxed sm:text-sm`;
const smallLabel = labelClass;
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const nf = new Intl.NumberFormat("pt-BR");
const fmtNum = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "Sem data";
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const isVideoUrl = (u: string) => /\.(mp4|mov|m4v)(\?|#|$)/i.test(u);
const hashtagCount = (s: string) => (s.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
const relTime = (iso: string | null) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} d`;
};

function engagement(m: IgMedia) {
  if (!m.reach) return null;
  const total = (m.likes ?? 0) + (m.comments ?? 0) + (m.saved ?? 0) + (m.shares ?? 0);
  return (total / m.reach) * 100;
}

/** O Instagram só aceita JPEG: converte PNG/WebP no navegador antes do upload. */
async function toJpeg(file: File): Promise<File> {
  if (file.type === "image/jpeg" || !file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.92));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

function blankPost(when?: Date): IgPostInput {
  return {
    kind: "image",
    caption: "",
    mediaUrls: [],
    coverUrl: "",
    shareToFeed: true,
    scheduledAt: when ? when.toISOString() : null,
    mode: "rascunho",
    tags: [],
    notes: "",
  };
}

function postToInput(p: IgPost): IgPostInput {
  return {
    id: p.id,
    kind: p.kind,
    caption: p.caption,
    mediaUrls: p.mediaUrls,
    coverUrl: p.coverUrl,
    shareToFeed: p.shareToFeed,
    scheduledAt: p.scheduledAt,
    mode: p.status === "agendado" ? "agendado" : "rascunho",
    tags: p.tags,
    notes: p.notes,
  };
}

function Thumb({ url, className = "" }: { url: string; className?: string }) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-sunken text-faint ${className}`}>
        <InstagramIcon className="size-5" />
      </div>
    );
  }
  if (isVideoUrl(url)) {
    return <video src={url} className={`bg-black object-cover ${className}`} muted playsInline preload="metadata" />;
  }
  return <img src={url} alt="" loading="lazy" className={`object-cover ${className}`} />;
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`adm-pop max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-float sm:rounded-2xl ${wide ? "sm:max-w-5xl" : "sm:max-w-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className={`${btnSm} border-transparent`} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------- Compositor ----------

function Composer({
  initial,
  features,
  username,
  onClose,
  onSaved,
  onDeleted,
  showToast,
}: {
  initial: IgPostInput;
  features: IgOverview["features"];
  username: string;
  onClose: () => void;
  onSaved: (p: IgPost) => void;
  onDeleted: (id: string) => void;
  showToast: (m: string) => void;
}) {
  const [form, setForm] = useState<IgPostInput>(initial);
  const [urlDraft, setUrlDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState<string>("");
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof IgPostInput>(k: K, v: IgPostInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const maxMedia = form.kind === "carousel" ? 10 : 1;
  const tags = tagsDraft.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
  const hashtags = hashtagCount(form.caption);

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!form.mediaUrls.length) p.push("Adicione a mídia");
    if (form.kind === "carousel" && form.mediaUrls.length < 2) p.push("Carrossel precisa de 2 a 10 mídias");
    if (form.kind === "reel" && form.mediaUrls[0] && !isVideoUrl(form.mediaUrls[0])) p.push("Reels precisa de vídeo .mp4/.mov");
    if (form.kind === "image" && form.mediaUrls[0] && isVideoUrl(form.mediaUrls[0])) p.push("Vídeo no feed: use Reels");
    if (form.caption.length > 2200) p.push("Legenda passa de 2.200 caracteres");
    if (hashtags > 30) p.push("Máximo de 30 hashtags");
    return p;
  }, [form, hashtags]);

  const addUrl = (u: string) => {
    const url = u.trim();
    if (!url) return;
    if (!/^https:\/\//i.test(url)) return showToast("Use uma URL https pública");
    setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, url].slice(0, f.kind === "carousel" ? 10 : 1) }));
    setUrlDraft("");
  };

  const move = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const arr = [...f.mediaUrls];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
      return { ...f, mediaUrls: arr };
    });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, maxMedia - form.mediaUrls.length) || 1);
    setUploading(list.length);
    for (const raw of list) {
      try {
        const file = await toJpeg(raw);
        const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const blob = await upload(`instagram/${safe}`, file, {
          access: "public",
          handleUploadUrl: "/api/orcamentos/instagram/upload",
          contentType: file.type,
        });
        setForm((f) => ({ ...f, mediaUrls: [...f.mediaUrls, blob.url].slice(0, f.kind === "carousel" ? 10 : 1) }));
      } catch (e) {
        showToast(e instanceof Error ? e.message : "Falha no upload");
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async (mode: IgPostInput["mode"]) => {
    if (mode !== "rascunho" && problems.length) return showToast(problems[0]!);
    if (mode === "agendado" && !form.scheduledAt) return showToast("Escolha data e hora");
    if (mode === "agendado" && form.scheduledAt && new Date(form.scheduledAt).getTime() < Date.now() - 60000) {
      if (!window.confirm("Esse horário já passou. Publicar no próximo ciclo do agendador?")) return;
    }
    if (mode === "agora" && !window.confirm("Publicar agora no Instagram?")) return;
    setBusy(mode);
    try {
      const { post, publish } = await orcamentosApi.igSavePost({ ...form, tags, mode });
      onSaved(post);
      if (mode === "agora") {
        if (post.status === "publicado") showToast("Publicado no Instagram");
        else if (post.status === "erro") showToast(`Erro: ${post.error}`);
        else showToast(publish?.pending ? "Processando o vídeo; publica no próximo ciclo" : "Enviado para publicação");
      } else {
        showToast(mode === "agendado" ? "Post agendado" : "Rascunho salvo");
      }
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!form.id || !window.confirm("Excluir este post do painel?")) return;
    setBusy("delete");
    try {
      await orcamentosApi.igDeletePost(form.id);
      onDeleted(form.id);
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setBusy("");
    }
  };

  const preview = form.mediaUrls[0] ?? "";

  return (
    <Modal title={form.id ? "Editar post" : "Novo post"} onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div>
            <p className={smallLabel}>Formato</p>
            <div className={`${tabList} mt-2 grid grid-cols-4`} role="radiogroup" aria-label="Formato">
              {(Object.keys(KIND_LABEL) as IgPostKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === k}
                  onClick={() =>
                    setForm((f) => ({ ...f, kind: k, mediaUrls: k === "carousel" ? f.mediaUrls : f.mediaUrls.slice(0, 1) }))
                  }
                  className={`${tabItem(form.kind === k)} min-h-9`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={smallLabel}>
              Mídia {form.kind === "carousel" ? `(${form.mediaUrls.length}/10)` : ""}
            </p>
            {form.mediaUrls.length ? (
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {form.mediaUrls.map((u, i) => (
                  <li key={`${u}-${i}`} className="group relative">
                    <Thumb url={u} className="aspect-square w-full" />
                    <span className="absolute top-1 left-1 bg-black/70 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
                    <div className="mt-1 flex gap-1">
                      {form.kind === "carousel" ? (
                        <>
                          <button type="button" className={`${btnSm} flex-1 px-1`} onClick={() => move(i, -1)} aria-label="Mover para a esquerda">
                            ←
                          </button>
                          <button type="button" className={`${btnSm} flex-1 px-1`} onClick={() => move(i, 1)} aria-label="Mover para a direita">
                            →
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        className={`${btnDangerSm} flex-1 px-1 `}
                        onClick={() => set("mediaUrls", form.mediaUrls.filter((_, j) => j !== i))}
                        aria-label="Remover mídia"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            {form.mediaUrls.length < maxMedia ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className={inputClass}
                  placeholder="https://… (JPEG, MP4 ou MOV público)"
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUrl(urlDraft);
                    }
                  }}
                />
                <button type="button" className={btn} onClick={() => addUrl(urlDraft)}>
                  Adicionar URL
                </button>
                {features.upload ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/mp4,video/quicktime"
                      multiple={form.kind === "carousel"}
                      className="hidden"
                      onChange={(e) => onFiles(e.target.files)}
                    />
                    <button type="button" className={btn} disabled={uploading > 0} onClick={() => fileRef.current?.click()}>
                      {uploading > 0 ? `Enviando ${uploading}…` : "Enviar arquivo"}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
            {!features.upload ? (
              <p className="mt-1.5 text-xs text-muted">
                Para enviar arquivos direto daqui, conecte um Blob store ao projeto na Vercel.
              </p>
            ) : null}
          </div>

          {form.kind === "reel" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className={smallLabel}>Capa (opcional, JPEG)</span>
                <input className={`${inputClass} mt-2`} value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} placeholder="https://…" />
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={form.shareToFeed} onChange={(e) => set("shareToFeed", e.target.checked)} />
                Mostrar no feed
              </label>
            </div>
          ) : null}

          {form.kind !== "story" ? (
            <label className="block">
              <span className="flex items-baseline justify-between">
                <span className={smallLabel}>Legenda</span>
                <span className={`text-xs tabular-nums ${form.caption.length > 2200 || hashtags > 30 ? "text-danger" : "text-muted"}`}>
                  {nf.format(form.caption.length)}/2.200 · {hashtags}/30 #
                </span>
              </span>
              <textarea className={`${areaClass} mt-2`} value={form.caption} onChange={(e) => set("caption", e.target.value)} placeholder="Escreva a legenda…" />
            </label>
          ) : (
            <p className="text-xs text-muted">Stories não têm legenda pela API.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={smallLabel}>Data e hora</span>
              <input
                type="datetime-local"
                className={`${inputClass} mt-2`}
                value={toLocalInput(form.scheduledAt)}
                onChange={(e) => set("scheduledAt", fromLocalInput(e.target.value))}
              />
            </label>
            <label className="block">
              <span className={smallLabel}>Etiquetas (vírgula)</span>
              <input className={`${inputClass} mt-2`} value={tagsDraft} onChange={(e) => setTagsDraft(e.target.value)} placeholder="cliente, bastidores" />
            </label>
          </div>
          <label className="block">
            <span className={smallLabel}>Notas internas</span>
            <textarea className={`${areaClass} mt-2 min-h-20`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </label>

          {problems.length ? (
            <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
              {problems.map((p) => (
                <li key={p}>• {p}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => save("agendado")}>
              {busy === "agendado" ? "Agendando…" : "Agendar"}
            </button>
            <button type="button" className={btn} disabled={!!busy} onClick={() => save("rascunho")}>
              {busy === "rascunho" ? "Salvando…" : "Salvar rascunho"}
            </button>
            <button type="button" className={btn} disabled={!!busy} onClick={() => save("agora")}>
              {busy === "agora" ? "Publicando…" : "Publicar agora"}
            </button>
            {form.id ? (
              <button type="button" className={`${btnDanger} ml-auto `} disabled={!!busy} onClick={remove}>
                Excluir
              </button>
            ) : null}
          </div>
        </div>

        {/* Prévia */}
        <aside aria-label="Prévia" className="lg:sticky lg:top-16 lg:self-start">
          <p className={smallLabel}>Prévia</p>
          <div className="mt-2 border border-line bg-surface text-ink">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="size-7 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[2px]">
                <span className="block size-full rounded-full bg-surface" />
              </span>
              <span className="text-xs font-semibold">{username || "seu_perfil"}</span>
              <span className="ml-auto text-[10px] tracking-wide text-muted">{KIND_LABEL[form.kind]}</span>
            </div>
            <div className={form.kind === "story" || form.kind === "reel" ? "aspect-[9/16] max-h-[460px]" : "aspect-[4/5]"}>
              <Thumb url={preview} className="size-full" />
            </div>
            {form.kind === "carousel" && form.mediaUrls.length > 1 ? (
              <div className="flex justify-center gap-1 py-1.5">
                {form.mediaUrls.map((u, i) => (
                  <span key={`${u}-${i}`} className={`size-1.5 rounded-full ${i === 0 ? "bg-sky-500" : "bg-neutral-300"}`} />
                ))}
              </div>
            ) : null}
            {form.kind !== "story" ? (
              <p className="line-clamp-4 px-3 pt-1 pb-3 text-xs leading-relaxed whitespace-pre-wrap">
                <strong>{username || "seu_perfil"}</strong> {form.caption || <span className="text-faint">Sua legenda aparece aqui</span>}
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted">
            {form.scheduledAt ? `Sai em ${fmtDateTime(form.scheduledAt)}` : "Sem data: fica como rascunho"}
          </p>
        </aside>
      </div>
    </Modal>
  );
}

// ---------- Calendário ----------

type CalEntry =
  | { type: "post"; at: string; post: IgPost }
  | { type: "media"; at: string; media: IgMedia };

function Calendar({
  posts,
  media,
  onOpenPost,
  onOpenMedia,
  onNew,
  onMove,
}: {
  posts: IgPost[];
  media: IgMedia[];
  onOpenPost: (p: IgPost) => void;
  onOpenMedia: (m: IgMedia) => void;
  onNew: (d: Date) => void;
  onMove: (p: IgPost, d: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dragOver, setDragOver] = useState<string>("");

  const byDay = useMemo(() => {
    const map = new Map<string, CalEntry[]>();
    const publishedIds = new Set(posts.map((p) => p.publishedMediaId).filter(Boolean));
    const push = (e: CalEntry) => {
      const k = dayKey(new Date(e.at));
      map.set(k, [...(map.get(k) ?? []), e]);
    };
    for (const p of posts) {
      const at = p.publishedAt ?? p.scheduledAt;
      if (at) push({ type: "post", at, post: p });
    }
    for (const m of media) if (m.postedAt && !publishedIds.has(m.id)) push({ type: "media", at: m.postedAt, media: m });
    for (const list of map.values()) list.sort((a, b) => a.at.localeCompare(b.at));
    return map;
  }, [posts, media]);

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // segunda = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const count = Math.ceil((offset + new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const todayKey = dayKey(new Date());
  const rawLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  const scheduledThisMonth = posts.filter(
    (p) => p.status === "agendado" && p.scheduledAt && new Date(p.scheduledAt).getMonth() === cursor.getMonth() && new Date(p.scheduledAt).getFullYear() === cursor.getFullYear(),
  ).length;

  const onDrop = (e: DragEvent, d: Date) => {
    e.preventDefault();
    setDragOver("");
    const id = e.dataTransfer.getData("text/ig-post");
    const p = posts.find((x) => x.id === id);
    if (!p) return;
    const old = p.scheduledAt ? new Date(p.scheduledAt) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), old.getHours(), old.getMinutes());
    onMove(p, next);
  };

  return (
    <div className={`${cardClass} p-0 xl:p-0`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <h3 className="text-base font-semibold">{monthLabel}</h3>
        <span className="text-xs text-muted">{scheduledThisMonth} agendado(s)</span>
        <div className="ml-auto flex gap-1">
          <button type="button" className={btnSm} onClick={() => shift(-1)} aria-label="Mês anterior">
            ←
          </button>
          <button
            type="button"
            className={btnSm}
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Hoje
          </button>
          <button type="button" className={btnSm} onClick={() => shift(1)} aria-label="Próximo mês">
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium tracking-wide text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const entries = byDay.get(k) ?? [];
          const past = k < todayKey;
          return (
            <div
              key={k}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(k);
              }}
              onDragLeave={() => setDragOver((v) => (v === k ? "" : v))}
              onDrop={(e) => onDrop(e, d)}
              className={`group relative min-h-24 border-r border-b border-line p-1 text-left sm:min-h-28 sm:p-1.5 ${
                inMonth ? "" : "bg-sunken/50 text-faint dark:bg-sunken/50"
              } ${dragOver === k ? "bg-emerald-50 dark:bg-emerald-950/30" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex size-6 items-center justify-center text-xs tabular-nums ${
                    k === todayKey ? "rounded-full bg-ink font-semibold text-canvas" : ""
                  }`}
                >
                  {d.getDate()}
                </span>
                {!past ? (
                  <button
                    type="button"
                    onClick={() => onNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0))}
                    className={`size-6 text-sm text-faint opacity-100 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100 ${focusRing}`}
                    aria-label={`Novo post em ${d.toLocaleDateString("pt-BR")}`}
                  >
                    +
                  </button>
                ) : null}
              </div>
              <ul className="mt-0.5 space-y-0.5">
                {entries.slice(0, 4).map((e) =>
                  e.type === "post" ? (
                    <li key={e.post.id}>
                      <button
                        type="button"
                        draggable={e.post.status !== "publicado" && e.post.status !== "publicando"}
                        onDragStart={(ev) => ev.dataTransfer.setData("text/ig-post", e.post.id)}
                        onClick={() => onOpenPost(e.post)}
                        title={`${STATUS_LABEL[e.post.status]} · ${KIND_LABEL[e.post.kind]} · ${e.post.caption.slice(0, 80)}`}
                        className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight sm:text-[11px] ${STATUS_CHIP[e.post.status]} ${focusRing}`}
                      >
                        <span className="tabular-nums">{timeOf(e.at)}</span>
                        <span className="hidden truncate sm:inline">{e.post.caption || KIND_LABEL[e.post.kind]}</span>
                      </button>
                    </li>
                  ) : (
                    <li key={e.media.id}>
                      <button
                        type="button"
                        onClick={() => onOpenMedia(e.media)}
                        title={e.media.caption.slice(0, 80)}
                        className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[10px] leading-tight sm:text-[11px] ${STATUS_CHIP.instagram} ${focusRing}`}
                      >
                        <span className="tabular-nums">{timeOf(e.at)}</span>
                        <span className="hidden truncate sm:inline">{e.media.caption || e.media.mediaType}</span>
                      </button>
                    </li>
                  ),
                )}
                {entries.length > 4 ? <li className="px-1 text-[10px] text-muted">+{entries.length - 4}</li> : null}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 px-4 py-3 text-[11px] text-muted">
        {["rascunho", "agendado", "publicado", "erro"].map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm border ${STATUS_CHIP[s]}`} />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-2.5 rounded-sm border ${STATUS_CHIP.instagram}`} />
          Postado fora do painel
        </span>
        <span className="ml-auto hidden sm:inline">Arraste um post para outro dia para reagendar.</span>
      </div>
    </div>
  );
}

// ---------- Tela principal ----------

export default function Instagram({ showToast }: Props) {
  // Volta do login do Instagram com erro abre direto a aba Conta
  const [view, setView] = useState<View>(() =>
    new URLSearchParams(window.location.search).get("ig") === "erro" ? "conta" : "calendario",
  );
  const [data, setData] = useState<IgOverview | null>(() => peek<IgOverview>("ig"));
  const [loading, setLoading] = useState(() => !peek("ig"));
  const [syncing, setSyncing] = useState(false);
  const [composer, setComposer] = useState<IgPostInput | null>(null);
  const [mediaOpen, setMediaOpen] = useState<IgMedia | null>(null);

  const load = useCallback(async () => {
    try {
      setData(remember("ig", await orcamentosApi.igOverview()));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar o Instagram");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Volta do login do Instagram (?ig=ok | ?ig=erro&msg=…)
    const qs = new URLSearchParams(window.location.search);
    const ig = qs.get("ig");
    if (ig) {
      showToast(ig === "ok" ? "Instagram conectado" : `Instagram: ${qs.get("msg") ?? "falhou"}`);
      qs.delete("ig");
      qs.delete("msg");
      qs.delete("tab");
      const rest = qs.toString();
      window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
  }, [load, showToast]);

  const account = data?.account;
  const connected = Boolean(account?.connected);
  const username = account && account.connected ? account.username : "";

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await orcamentosApi.igSync();
      showToast(`${r.media} posts e ${r.comments} comentários atualizados`);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const upsertPost = (p: IgPost) =>
    setData((d) => (d ? { ...d, posts: [p, ...d.posts.filter((x) => x.id !== p.id)] } : d));

  const movePost = async (p: IgPost, when: Date) => {
    if (p.status === "agendado" && when.getTime() < Date.now()) {
      return showToast("Não dá para agendar no passado");
    }
    const prev = p;
    upsertPost({ ...p, scheduledAt: when.toISOString() });
    try {
      const { post } = await orcamentosApi.igMovePost(p.id, when.toISOString());
      upsertPost(post);
      showToast(`Movido para ${fmtDateTime(post.scheduledAt)}`);
    } catch (e) {
      upsertPost(prev);
      showToast(e instanceof Error ? e.message : "Erro ao mover");
    }
  };

  const newCommentCount = data?.comments.filter((c) => c.status === "novo" && !c.fromMe).length ?? 0;

  if (loading) {
    return <p className="text-sm text-muted">Carregando Instagram…</p>;
  }

  return (
    <section className="space-y-6" aria-labelledby="ig-title">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={smallLabel}>Mídia</p>
          <h2 id="ig-title" className="mt-1 text-2xl font-semibold tracking-tight">
            Instagram{username ? <span className="font-light text-muted"> · @{username}</span> : null}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <button type="button" className={btn} disabled={syncing} onClick={sync}>
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          ) : null}
          <button type="button" className={btnPrimary} onClick={() => setComposer(blankPost())}>
            + Novo post
          </button>
        </div>
      </header>

      {!connected ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Instagram não conectado. Você pode montar o calendário e os rascunhos; para publicar e ver métricas,{" "}
          <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setView("conta")}>
            conecte a conta
          </button>
          .
        </div>
      ) : null}

      {data && account?.connected ? <Kpis data={data} /> : null}

      <nav className={`${tabList} w-fit max-w-full`} aria-label="Seções do Instagram">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-current={view === v.id ? "page" : undefined}
            className={tabItem(view === v.id)}
          >
            {v.label}
            {v.id === "comentarios" && newCommentCount ? (
              <span className="ml-1.5 rounded-full bg-fuchsia-600 px-1.5 text-[10px] font-bold text-white">{newCommentCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {data && view === "calendario" ? (
        <Calendar
          posts={data.posts}
          media={data.media}
          onOpenPost={(p) => (p.status === "publicado" || p.status === "publicando" ? setView("posts") : setComposer(postToInput(p)))}
          onOpenMedia={setMediaOpen}
          onNew={(d) => setComposer(blankPost(d))}
          onMove={movePost}
        />
      ) : null}

      {data && view === "posts" ? (
        <PostList posts={data.posts} onOpen={(p) => setComposer(postToInput(p))} onRetry={(p) => setComposer({ ...postToInput(p), mode: "agendado" })} />
      ) : null}

      {data && view === "biblioteca" ? (
        <Library media={data.media} onOpen={setMediaOpen} connected={connected} onSync={sync} syncing={syncing} />
      ) : null}

      {data && view === "comentarios" ? (
        <Comments
          comments={data.comments}
          connected={connected}
          showToast={showToast}
          onChange={(comments) => setData((d) => (d ? { ...d, comments } : d))}
          onReload={load}
        />
      ) : null}

      {data && view === "conta" ? <Account data={data} showToast={showToast} onChanged={load} /> : null}

      {composer && data ? (
        <Composer
          initial={composer}
          features={data.features}
          username={username}
          onClose={() => setComposer(null)}
          onSaved={upsertPost}
          onDeleted={(id) => setData((d) => (d ? { ...d, posts: d.posts.filter((p) => p.id !== id) } : d))}
          showToast={showToast}
        />
      ) : null}

      {mediaOpen ? (
        <MediaDetail
          media={mediaOpen}
          onClose={() => setMediaOpen(null)}
          showToast={showToast}
          onSaved={(m) => {
            setData((d) => (d ? { ...d, media: d.media.map((x) => (x.id === m.id ? m : x)) } : d));
            setMediaOpen(m);
          }}
          onReuse={(m) => {
            setMediaOpen(null);
            setComposer({ ...blankPost(), caption: m.caption, tags: m.tags });
          }}
        />
      ) : null}
    </section>
  );
}

// ---------- KPIs ----------

function Kpis({ data }: { data: IgOverview }) {
  const [now] = useState(() => Date.now());
  const a = data.account;
  if (!a.connected) return null;
  const last30 = data.media.filter((m) => m.postedAt && now - new Date(m.postedAt).getTime() < 30 * 86400_000);
  const rates = last30.map(engagement).filter((x): x is number => x != null);
  const avgEng = rates.length ? rates.reduce((s, x) => s + x, 0) / rates.length : null;
  const upcoming = data.posts.filter((p) => p.status === "agendado").length;
  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Seguidores", value: fmtNum(a.followers) },
    { label: "Alcance 28 dias", value: fmtNum(a.insights28d?.reach ?? null), hint: a.insights28d?.views != null ? `${fmtNum(a.insights28d.views)} visualizações` : undefined },
    { label: "Engajamento médio", value: avgEng == null ? "—" : `${avgEng.toFixed(1).replace(".", ",")}%`, hint: `${last30.length} posts em 30 dias` },
    { label: "Agendados", value: String(upcoming), hint: a.publishQuota ? `cota ${a.publishQuota.used}/${a.publishQuota.total} em 24h` : undefined },
  ];
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="border-line p-5 xl:p-6 [&:nth-child(n+3)]:border-t [&:nth-child(even)]:border-l lg:[&:nth-child(n+3)]:border-t-0 lg:[&:not(:first-child)]:border-l">
          <p className={smallLabel}>{t.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{t.value}</p>
          {t.hint ? <p className="mt-1 text-xs text-muted">{t.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

// ---------- Lista de posts ----------

function PostList({ posts, onOpen, onRetry }: { posts: IgPost[]; onOpen: (p: IgPost) => void; onRetry: (p: IgPost) => void }) {
  const [filter, setFilter] = useState<string>("pendentes");
  const filtered = posts
    .filter((p) =>
      filter === "pendentes" ? ["rascunho", "agendado", "publicando", "erro"].includes(p.status) : filter === "todos" ? true : p.status === filter,
    )
    .sort((a, b) => (a.scheduledAt ?? "9").localeCompare(b.scheduledAt ?? "9"));
  if (filter === "publicado") filtered.reverse();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {[
          ["pendentes", "Pendentes"],
          ["agendado", "Agendados"],
          ["rascunho", "Rascunhos"],
          ["erro", "Com erro"],
          ["publicado", "Publicados"],
          ["todos", "Todos"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id!)}
            className={pill(filter === id)}
            aria-pressed={filter === id}
          >
            {label} <span className="text-faint">{posts.filter((p) => (id === "pendentes" ? p.status !== "publicado" : id === "todos" || p.status === id)).length}</span>
          </button>
        ))}
      </div>
      {!filtered.length ? <p className="py-8 text-center text-sm text-muted">Nada por aqui.</p> : null}
      <ul className="space-y-2">
        {filtered.map((p) => (
          <li key={p.id} className={`${cardClass} flex gap-4 p-3 xl:p-3`}>
            <Thumb url={p.mediaUrls[0] ?? ""} className="size-20 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_CHIP[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                <span className="text-muted">{KIND_LABEL[p.kind]}</span>
                <span className="tabular-nums text-muted">{fmtDateTime(p.publishedAt ?? p.scheduledAt)}</span>
                {p.tags.map((t) => (
                  <span key={t} className="text-muted">#{t}</span>
                ))}
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm">{p.caption || <span className="text-faint">Sem legenda</span>}</p>
              {p.error ? <p className="mt-1 text-xs text-danger">{p.error}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.status === "publicado" ? (
                  p.permalink ? (
                    <a className={btnSm} href={p.permalink} target="_blank" rel="noreferrer">
                      Ver no Instagram ↗
                    </a>
                  ) : null
                ) : p.status === "publicando" ? (
                  <span className="text-xs text-muted">O Instagram está processando a mídia…</span>
                ) : (
                  <>
                    <button type="button" className={btnSm} onClick={() => onOpen(p)}>
                      Editar
                    </button>
                    {p.status === "erro" ? (
                      <button type="button" className={btnSm} onClick={() => onRetry(p)}>
                        Corrigir e reagendar
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Biblioteca ----------

function Library({ media, onOpen, connected, onSync, syncing }: { media: IgMedia[]; onOpen: (m: IgMedia) => void; connected: boolean; onSync: () => void; syncing: boolean }) {
  const [sort, setSort] = useState<"recentes" | "alcance" | "engajamento" | "salvos">("recentes");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const allTags = useMemo(() => [...new Set(media.flatMap((m) => m.tags))].sort(), [media]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = media.filter((m) => (!tag || m.tags.includes(tag)) && (!needle || m.caption.toLowerCase().includes(needle) || m.notes.toLowerCase().includes(needle)));
    const key = (m: IgMedia) =>
      sort === "alcance" ? m.reach ?? -1 : sort === "engajamento" ? engagement(m) ?? -1 : sort === "salvos" ? m.saved ?? -1 : new Date(m.postedAt ?? 0).getTime();
    return [...arr].sort((a, b) => key(b) - key(a));
  }, [media, sort, tag, q]);

  if (!media.length) {
    return (
      <div className={`${cardClass} text-center`}>
        <p className="text-sm text-muted">A biblioteca mostra os posts do perfil com métricas.</p>
        {connected ? (
          <button type="button" className={`${btnPrimary} mt-4`} disabled={syncing} onClick={onSync}>
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input className={`${inputClass} sm:max-w-xs`} placeholder="Buscar na legenda ou nota…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="sm:w-52">
          <Select
            ariaLabel="Ordenar"
            value={sort}
            onChange={(v) => setSort(v)}
            options={[
              { value: "recentes", label: "Mais recentes" },
              { value: "alcance", label: "Maior alcance" },
              { value: "engajamento", label: "Maior engajamento" },
              { value: "salvos", label: "Mais salvos" },
            ]}
          />
        </div>
        {allTags.length ? (
          <div className="sm:w-48">
            <Select
              ariaLabel="Etiqueta"
              value={tag}
              onChange={setTag}
              options={[{ value: "", label: "Todas as etiquetas" }, ...allTags.map((t) => ({ value: t, label: `#${t}` }))]}
            />
          </div>
        ) : null}
        <span className="text-xs text-muted sm:ml-auto">{list.length} posts</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {list.map((m) => {
          const eng = engagement(m);
          return (
            <li key={m.id}>
              <button type="button" onClick={() => onOpen(m)} className={`block w-full rounded-xl border border-line bg-surface text-left ${focusRing}`}>
                <div className="relative">
                  <Thumb url={m.thumbnailUrl || m.mediaUrl} className="aspect-square w-full" />
                  <span className="absolute top-1.5 right-1.5 bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {m.productType === "REELS" ? "Reels" : m.mediaType === "CAROUSEL_ALBUM" ? "Carrossel" : m.productType === "STORY" ? "Story" : "Foto"}
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] text-muted">{m.postedAt ? new Date(m.postedAt).toLocaleDateString("pt-BR") : ""}</p>
                  <dl className="mt-1 grid grid-cols-3 gap-1 text-xs tabular-nums">
                    <div>
                      <dt className="text-[10px] text-muted">Curtidas</dt>
                      <dd className="font-semibold">{fmtNum(m.likes)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted">Alcance</dt>
                      <dd className="font-semibold">{fmtNum(m.reach)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted">Engaj.</dt>
                      <dd className="font-semibold">{eng == null ? "—" : `${eng.toFixed(1).replace(".", ",")}%`}</dd>
                    </div>
                  </dl>
                  {m.tags.length ? <p className="mt-1.5 truncate text-[11px] text-muted">{m.tags.map((t) => `#${t}`).join(" ")}</p> : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MediaDetail({
  media,
  onClose,
  onSaved,
  onReuse,
  showToast,
}: {
  media: IgMedia;
  onClose: () => void;
  onSaved: (m: IgMedia) => void;
  onReuse: (m: IgMedia) => void;
  showToast: (m: string) => void;
}) {
  const [tags, setTags] = useState(media.tags.join(", "));
  const [notes, setNotes] = useState(media.notes);
  const [busy, setBusy] = useState(false);
  const eng = engagement(media);
  const save = async () => {
    setBusy(true);
    try {
      const r = await orcamentosApi.igPatchMedia(media.id, {
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes,
      });
      onSaved(r.media);
      showToast("Salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  };
  const stats: [string, number | null | string][] = [
    ["Curtidas", media.likes],
    ["Comentários", media.comments],
    ["Alcance", media.reach],
    ["Visualizações", media.views],
    ["Salvos", media.saved],
    ["Compartilh.", media.shares],
    ["Engajamento", eng == null ? null : `${eng.toFixed(1).replace(".", ",")}%`],
  ];
  return (
    <Modal title="Post publicado" onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-[minmax(0,380px)_1fr]">
        {media.mediaType === "VIDEO" && media.mediaUrl ? (
          <video src={media.mediaUrl} poster={media.thumbnailUrl} controls className="w-full bg-black" />
        ) : (
          <Thumb url={media.thumbnailUrl || media.mediaUrl} className="aspect-square w-full" />
        )}
        <div className="space-y-4">
          <p className="text-xs text-muted">{media.postedAt ? new Date(media.postedAt).toLocaleString("pt-BR") : ""}</p>
          <dl className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] text-muted">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{typeof v === "string" ? v : fmtNum(v)}</dd>
              </div>
            ))}
          </dl>
          <p className="max-h-40 overflow-y-auto text-sm whitespace-pre-wrap">{media.caption}</p>
          <label className="block">
            <span className={smallLabel}>Etiquetas</span>
            <input className={`${inputClass} mt-2`} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="campanha, cliente-x" />
          </label>
          <label className="block">
            <span className={smallLabel}>Notas</span>
            <textarea className={`${areaClass} mt-2 min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
              Salvar
            </button>
            <button type="button" className={btn} onClick={() => onReuse(media)}>
              Reutilizar legenda
            </button>
            {media.permalink ? (
              <a className={btn} href={media.permalink} target="_blank" rel="noreferrer">
                Abrir ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Comentários (CRM) ----------

const QUICK_KEY = "ig_quick_replies";
const DEFAULT_QUICK = ["Obrigado! 🙌", "Te chamei no direct 😉", "Que bom que curtiu!"];

function Comments({
  comments,
  connected,
  showToast,
  onChange,
  onReload,
}: {
  comments: IgComment[];
  connected: boolean;
  showToast: (m: string) => void;
  onChange: (c: IgComment[]) => void;
  onReload: () => void;
}) {
  const [status, setStatus] = useState<"novo" | "respondido" | "arquivado" | "todos">("novo");
  const [replying, setReplying] = useState<string>("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState("");
  const [quick, setQuick] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(QUICK_KEY) ?? "null");
      return Array.isArray(v) && v.length ? v : DEFAULT_QUICK;
    } catch {
      return DEFAULT_QUICK;
    }
  });

  const saveQuick = (list: string[]) => {
    setQuick(list);
    try {
      localStorage.setItem(QUICK_KEY, JSON.stringify(list));
    } catch {
      /* sem storage */
    }
  };

  const others = comments.filter((c) => !c.fromMe);
  const list = others.filter((c) => status === "todos" || c.status === status);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id && c.fromMe);

  const setStatusOf = async (ids: string[], s: IgComment["status"]) => {
    onChange(comments.map((c) => (ids.includes(c.id) ? { ...c, status: s } : c)));
    try {
      await orcamentosApi.igCommentStatus(ids, s);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
      onReload();
    }
  };

  const act = async (c: IgComment, action: "reply" | "hide" | "unhide" | "delete") => {
    if (action === "delete" && !window.confirm("Excluir este comentário do Instagram?")) return;
    setBusy(c.id);
    try {
      await orcamentosApi.igCommentAction(c.id, action, action === "reply" ? draft : undefined);
      if (action === "reply") {
        showToast("Resposta publicada");
        setReplying("");
        setDraft("");
      }
      await onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["novo", "respondido", "arquivado", "todos"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={pill(status === s)}>
            {s === "novo" ? "Sem resposta" : s === "respondido" ? "Respondidos" : s === "arquivado" ? "Arquivados" : "Todos"}{" "}
            <span className="text-faint">{s === "todos" ? others.length : others.filter((c) => c.status === s).length}</span>
          </button>
        ))}
        {status === "novo" && list.length > 1 ? (
          <button type="button" className={`${btnSm} ml-auto`} onClick={() => setStatusOf(list.map((c) => c.id), "arquivado")}>
            Arquivar todos
          </button>
        ) : null}
      </div>
      {!connected ? <p className="text-xs text-muted">Conecte a conta para responder pelo painel.</p> : null}
      {!list.length ? <p className="py-8 text-center text-sm text-muted">{status === "novo" ? "Nenhum comentário esperando resposta. 🎉" : "Nada por aqui."}</p> : null}
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id} className={`${cardClass} p-3 xl:p-4 ${c.hidden ? "opacity-60" : ""}`}>
            <div className="flex gap-3">
              <a href={c.mediaPermalink || undefined} target="_blank" rel="noreferrer" className="shrink-0" title={c.mediaCaption}>
                <Thumb url={c.mediaThumb} className="size-12" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <a className="font-semibold hover:underline" href={`https://instagram.com/${c.username}`} target="_blank" rel="noreferrer">
                    @{c.username}
                  </a>{" "}
                  <span className="text-xs text-muted">{relTime(c.postedAt)}</span>
                  {c.parentId ? <span className="ml-1 text-xs text-muted">· em uma thread</span> : null}
                  {c.hidden ? <span className="ml-1 text-xs text-muted">· oculto</span> : null}
                </p>
                <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{c.text}</p>
                {repliesOf(c.id).map((r) => (
                  <p key={r.id} className="mt-1.5 border-l-2 border-emerald-500 pl-2 text-xs text-muted">
                    Você: {r.text}
                  </p>
                ))}

                {replying === c.id ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {quick.map((qr) => (
                        <button key={qr} type="button" className={btnSm} onClick={() => setDraft(`@${c.username} ${qr}`)}>
                          {qr}
                        </button>
                      ))}
                      {draft.trim() && !quick.includes(draft.replace(/^@\S+\s/, "")) ? (
                        <button type="button" className={`${btnSm} text-muted`} onClick={() => saveQuick([...quick, draft.replace(/^@\S+\s/, "")].slice(-8))}>
                          + salvar como rápida
                        </button>
                      ) : null}
                    </div>
                    <textarea autoFocus className={`${areaClass} min-h-20`} value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <div className="flex gap-2">
                      <button type="button" className={btnPrimary} disabled={!draft.trim() || busy === c.id} onClick={() => act(c, "reply")}>
                        {busy === c.id ? "Enviando…" : "Responder"}
                      </button>
                      <button type="button" className={btn} onClick={() => setReplying("")}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {connected ? (
                      <button
                        type="button"
                        className={btnSm}
                        onClick={() => {
                          setReplying(c.id);
                          setDraft(`@${c.username} `);
                        }}
                      >
                        Responder
                      </button>
                    ) : null}
                    {c.status !== "respondido" ? (
                      <button type="button" className={btnSm} onClick={() => setStatusOf([c.id], "respondido")}>
                        Marcar respondido
                      </button>
                    ) : null}
                    {c.status !== "arquivado" ? (
                      <button type="button" className={btnSm} onClick={() => setStatusOf([c.id], "arquivado")}>
                        Arquivar
                      </button>
                    ) : (
                      <button type="button" className={btnSm} onClick={() => setStatusOf([c.id], "novo")}>
                        Voltar para a fila
                      </button>
                    )}
                    {connected ? (
                      <>
                        <button type="button" className={btnSm} disabled={busy === c.id} onClick={() => act(c, c.hidden ? "unhide" : "hide")}>
                          {c.hidden ? "Mostrar" : "Ocultar"}
                        </button>
                        <button type="button" className={btnDangerSm} disabled={busy === c.id} onClick={() => act(c, "delete")}>
                          Excluir
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Conta ----------

function Account({ data, showToast, onChanged }: { data: IgOverview; showToast: (m: string) => void; onChanged: () => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const a = data.account;

  const connect = async () => {
    setBusy(true);
    try {
      await orcamentosApi.igConnect(token);
      setToken("");
      showToast("Instagram conectado");
      onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Token recusado");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async () => {
    setBusy(true);
    try {
      const { url } = await orcamentosApi.igOauthStart();
      window.location.href = url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Desconectar o Instagram? Posts agendados param de sair.")) return;
    await orcamentosApi.igDisconnect();
    onChanged();
  };

  const [now] = useState(() => Date.now());
  const daysLeft = a.connected && a.expiresAt ? Math.round((new Date(a.expiresAt).getTime() - now) / 86400_000) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {a.connected ? (
        <div className={cardClass}>
          <div className="flex items-center gap-3">
            {a.picture ? <img src={a.picture} alt="" className="size-14 rounded-full object-cover" /> : null}
            <div>
              <p className="text-lg font-semibold">@{a.username}</p>
              <p className="text-sm text-muted">{a.name} · {a.accountType || "Profissional"}</p>
            </div>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Seguidores</dt>
              <dd className="text-lg font-semibold tabular-nums">{fmtNum(a.followers)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Seguindo</dt>
              <dd className="text-lg font-semibold tabular-nums">{fmtNum(a.follows)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Posts</dt>
              <dd className="text-lg font-semibold tabular-nums">{fmtNum(a.mediaCount)}</dd>
            </div>
          </dl>
          <ul className="mt-5 space-y-1.5 text-sm text-muted">
            <li>
              Token {daysLeft == null ? "sem validade conhecida" : daysLeft > 0 ? `válido por ~${daysLeft} dias` : "expirado — conecte de novo"}
              {a.expiryGuessed ? " (estimado)" : ""}. Ele é renovado sozinho pelo agendador diário.
            </li>
            <li>{data.features.cron ? "Agendador configurado (CRON_SECRET)." : "⚠ Defina CRON_SECRET para os posts agendados saírem sozinhos."}</li>
            {a.insightsAt ? <li>Métricas atualizadas {relTime(a.insightsAt)} atrás.</li> : null}
          </ul>
          <button type="button" className={`${btnDanger} mt-5`} onClick={disconnect}>
            Desconectar
          </button>
        </div>
      ) : null}

      <div className={cardClass}>
        <h3 className="text-base font-semibold">{a.connected ? "Trocar token" : "Conectar Instagram"}</h3>
        <p className="mt-1 text-sm text-muted">A conta precisa ser profissional (Criador de conteúdo ou Empresa).</p>
        {data.features.oauth ? (
          <button type="button" className={`${btnPrimary} mt-4 w-full`} disabled={busy} onClick={oauth}>
            <InstagramIcon className="size-4" /> Entrar com Instagram
          </button>
        ) : null}
        <div className="mt-4 space-y-2">
          <label className="block">
            <span className={smallLabel}>Token de acesso</span>
            <input className={`${inputClass} mt-2 font-mono`} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="IGAA…" />
          </label>
          <button type="button" className={`${btn} w-full`} disabled={busy || token.trim().length < 20} onClick={connect}>
            {busy ? "Validando…" : "Salvar token"}
          </button>
        </div>
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-medium">Como gerar o token</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Em developers.facebook.com crie um app do tipo Business e adicione o produto “Instagram” (API com login do Instagram).</li>
            <li>Em “Gerar tokens de acesso”, adicione sua conta e gere o token (permissões: basic, content_publish, manage_comments, manage_insights).</li>
            <li>Cole aqui. O token fica criptografado no banco e é renovado automaticamente.</li>
            <li>Opcional: defina META_APP_ID e META_APP_SECRET na Vercel para usar o botão “Entrar com Instagram”.</li>
          </ol>
        </details>
      </div>
    </div>
  );
}
