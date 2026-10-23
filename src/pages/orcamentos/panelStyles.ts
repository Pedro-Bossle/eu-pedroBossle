/** Classes compartilhadas do painel de orçamentos. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-[#121212]";
export const inputClass =
  `w-full min-h-12 border border-neutral-200 bg-[#f9f9f9] px-4 py-3.5 text-base outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400 ${focusRing}`;
export const textareaClass = `${inputClass} min-h-40 resize-y leading-relaxed`;
export const cardClass =
  "border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#151515] xl:p-6";
export const shellClass =
  "mx-auto w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]";
export const btn =
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium transition-[border-color,opacity] hover:border-neutral-400 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`;
export const btnPrimary =
  `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900 ${focusRing}`;
