import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmSearchResult, OrcamentoClient } from "../../../types/orcamentos";
import Icon from "../ui/Icon";

export type PaletteCommand = { id: string; label: string; hint?: string; icon: string; run: () => void; keywords?: string };

const TYPE_LABEL: Record<CrmSearchResult["type"], string> = {
  client: "Cliente",
  proposal: "Orçamento",
  lead: "Lead do funil",
  task: "Tarefa",
};
const TYPE_ICON: Record<CrmSearchResult["type"], string> = {
  client: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  proposal: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  lead: "M22 3H2l8 9.46V19l4 2v-8.54z",
  task: "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca global (Ctrl/⌘ + K): ir para telas, ações rápidas e registros do CRM. */
export default function CommandPalette({
  open,
  onClose,
  commands,
  clients,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  clients: OrcamentoClient[];
  onPick: (r: CrmSearchResult) => void;
}) {
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<CrmSearchResult[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ("");
    setRemote([]);
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  // Busca no servidor com pequeno atraso para não disparar a cada tecla
  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const { results } = await orcamentosApi.crmSearch(q.trim());
        if (!cancelled) setRemote(results);
      } catch {
        /* busca local continua valendo */
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, open]);

  type Row = { key: string; label: string; sub?: string; icon: string; group: string; run: () => void };
  const rows: Row[] = useMemo(() => {
    const n = norm(q.trim());
    const cmd = commands
      .filter((c) => !n || norm(`${c.label} ${c.keywords ?? ""}`).includes(n))
      .map((c) => ({ key: `c-${c.id}`, label: c.label, sub: c.hint, icon: c.icon, group: "Ações", run: c.run }));
    if (!n) return cmd;
    const localClients = clients
      .filter((c) => norm(`${c.name} ${c.company} ${(c.tags ?? []).join(" ")}`).includes(n))
      .slice(0, 5)
      .map((c) => ({ type: "client" as const, id: c.id, title: c.name, sub: c.company }));
    const seen = new Set<string>();
    const records = [...localClients, ...remote]
      .filter((r) => {
        const k = `${r.type}-${r.id}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map((r) => ({
        key: `r-${r.type}-${r.id}`,
        label: r.title,
        sub: [TYPE_LABEL[r.type], r.sub].filter(Boolean).join(" · "),
        icon: TYPE_ICON[r.type],
        group: "Registros",
        run: () => onPick(r),
      }));
    return [...records, ...cmd];
  }, [q, commands, clients, remote, onPick]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (r: Row | undefined) => {
    if (!r) return;
    onClose();
    r.run();
  };

  return createPortal(
    <div className="adm fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[12vh]" role="presentation">
      <div className="adm-backdrop absolute inset-0 bg-ink/30 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Busca global" className="adm-pop relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.35-4.35" className="size-5 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(rows.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                run(rows[active]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Buscar cliente, orçamento, lead, tarefa… ou digite uma ação"
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `pal-${active}` : undefined}
            className="min-h-14 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-faint sm:block">Esc</kbd>
        </div>
        <ul ref={listRef} id="palette-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {rows.map((r, i) => {
            const header = i === 0 || rows[i - 1]!.group !== r.group ? r.group : "";
            return (
              <li key={r.key} role="presentation">
                {header ? <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-faint">{header}</p> : null}
                <div
                  id={`pal-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(r)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 ${i === active ? "bg-sunken" : ""}`}
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${i === active ? "bg-accent text-accent-ink" : "bg-sunken text-muted"}`}>
                    <Icon d={r.icon} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.label}</span>
                    {r.sub ? <span className="block truncate text-xs text-faint">{r.sub}</span> : null}
                  </span>
                  {i === active ? <Icon d="M9 10l-5 5 5 5M20 4v7a4 4 0 0 1-4 4H4" className="size-4 text-faint" /> : null}
                </div>
              </li>
            );
          })}
          {!rows.length ? <li className="px-3 py-8 text-center text-sm text-faint">Nada encontrado para “{q}”.</li> : null}
        </ul>
        <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-faint sm:flex">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span className="ml-auto">N cria tarefa · Ctrl K abre esta busca</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
