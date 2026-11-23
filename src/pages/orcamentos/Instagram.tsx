import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { upload } from "@vercel/blob/client";
import Select from "./ui/Select";
import Icon from "./ui/Icon";
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
import { btn, btnDanger, btnDangerSm, btnGhost, btnPrimary, btnSm, cardClass, control, focusRing, inputClass, labelClass, pill, tabItem, tabList } from "./panelStyles";

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

/** Cor do status em ponto (calendário, listas). */
const STATUS_DOT: Record<string, string> = {
  rascunho: "bg-faint",
  agendado: "bg-sky-500",
  publicando: "bg-amber-500",
  publicado: "bg-accent",
  erro: "bg-danger",
  instagram: "bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600",
};

const ICON = {
  close: "M18 6 6 18M6 6l12 12",
  image: "M4 5h16v14H4zM4 15l4-4 5 5M14 14l2-2 4 4M15.5 8.5h.01",
  carousel: "M7 7h12v12H7zM4 16V4h12",
  reel: "M4 4h16v16H4zM4 9h16M9 4l2 5M15 4l2 5M10 12.5v4l3.5-2z",
  story: "M12 3a9 9 0 1 0 9 9M12 3a9 9 0 0 1 7.8 4.5M12 8v8M8 12h8",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  comment: "M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  save: "M6 3h12v18l-6-4-6 4z",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  plus: "M12 5v14M5 12h14",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
};

function StatusLabel({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
      <span className={`size-2 rounded-full ${STATUS_DOT[status] ?? "bg-faint"}`} aria-hidden />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

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

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=listbox]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`adm-pop flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float outline-none sm:rounded-3xl ${wide ? "sm:max-w-5xl" : "sm:max-w-xl"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            {subtitle ? <div className="mt-0.5 text-sm text-muted">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`-mr-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink ${focusRing}`}
            aria-label="Fechar"
          >
            <Icon d={ICON.close} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-sunken/40 px-5 py-3.5 sm:px-6">{footer}</footer>
        ) : null}
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
  const [dropping, setDropping] = useState(false);
  const [showUrl, setShowUrl] = useState(!features.upload);
  const vertical = form.kind === "story" || form.kind === "reel";

  // Atalhos de horário (horários comuns de post)
  const quickTimes = useMemo(() => {
    const now = new Date();
    const at = (addDays: number, h: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + addDays, h, 0);
    const opts: { label: string; date: Date }[] = [];
    for (const h of [12, 18]) if (at(0, h).getTime() > now.getTime() + 15 * 60000) opts.push({ label: `Hoje ${h}h`, date: at(0, h) });
    opts.push({ label: "Amanhã 12h", date: at(1, 12) }, { label: "Amanhã 18h", date: at(1, 18) });
    return opts.slice(0, 3);
  }, []);

  const kindIcon: Record<IgPostKind, string> = { image: ICON.image, carousel: ICON.carousel, reel: ICON.reel, story: ICON.story };
  const kindHint: Record<IgPostKind, string> = { image: "1 imagem", carousel: "2 a 10", reel: "vídeo vertical", story: "24 horas" };

  const footer = (
    <>
      {form.id ? (
        <button type="button" className={`${btnGhost} text-danger hover:bg-danger-soft hover:text-danger max-sm:order-last max-sm:w-full`} disabled={!!busy} onClick={remove}>
          <Icon d={ICON.trash} className="size-4" /> Excluir
        </button>
      ) : null}
      <p className="mr-auto hidden text-xs text-muted sm:block">
        {problems.length ? `${problems.length} pendência${problems.length > 1 ? "s" : ""} para publicar` : form.scheduledAt ? `Sai em ${fmtDateTime(form.scheduledAt)}` : "Sem data: fica como rascunho"}
      </p>
      <button type="button" className={`${btnGhost} max-sm:flex-1`} disabled={!!busy} onClick={() => save("agora")}>
        {busy === "agora" ? "Publicando…" : "Publicar agora"}
      </button>
      <button type="button" className={`${btn} max-sm:flex-1`} disabled={!!busy} onClick={() => save("rascunho")}>
        {busy === "rascunho" ? "Salvando…" : "Salvar rascunho"}
      </button>
      <button type="button" className={`${btnPrimary} max-sm:order-first max-sm:w-full`} disabled={!!busy} onClick={() => save("agendado")}>
        <Icon d={ICON.clock} className="size-4" />
        {busy === "agendado" ? "Agendando…" : "Agendar"}
      </button>
    </>
  );

  return (
    <Modal
      title={form.id ? "Editar post" : "Novo post"}
      subtitle={username ? `Publica em @${username}` : "Conecte a conta para publicar"}
      onClose={onClose}
      footer={footer}
      wide
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {/* Formato */}
          <fieldset>
            <legend className={smallLabel}>Formato</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Formato">
              {(Object.keys(KIND_LABEL) as IgPostKind[]).map((k) => {
                const on = form.kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      setForm((f) => ({ ...f, kind: k, mediaUrls: k === "carousel" ? f.mediaUrls : f.mediaUrls.slice(0, 1) }))
                    }
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${focusRing} ${
                      on ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface text-ink hover:border-line-strong"
                    }`}
                  >
                    <Icon d={kindIcon[k]} className="size-5" />
                    <span className="leading-tight">
                      <span className="block text-sm font-medium">{KIND_LABEL[k]}</span>
                      <span className={`block text-[11px] ${on ? "text-accent-text/80" : "text-muted"}`}>{kindHint[k]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Mídia */}
          <section aria-label="Mídia">
            <div className="flex items-baseline justify-between">
              <p className={smallLabel}>Mídia</p>
              {form.kind === "carousel" ? <span className="text-xs tabular-nums text-muted">{form.mediaUrls.length}/10</span> : null}
            </div>
            {form.mediaUrls.length ? (
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {form.mediaUrls.map((u, i) => (
                  <li key={`${u}-${i}`} className="group relative overflow-hidden rounded-xl border border-line">
                    <Thumb url={u} className="aspect-square w-full" />
                    {form.kind === "carousel" ? (
                      <span className="absolute top-1.5 left-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/65 text-[10px] font-semibold text-white tabular-nums">
                        {i + 1}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={`absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${focusRing}`}
                      onClick={() => set("mediaUrls", form.mediaUrls.filter((_, j) => j !== i))}
                      aria-label={`Remover mídia ${i + 1}`}
                    >
                      <Icon d={ICON.close} className="size-3.5" />
                    </button>
                    {form.kind === "carousel" && form.mediaUrls.length > 1 ? (
                      <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button type="button" disabled={i === 0} className={`inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white disabled:invisible ${focusRing}`} onClick={() => move(i, -1)} aria-label="Mover para a esquerda">
                          <Icon d={ICON.left} className="size-3.5" />
                        </button>
                        <button type="button" disabled={i === form.mediaUrls.length - 1} className={`inline-flex size-7 items-center justify-center rounded-full bg-black/65 text-white disabled:invisible ${focusRing}`} onClick={() => move(i, 1)} aria-label="Mover para a direita">
                          <Icon d={ICON.right} className="size-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {form.mediaUrls.length < maxMedia ? (
              <div className="mt-2 space-y-2">
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
                    <button
                      type="button"
                      disabled={uploading > 0}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropping(true);
                      }}
                      onDragLeave={() => setDropping(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropping(false);
                        void onFiles(e.dataTransfer.files);
                      }}
                      className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${focusRing} ${
                        dropping ? "border-accent bg-accent-soft" : "border-line-strong bg-sunken/40 hover:border-accent/60 hover:bg-sunken/70"
                      }`}
                    >
                      <Icon d={ICON.upload} className="size-6 text-muted" />
                      <span className="text-sm font-medium">{uploading > 0 ? `Enviando ${uploading} arquivo${uploading > 1 ? "s" : ""}…` : "Arraste ou clique para enviar"}</span>
                      <span className="text-xs text-muted">
                        {form.kind === "reel" ? "MP4 ou MOV, vertical" : form.kind === "carousel" ? "Até 10 imagens ou vídeos" : "JPEG, PNG ou vídeo"}
                      </span>
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-muted">Para enviar arquivos direto daqui, conecte um Blob store ao projeto na Vercel.</p>
                )}
                {showUrl ? (
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      placeholder="https://… (imagem ou vídeo público)"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addUrl(urlDraft);
                        }
                      }}
                    />
                    <button type="button" className={btn} onClick={() => addUrl(urlDraft)} disabled={!urlDraft.trim()}>
                      Adicionar
                    </button>
                  </div>
                ) : (
                  <button type="button" className={`${btnGhost} -ml-3`} onClick={() => setShowUrl(true)}>
                    <Icon d={ICON.link} className="size-4" /> Usar um link
                  </button>
                )}
              </div>
            ) : null}
          </section>

          {form.kind === "reel" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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

          {/* Legenda */}
          {form.kind !== "story" ? (
            <div>
              <label htmlFor="ig-caption" className={smallLabel}>
                Legenda
              </label>
              <div className={`${control} mt-2 overflow-hidden focus-within:border-accent focus-within:bg-surface focus-within:ring-4 focus-within:ring-accent/10`}>
                <textarea
                  id="ig-caption"
                  className="block min-h-40 w-full resize-y bg-transparent px-3.5 py-3 text-base leading-relaxed outline-none sm:text-sm"
                  value={form.caption}
                  onChange={(e) => set("caption", e.target.value)}
                  placeholder="Escreva a legenda…"
                />
                <div className="flex items-center justify-end gap-3 border-t border-line px-3.5 py-1.5 text-[11px] tabular-nums text-muted">
                  <span className={hashtags > 30 ? "font-medium text-danger" : ""}>{hashtags}/30 hashtags</span>
                  <span className={form.caption.length > 2200 ? "font-medium text-danger" : ""}>{nf.format(form.caption.length)}/2.200</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-sunken/70 px-4 py-3 text-sm text-muted">Stories não levam legenda pela API.</p>
          )}

          {/* Quando */}
          <div>
            <label htmlFor="ig-when" className={smallLabel}>
              Quando publicar
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="ig-when"
                type="datetime-local"
                className={`${inputClass} sm:max-w-60`}
                value={toLocalInput(form.scheduledAt)}
                onChange={(e) => set("scheduledAt", fromLocalInput(e.target.value))}
              />
              <div className="flex flex-wrap gap-1.5">
                {quickTimes.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    className={pill(!!form.scheduledAt && new Date(form.scheduledAt).getTime() === q.date.getTime())}
                    onClick={() => set("scheduledAt", q.date.toISOString())}
                  >
                    {q.label}
                  </button>
                ))}
                {form.scheduledAt ? (
                  <button type="button" className={pill(false)} onClick={() => set("scheduledAt", null)}>
                    Sem data
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <details className="group rounded-xl border border-line" open={!!(form.notes || form.tags.length)}>
            <summary className={`flex list-none items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${focusRing}`}>
              Organização interna
              <span className="text-xs font-normal text-muted">{tags.length ? tags.map((t) => `#${t}`).join(" ") : "etiquetas e notas"}</span>
            </summary>
            <div className="space-y-4 border-t border-line px-4 py-4">
              <label className="block">
                <span className={smallLabel}>Etiquetas, separadas por vírgula</span>
                <input className={`${inputClass} mt-2`} value={tagsDraft} onChange={(e) => setTagsDraft(e.target.value)} placeholder="cliente, bastidores" />
              </label>
              <label className="block">
                <span className={smallLabel}>Notas (só aparecem no painel)</span>
                <textarea className={`${areaClass} mt-2 min-h-20`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </label>
            </div>
          </details>

          {problems.length ? (
            <div role="status" className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <Icon d={ICON.info} className="mt-0.5 size-4" />
              <ul className="space-y-0.5">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Prévia: como o post aparece no app */}
        <aside aria-label="Prévia" className="lg:sticky lg:top-0 lg:self-start">
          <p className={smallLabel}>Prévia</p>
          <div className="mt-2 overflow-hidden rounded-[22px] border border-line bg-surface shadow-float">
            {vertical ? (
              <div className="relative aspect-[9/16] max-h-[520px] bg-black">
                <Thumb url={preview} className="size-full" />
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 pt-3 pb-8">
                  {form.kind === "story" ? <div className="mb-2 h-0.5 rounded-full bg-white/80" /> : null}
                  <div className="flex items-center gap-2 text-white">
                    <span className="size-7 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[2px]">
                      <span className="block size-full rounded-full bg-neutral-800" />
                    </span>
                    <span className="text-xs font-semibold">{username || "seu_perfil"}</span>
                  </div>
                </div>
                {form.kind === "reel" ? (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-white">
                    <p className="line-clamp-2 text-xs leading-relaxed">{form.caption || "Sua legenda aparece aqui"}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="size-8 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 p-[2px]">
                    <span className="block size-full rounded-full border-2 border-surface bg-sunken" />
                  </span>
                  <span className="text-[13px] font-semibold">{username || "seu_perfil"}</span>
                </div>
                <div className="relative aspect-[4/5] bg-sunken">
                  <Thumb url={preview} className="size-full" />
                  {form.kind === "carousel" && form.mediaUrls.length > 1 ? (
                    <span className="absolute top-2.5 right-2.5 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
                      1/{form.mediaUrls.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3.5 px-3 pt-2.5 text-ink">
                  <Icon d={ICON.heart} className="size-[22px]" />
                  <Icon d={ICON.comment} className="size-[22px]" />
                  <Icon d={ICON.send} className="size-[22px]" />
                  {form.kind === "carousel" && form.mediaUrls.length > 1 ? (
                    <span className="mx-auto flex gap-1" aria-hidden>
                      {form.mediaUrls.map((u, i) => (
                        <span key={`${u}-${i}`} className={`size-1.5 rounded-full ${i === 0 ? "bg-sky-500" : "bg-line-strong"}`} />
                      ))}
                    </span>
                  ) : (
                    <span className="mx-auto" />
                  )}
                  <Icon d={ICON.save} className="size-[22px]" />
                </div>
                <p className="line-clamp-4 px-3 pt-2 pb-3.5 text-[13px] leading-snug whitespace-pre-wrap">
                  <strong className="font-semibold">{username || "seu_perfil"}</strong>{" "}
                  {form.caption || <span className="text-faint">Sua legenda aparece aqui</span>}
                </p>
              </>
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Icon d={ICON.clock} className="size-3.5" />
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

  const entryClass = `flex items-center gap-1.5 rounded-lg text-left text-[11px] leading-tight transition-colors sm:w-full sm:border sm:border-line sm:bg-surface sm:p-0.5 sm:pr-1.5 sm:hover:border-line-strong sm:hover:bg-sunken/60 max-sm:p-1 ${focusRing}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:px-5">
        <h3 className="text-lg font-semibold tracking-tight">{monthLabel}</h3>
        <span className="text-sm text-muted">
          {scheduledThisMonth ? `${scheduledThisMonth} agendado${scheduledThisMonth > 1 ? "s" : ""}` : "Nada agendado"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={`${btnSm} px-2`} onClick={() => shift(-1)} aria-label="Mês anterior">
            <Icon d={ICON.left} className="size-4" />
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
          <button type="button" className={`${btnSm} px-2`} onClick={() => shift(1)} aria-label="Próximo mês">
            <Icon d={ICON.right} className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-y border-line bg-sunken/50 text-center text-xs font-medium text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const entries = byDay.get(k) ?? [];
          const past = k < todayKey;
          const isToday = k === todayKey;
          return (
            <div
              key={k}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(k);
              }}
              onDragLeave={() => setDragOver((v) => (v === k ? "" : v))}
              onDrop={(e) => onDrop(e, d)}
              className={`group relative min-h-24 border-b border-line p-1 text-left sm:min-h-32 sm:p-1.5 ${(i + 1) % 7 ? "border-r" : ""} ${
                !inMonth ? "bg-sunken/40" : past ? "bg-sunken/20" : ""
              } ${dragOver === k ? "bg-accent-soft ring-2 ring-accent/40 ring-inset" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                    isToday ? "bg-accent font-semibold text-accent-ink" : inMonth ? (past ? "text-muted" : "text-ink") : "text-faint"
                  }`}
                >
                  {d.getDate()}
                </span>
                {!past ? (
                  <button
                    type="button"
                    onClick={() => onNew(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0))}
                    className={`inline-flex size-6 items-center justify-center rounded-full text-faint opacity-100 transition-colors hover:bg-accent-soft hover:text-accent-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 ${focusRing}`}
                    aria-label={`Novo post em ${d.toLocaleDateString("pt-BR")}`}
                  >
                    <Icon d={ICON.plus} className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <ul className="mt-1 flex flex-wrap gap-0.5 sm:block sm:space-y-1">
                {entries.slice(0, 3).map((e) =>
                  e.type === "post" ? (
                    <li key={e.post.id}>
                      <button
                        type="button"
                        draggable={e.post.status !== "publicado" && e.post.status !== "publicando"}
                        onDragStart={(ev) => ev.dataTransfer.setData("text/ig-post", e.post.id)}
                        onClick={() => onOpenPost(e.post)}
                        title={`${STATUS_LABEL[e.post.status]} · ${KIND_LABEL[e.post.kind]} · ${e.post.caption.slice(0, 80)}`}
                        className={`${entryClass} ${e.post.status === "erro" ? "border-danger/40" : ""} ${e.post.status === "rascunho" ? "border-dashed" : ""}`}
                      >
                        <span className="relative shrink-0">
                          <Thumb url={e.post.mediaUrls[0] ?? ""} className="hidden size-6 rounded-md sm:block" />
                          <span className={`block size-2.5 rounded-full sm:absolute sm:size-2 sm:-right-0.5 sm:-bottom-0.5 sm:ring-2 sm:ring-surface ${STATUS_DOT[e.post.status]}`} />
                        </span>
                        <span className="hidden min-w-0 sm:block">
                          <span className="hidden font-medium tabular-nums sm:block">{timeOf(e.at)}</span>
                          <span className="hidden truncate text-muted sm:block">{e.post.caption || KIND_LABEL[e.post.kind]}</span>
                        </span>
                      </button>
                    </li>
                  ) : (
                    <li key={e.media.id}>
                      <button type="button" onClick={() => onOpenMedia(e.media)} title={e.media.caption.slice(0, 80)} className={entryClass}>
                        <span className="relative shrink-0">
                          <Thumb url={e.media.thumbnailUrl || e.media.mediaUrl} className="hidden size-6 rounded-md sm:block" />
                          <span className={`block size-2.5 rounded-full sm:absolute sm:size-2 sm:-right-0.5 sm:-bottom-0.5 sm:ring-2 sm:ring-surface ${STATUS_DOT.instagram}`} />
                        </span>
                        <span className="hidden min-w-0 sm:block">
                          <span className="hidden font-medium tabular-nums sm:block">{timeOf(e.at)}</span>
                          <span className="hidden truncate text-muted sm:block">{e.media.caption || e.media.mediaType}</span>
                        </span>
                      </button>
                    </li>
                  ),
                )}
                {entries.length > 3 ? <li className="px-1 text-[11px] font-medium text-muted">+{entries.length - 3}<span className="hidden sm:inline"> mais</span></li> : null}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-xs text-muted sm:px-5">
        {["rascunho", "agendado", "publicado", "erro"].map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${STATUS_DOT[st]}`} />
            {STATUS_LABEL[st]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className={`size-2 rounded-full ${STATUS_DOT.instagram}`} />
          Publicado fora do painel
        </span>
        <span className="ml-auto hidden sm:inline">Arraste um post para outro dia para reagendar</span>
      </div>
      <p className="flex gap-2 border-t border-line bg-sunken/40 px-4 py-3 text-xs text-muted sm:px-5">
        <Icon d={ICON.info} className="mt-px size-4" />
        Posts agendados no Meta Business Suite só aparecem aqui depois de publicados: a API do Instagram não dá acesso à fila de agendamento de lá. Agende pelo painel para ver tudo no calendário.
      </p>
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
      {!filtered.length ? (
        <div className={`${cardClass} py-10 text-center`}>
          <p className="text-sm text-muted">{filter === "pendentes" ? "Nenhum post pendente." : "Nenhum post neste filtro."}</p>
        </div>
      ) : null}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {filtered.map((p) => (
          <li key={p.id} className="flex gap-4 p-3 sm:p-4">
            <Thumb url={p.mediaUrls[0] ?? ""} className="size-16 shrink-0 rounded-xl sm:size-20" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusLabel status={p.status} />
                <span className="text-xs text-muted">{KIND_LABEL[p.kind]}</span>
                <span className="text-xs tabular-nums text-muted">{fmtDateTime(p.publishedAt ?? p.scheduledAt)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm">{p.caption || <span className="text-faint">Sem legenda</span>}</p>
              {p.tags.length ? <p className="mt-1 truncate text-xs text-muted">{p.tags.map((t) => `#${t}`).join(" ")}</p> : null}
              {p.error ? <p className="mt-1.5 rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs text-danger">{p.error}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end justify-center gap-1.5 sm:flex-row sm:items-center">
              {p.status === "publicado" ? (
                p.permalink ? (
                  <a className={btnSm} href={p.permalink} target="_blank" rel="noreferrer">
                    Ver no Instagram <Icon d={ICON.external} className="size-3.5" />
                  </a>
                ) : null
              ) : p.status === "publicando" ? (
                <span className="text-xs text-muted">Processando…</span>
              ) : (
                <>
                  {p.status === "erro" ? (
                    <button type="button" className={btnSm} onClick={() => onRetry(p)}>
                      Corrigir e reagendar
                    </button>
                  ) : null}
                  <button type="button" className={btnSm} onClick={() => onOpen(p)}>
                    Editar
                  </button>
                </>
              )}
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
              <button type="button" onClick={() => onOpen(m)} className={`group block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left transition-colors hover:border-line-strong ${focusRing}`}>
                <div className="relative overflow-hidden">
                  <Thumb url={m.thumbnailUrl || m.mediaUrl} className="aspect-[4/5] w-full transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    {m.productType === "REELS" ? "Reels" : m.mediaType === "CAROUSEL_ALBUM" ? "Carrossel" : m.productType === "STORY" ? "Story" : "Foto"}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-muted">{m.postedAt ? new Date(m.postedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : ""}</p>
                  <dl className="mt-1.5 grid grid-cols-3 gap-1 text-xs tabular-nums">
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
  const kind = media.productType === "REELS" ? "Reels" : media.mediaType === "CAROUSEL_ALBUM" ? "Carrossel" : media.productType === "STORY" ? "Story" : "Foto";
  return (
    <Modal
      title="Post publicado"
      subtitle={`${kind}${media.postedAt ? ` · ${new Date(media.postedAt).toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}`}
      onClose={onClose}
      wide
      footer={
        <>
          {media.permalink ? (
            <a className={`${btnGhost} mr-auto`} href={media.permalink} target="_blank" rel="noreferrer">
              Abrir no Instagram <Icon d={ICON.external} className="size-4" />
            </a>
          ) : (
            <span className="mr-auto" />
          )}
          <button type="button" className={btn} onClick={() => onReuse(media)}>
            Reutilizar legenda
          </button>
          <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,360px)_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-black md:self-start">
          {media.mediaType === "VIDEO" && media.mediaUrl ? (
            <video src={media.mediaUrl} poster={media.thumbnailUrl} controls className="w-full" />
          ) : (
            <Thumb url={media.thumbnailUrl || media.mediaUrl} className="aspect-[4/5] w-full" />
          )}
        </div>
        <div className="space-y-5">
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
            {stats.map(([k, v], i) => (
              <div key={k} className={`bg-surface p-3 ${i === stats.length - 1 ? "col-span-3 sm:col-span-2" : ""}`}>
                <dt className="text-[11px] text-muted">{k}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">{typeof v === "string" ? v : fmtNum(v)}</dd>
              </div>
            ))}
          </dl>
          {media.caption ? (
            <div className="max-h-44 overflow-y-auto rounded-xl bg-sunken/60 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">{media.caption}</div>
          ) : null}
          <label className="block">
            <span className={smallLabel}>Etiquetas</span>
            <input className={`${inputClass} mt-2`} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="campanha, cliente-x" />
          </label>
          <label className="block">
            <span className={smallLabel}>Notas</span>
            <textarea className={`${areaClass} mt-2 min-h-20`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="O que funcionou neste post?" />
          </label>
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
      {!list.length ? (
        <div className={`${cardClass} py-10 text-center`}>
          <p className="text-sm text-muted">{status === "novo" ? "Nenhum comentário esperando resposta." : "Nenhum comentário neste filtro."}</p>
        </div>
      ) : null}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((c) => (
          <li key={c.id} className={`p-4 ${c.hidden ? "opacity-60" : ""}`}>
            <div className="flex gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold text-muted uppercase" aria-hidden>
                {c.username.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <a className="font-semibold hover:underline" href={`https://instagram.com/${c.username}`} target="_blank" rel="noreferrer">
                    @{c.username}
                  </a>{" "}
                  <span className="text-xs text-muted">há {relTime(c.postedAt)}</span>
                  {c.parentId ? <span className="ml-1.5 text-xs text-muted">respondendo em uma conversa</span> : null}
                  {c.hidden ? <span className="ml-1.5 rounded-full bg-sunken px-2 py-0.5 text-[11px] text-muted">Oculto</span> : null}
                </p>
                <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">{c.text}</p>
                {repliesOf(c.id).map((r) => (
                  <p key={r.id} className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted">
                    <span className="font-medium text-ink">Você:</span> {r.text}
                  </p>
                ))}

                {replying === c.id ? (
                  <div className="mt-3 space-y-2 rounded-xl bg-sunken/60 p-3">
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
              <a href={c.mediaPermalink || undefined} target="_blank" rel="noreferrer" className={`shrink-0 rounded-lg ${focusRing}`} title={c.mediaCaption || "Post"}>
                <Thumb url={c.mediaThumb} className="size-12 rounded-lg" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Conta ----------

type WebhookInfo = Awaited<ReturnType<typeof orcamentosApi.igWebhookInfo>>;

function WebhookCard({ showToast }: { showToast: (m: string) => void }) {
  const [info, setInfo] = useState<WebhookInfo | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setInfo(await orcamentosApi.igWebhookInfo());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const copy = async (text: string | null, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copiado`);
    } catch {
      showToast("Não deu para copiar");
    }
  };

  return (
    <div className={`${cardClass} lg:col-span-2`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Webhook da Meta</h3>
        <button type="button" className={btnSm} onClick={() => void load()}>
          Atualizar
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Cole estes dados em developers.facebook.com → seu app → Instagram API → “Configure webhooks” e clique em “Verify and save”.
        Comentários e menções novos puxam os comentários na hora.
      </p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {info ? (
        <>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className={smallLabel}>Callback URL</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-sunken px-2 py-1.5 font-mono text-xs">{info.callbackUrl ?? "Defina ORCAMENTOS_PUBLIC_URL"}</code>
                <button type="button" className={btnSm} disabled={!info.callbackUrl} onClick={() => void copy(info.callbackUrl, "URL")}>
                  Copiar
                </button>
              </dd>
            </div>
            <div>
              <dt className={smallLabel}>Verify token</dt>
              <dd className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-sunken px-2 py-1.5 font-mono text-xs">{info.verifyToken ? "•".repeat(24) : "Defina META_WEBHOOK_VERIFY_TOKEN"}</code>
                <button type="button" className={btnSm} disabled={!info.verifyToken} onClick={() => void copy(info.verifyToken, "Token")}>
                  Copiar
                </button>
              </dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-1.5 text-sm text-muted">
            <li>{info.appSecretConfigured ? "META_APP_SECRET configurado: assinaturas conferidas." : "⚠ Defina META_APP_SECRET na Vercel: sem ele todo evento é recusado (401)."}</li>
            {!info.tableReady ? <li>⚠ Rode npm run db:migrate para criar a tabela meta_webhook_events.</li> : null}
          </ul>
          {info.events.length ? (
            <div className="mt-4">
              <p className={smallLabel}>Últimos eventos</p>
              <ul className="mt-2 divide-y divide-line text-sm">
                {info.events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="font-mono text-xs">
                      {e.object}/{e.field || "?"}
                    </span>
                    <span className={`text-xs ${e.error ? "text-red-600" : "text-muted"}`} title={e.error || undefined}>
                      {e.error ? "erro · " : ""}
                      {relTime(e.receivedAt)} atrás
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : info.tableReady ? (
            <p className="mt-4 text-sm text-muted">Nenhum evento recebido ainda.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
              Token {daysLeft == null ? "sem validade (não expira)" : daysLeft > 0 ? `válido por ~${daysLeft} dias` : "expirado — conecte de novo"}
              {a.expiryGuessed ? " (estimado)" : ""}.{daysLeft == null ? "" : " Ele é renovado sozinho pelo agendador diário."}
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
            <input className={`${inputClass} mt-2 font-mono`} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAA… ou IGAA…" />
          </label>
          <button type="button" className={`${btn} w-full`} disabled={busy || token.trim().length < 20} onClick={connect}>
            {busy ? "Validando…" : "Salvar token"}
          </button>
        </div>
        <details className="mt-4 text-sm text-muted">
          <summary className="cursor-pointer font-medium">Como gerar o token</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Em developers.facebook.com → seu app → Instagram API → “API setup with Unified login”, crie a configuração (passo 1).</li>
            <li>No passo 2, clique em “Generate token” na linha da sua conta e cole o token (EAA…) aqui. Ele não expira.</li>
            <li>Apps antigos com login do Instagram: o token começa com IGAA e é renovado automaticamente.</li>
            <li>Para o botão “Entrar com Instagram”: defina META_APP_ID, META_APP_SECRET e META_LOGIN_CONFIG_ID (ID da configuração) na Vercel.</li>
          </ol>
        </details>
      </div>

      <WebhookCard showToast={showToast} />
    </div>
  );
}
