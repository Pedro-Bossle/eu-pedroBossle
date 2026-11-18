import { useMemo, useState } from "react";
import type { OrcamentoClient, OrcamentoProposal } from "../../../types/orcamentos";
import { focusRing, inputClass, pill } from "../panelStyles";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import { CLIENT_STATUSES, clientStatus, money, waLink, ymd } from "./model";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Cor estável do avatar a partir do nome (tons suaves). */
const AVATAR = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#e0f2fe", "#ffedd5"];
const avatarBg = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

export default function ClientList({
  clients,
  proposals,
  onOpen,
  onNewProposal,
  onDelete,
}: {
  clients: OrcamentoClient[];
  proposals: OrcamentoProposal[];
  onOpen: (c: OrcamentoClient) => void;
  onNewProposal: (clientId: string) => void;
  onDelete: (c: OrcamentoClient) => void;
}) {
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"nome" | "valor" | "contato" | "recente">("nome");

  const won = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of proposals) if (p.status.toLowerCase().includes("aprov")) m.set(p.clientId, (m.get(p.clientId) ?? 0) + Number(p.total || 0));
    return m;
  }, [proposals]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of clients) m.set(c.status ?? "ativo", (m.get(c.status ?? "ativo") ?? 0) + 1);
    return m;
  }, [clients]);

  const today = ymd(new Date());
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = clients.filter(
      (c) =>
        (!status || (c.status ?? "ativo") === status) &&
        (!needle || `${c.name} ${c.company} ${c.email} ${c.phone} ${(c.tags ?? []).join(" ")}`.toLowerCase().includes(needle)),
    );
    const by: Record<typeof sort, (a: OrcamentoClient, b: OrcamentoClient) => number> = {
      nome: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
      valor: (a, b) => (won.get(b.id) ?? 0) + (b.monthlyValue ?? 0) * 12 - ((won.get(a.id) ?? 0) + (a.monthlyValue ?? 0) * 12),
      contato: (a, b) => (a.nextContactAt ?? "9999").localeCompare(b.nextContactAt ?? "9999"),
      recente: (a, b) => (b.created ?? "").localeCompare(a.created ?? ""),
    };
    return [...arr].sort(by[sort]);
  }, [clients, status, q, sort, won]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex max-w-full gap-1.5 relative overflow-x-auto px-1 pb-1">
          <button type="button" className={pill(!status)} aria-pressed={!status} onClick={() => setStatus("")}>
            Todos <span className="tabular-nums opacity-60">{clients.length}</span>
          </button>
          {CLIENT_STATUSES.map((s) => (
            <button key={s.value} type="button" className={pill(status === s.value)} aria-pressed={status === s.value} onClick={() => setStatus(s.value)}>
              <span className="size-1.5 rounded-full" style={{ background: s.dot }} />
              {s.label} <span className="tabular-nums opacity-60">{counts.get(s.value) ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto grid grid-cols-1 w-full gap-2 sm:w-auto sm:grid-cols-[220px_190px]">
          <input className={`${inputClass} min-h-9 py-1.5`} placeholder="Buscar nome, empresa, etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cliente" />
          <Select
            size="sm"
            ariaLabel="Ordenar clientes"
            value={sort}
            onChange={(v) => setSort(v)}
            options={[
              { value: "nome", label: "Nome (A–Z)" },
              { value: "valor", label: "Maior valor" },
              { value: "contato", label: "Próximo contato" },
              { value: "recente", label: "Mais recentes" },
            ]}
          />
        </div>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
        {list.map((c) => {
          const st = clientStatus(c.status);
          const late = c.nextContactAt && c.nextContactAt <= today;
          const wa = waLink(c.phone);
          const total = won.get(c.id) ?? 0;
          return (
            <li key={c.id} className="group flex items-center gap-3 border-b border-line px-3 py-3 last:border-0 hover:bg-sunken/40 sm:px-4">
              <button type="button" onClick={() => onOpen(c)} className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left ${focusRing}`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold text-[#18202a]" style={{ background: avatarBg(c.name) }} aria-hidden>
                  {initials(c.name) || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-px text-[11px] font-medium sm:inline-flex ${st.chip}`}>
                      <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                      {st.label}
                    </span>
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    {c.company ? <span className="truncate">{c.company}</span> : null}
                    {(c.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-sunken px-1.5 py-px text-[11px]">
                        {t}
                      </span>
                    ))}
                    {c.nextContactAt ? (
                      <span className={late ? "font-medium text-danger" : "text-faint"}>
                        {late ? "Contatar" : "Contato"} {new Date(`${c.nextContactAt}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="hidden shrink-0 text-right sm:block">
                  <span className="block text-sm font-medium tabular-nums">{total ? money(total) : "—"}</span>
                  <span className="text-[11px] text-faint">{c.monthlyValue ? `+ ${money(c.monthlyValue)}/mês` : "fechado"}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${c.name}`} className={`grid size-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-[#1f9d55] ${focusRing}`}>
                    <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" className="size-4" />
                  </a>
                ) : null}
                <button type="button" onClick={() => onNewProposal(c.id)} aria-label={`Novo orçamento para ${c.name}`} className={`grid size-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink ${focusRing}`}>
                  <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  aria-label={`Excluir ${c.name}`}
                  className={`grid size-9 place-items-center rounded-full text-faint opacity-100 hover:bg-danger-soft hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 ${focusRing}`}
                >
                  <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
        {!list.length ? (
          <li className="px-4 py-12 text-center text-sm text-muted">{clients.length ? "Nenhum cliente com esse filtro." : "Nenhum cliente ainda. Cadastre o primeiro para emitir propostas."}</li>
        ) : null}
      </ul>
    </div>
  );
}
