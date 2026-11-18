import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { focusRing } from "../panelStyles";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  /** Texto auxiliar à direita (contagem, valor…). */
  hint?: string;
  /** Cor de identificação (bolinha à esquerda). */
  dot?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel: string;
  placeholder?: string;
  size?: "md" | "sm";
  className?: string;
  disabled?: boolean;
  /** Campo de busca no topo. Ligado sozinho com mais de 8 opções. */
  searchable?: boolean;
  /** Permite escolher um valor digitado que não está na lista. */
  creatable?: boolean;
  /** Ícone/prefixo dentro do botão. */
  leading?: ReactNode;
};

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Menu suspenso do painel (substitui o <select> nativo).
 * Listbox acessível: setas, Home/End, Enter, Esc e busca por digitação.
 * O menu abre num portal com posição fixa, então não é cortado por tabelas
 * com rolagem nem por modais.
 */
export default function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = "Selecionar",
  size = "md",
  className = "",
  disabled,
  searchable,
  creatable,
  leading,
}: Props<T>) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const withSearch = searchable ?? (creatable || options.length > 8);
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? options.filter((o) => normalize(o.label).includes(q)) : options;
    if (creatable && q && !options.some((o) => normalize(o.label) === q)) {
      return [...list, { value: query.trim() as T, label: `Criar “${query.trim()}”`, hint: "novo" }];
    }
    return list;
  }, [options, query, creatable]);

  const place = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = Math.min(320, 48 + filtered.length * 38);
    const below = window.innerHeight - r.bottom;
    const up = below < menuH + 12 && r.top > below;
    const width = Math.max(r.width, 200);
    const left = Math.min(r.left, window.innerWidth - width - 8);
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, left), width, up });
  }, [filtered.length]);

  const openMenu = () => {
    if (disabled) return;
    setQuery("");
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (opt: SelectOption<T> | undefined) => {
    if (!opt) return;
    onChange(opt.value);
    close();
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    (withSearch ? searchRef.current : listRef.current)?.focus();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    const onMove = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place, withSearch]);

  // Mantém a opção ativa visível
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onMenuKey = (e: KeyboardEvent) => {
    const last = filtered.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i >= last ? 0 : i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? last : i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(last);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (!withSearch && e.key.length === 1) {
      // Busca por digitação (sem campo de busca)
      const now = Date.now();
      const t = typeahead.current;
      t.text = now - t.at > 600 ? e.key : t.text + e.key;
      t.at = now;
      const idx = filtered.findIndex((o) => normalize(o.label).startsWith(normalize(t.text)));
      if (idx >= 0) setActive(idx);
    }
  };

  const h = size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-3.5 text-base sm:text-sm";
  const listId = `${id}-list`;
  const optId = (i: number) => `${id}-opt-${i}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${ariaLabel}: ${selected?.label ?? placeholder}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={`group inline-flex w-full items-center gap-2 rounded-[10px] border bg-sunken/60 text-left text-ink transition-[border-color,background-color,box-shadow] hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "border-accent bg-surface ring-4 ring-accent/10" : "border-line"
        } ${h} ${focusRing} ${className}`}
      >
        {leading}
        {selected?.dot ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: selected.dot }} aria-hidden /> : null}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-faint"}`}>
          {selected?.label ?? (creatable && value ? value : placeholder)}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              className="adm adm-pop fixed z-[80] overflow-hidden rounded-xl border border-line bg-surface text-ink shadow-float"
              style={{
                left: pos.left,
                width: pos.width,
                ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
              }}
            >
              {withSearch ? (
                <div className="border-b border-line p-2">
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onMenuKey}
                    placeholder={creatable ? "Buscar ou criar…" : "Buscar…"}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listId}
                    aria-activedescendant={filtered[active] ? optId(active) : undefined}
                    aria-label={`Buscar em ${ariaLabel}`}
                    className="w-full rounded-lg bg-sunken/70 px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              ) : null}
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                tabIndex={-1}
                aria-label={ariaLabel}
                aria-activedescendant={!withSearch && filtered[active] ? optId(active) : undefined}
                onKeyDown={withSearch ? undefined : onMenuKey}
                className="max-h-72 overflow-y-auto p-1 outline-none"
              >
                {filtered.map((o, i) => {
                  const isSel = o.value === value && !o.hint?.startsWith("novo");
                  return (
                    <li
                      key={`${o.value}-${i}`}
                      id={optId(i)}
                      data-index={i}
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(o)}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${
                        i === active ? "bg-sunken" : ""
                      } ${isSel ? "font-medium" : ""}`}
                    >
                      {o.dot ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: o.dot }} aria-hidden /> : null}
                      <span className="min-w-0 flex-1 truncate">{o.label}</span>
                      {o.hint ? <span className="shrink-0 text-xs tabular-nums text-faint">{o.hint}</span> : null}
                      <svg
                        viewBox="0 0 24 24"
                        className={`size-4 shrink-0 text-accent ${isSel ? "" : "invisible"}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </li>
                  );
                })}
                {!filtered.length ? <li className="px-3 py-4 text-center text-sm text-faint">Nada encontrado</li> : null}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
