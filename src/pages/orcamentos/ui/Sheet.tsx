import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { focusRing } from "../panelStyles";

/**
 * Painel lateral à direita (desktop) / folha que sobe de baixo (celular).
 * Fecha com Esc, clique fora ou no X; trava a rolagem da página e devolve o foco ao sair.
 */
export default function Sheet({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "md:max-w-xl",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=listbox]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="adm fixed inset-0 z-[60] flex items-end justify-end md:items-stretch">
      <div className="adm-backdrop absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`adm-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface text-ink shadow-float outline-none md:m-3 md:max-h-none md:rounded-2xl ${width}`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-line px-5 pt-4 pb-4 md:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold tracking-tight">{title}</h2>
            {subtitle ? <div className="mt-0.5 text-sm text-muted">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={`grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink ${focusRing}`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer ? (
          <footer className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
