import { useEffect, useRef } from "react";
import { focusRing } from "../panelStyles";
import Icon from "./Icon";

export type QuickItem = { label: string; hint?: string; icon: string; run: () => void };

/** Menu curto de criação (botão "+ Novo" e botão flutuante do celular). */
export default function QuickMenu({ items, onClose, align = "right", up }: { items: QuickItem[]; onClose: () => void; align?: "left" | "right"; up?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest("[aria-haspopup=menu]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      role="menu"
      className={`adm-pop absolute z-50 w-56 rounded-2xl border border-line bg-surface p-1.5 text-ink shadow-float ${align === "right" ? "right-0" : "left-0"} ${
        up ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
      }`}
    >
      {items.map((i) => (
        <button
          key={i.label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            i.run();
          }}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-sunken ${focusRing}`}
        >
          <span className="grid size-8 place-items-center rounded-lg bg-sunken text-muted">
            <Icon d={i.icon} className="size-4" />
          </span>
          <span className="flex-1 font-medium">{i.label}</span>
          {i.hint ? <kbd className="rounded-md border border-line px-1.5 text-[10px] text-faint">{i.hint}</kbd> : null}
        </button>
      ))}
    </div>
  );
}
