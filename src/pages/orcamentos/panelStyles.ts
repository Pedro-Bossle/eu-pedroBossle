/**
 * Primitivas visuais do painel. Use estas classes em vez de repetir cores:
 * as cores vêm dos tokens em src/index.css (bg-surface, text-muted…),
 * que já resolvem claro/escuro.
 */

/** Anel de foco visível só para teclado. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

/** Raiz de cada tela do painel (fundo, tinta e cursores). */
export const appRoot =
  "adm min-h-dvh bg-canvas text-ink [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_summary]:cursor-pointer [&_[role=button]]:cursor-pointer";

// ---------- Campos ----------

const field = `rounded-[10px] border border-line bg-sunken/60 text-ink placeholder:text-faint outline-none transition-[border-color,background-color,box-shadow] hover:border-line-strong focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:opacity-60 ${focusRing}`;

export const control = field;
export const inputClass = `${field} w-full min-h-11 px-3.5 py-2.5 text-base sm:text-sm`;
export const inputSm = `${field} min-h-9 px-2.5 py-1.5 text-sm`;
export const textareaClass = `${field} w-full min-h-40 resize-y px-3.5 py-3 text-base leading-relaxed sm:text-sm`;
export const selectClass = `${inputClass} appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9 [background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a93a0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`;

// ---------- Superfícies ----------

/** Bloco de conteúdo: borda fina, sem sombra (sombra é só para o que flutua). */
export const cardClass = "rounded-2xl border border-line bg-surface p-5 xl:p-6";
/** Bloco secundário dentro de um card. */
export const insetClass = "rounded-xl bg-sunken/70 p-4";
/** Camadas flutuantes: modal, toast, popover. */
export const floatClass = "rounded-2xl border border-line bg-surface shadow-float";
export const shellClass = "w-full";

// ---------- Botões ----------

const btnBase = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap transition-[background-color,border-color,color,opacity,transform] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 ${focusRing}`;

export const btn = `${btnBase} min-h-10 border border-line bg-surface px-4 py-2 text-sm text-ink hover:border-line-strong hover:bg-sunken/60`;
export const btnPrimary = `${btnBase} min-h-10 bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:brightness-110`;
export const btnGhost = `${btnBase} min-h-10 px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-ink`;
export const btnSm = `${btnBase} min-h-8 border border-line bg-surface px-2.5 py-1 text-xs text-ink hover:border-line-strong hover:bg-sunken/60`;
export const btnDanger = `${btnBase} min-h-10 border border-line bg-surface px-4 py-2 text-sm text-danger hover:border-danger/40 hover:bg-danger-soft`;
export const btnDangerSm = `${btnSm} text-danger hover:border-danger/40 hover:bg-danger-soft`;
export const btnWhatsApp = `${btnBase} min-h-9 bg-[#1f9d55] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110`;

// ---------- Texto ----------

/** Rótulo de campo/seção: caixa normal, discreto. */
export const labelClass = "text-[13px] font-medium text-muted";
export const hintClass = "text-xs text-faint";
export const linkClass = "font-medium text-accent-text underline decoration-accent/30 underline-offset-4 hover:decoration-accent";
export const pageTitle = "text-2xl font-semibold tracking-tight text-ink";

/** Pílula de status/etiqueta. */
export const chip = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

/** Abas internas (segmentado). */
export const tabList = "flex gap-1 overflow-x-auto rounded-xl bg-sunken/70 p-1";
export const tabItem = (active: boolean) =>
  `shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors ${focusRing} ${
    active ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted hover:text-ink"
  }`;

/** Botão de filtro (pílula com estado). */
export const pill = (active: boolean) =>
  `inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${focusRing} ${
    active ? "border-transparent bg-ink text-canvas" : "border-line bg-surface text-muted hover:text-ink hover:border-line-strong"
  }`;
