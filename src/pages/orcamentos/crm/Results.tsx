import { useMemo, useState } from "react";
import type { OrcamentoClient, OrcamentoProposal } from "../../../types/orcamentos";
import { BarList, Tooltip } from "../finance/charts";
import { cardClass, labelClass } from "../panelStyles";
import { money } from "./model";

/** Cores validadas (dataviz): orçado = azul, aprovado = verde; passos próprios no escuro. */
const CSS = `.res-root{--res-quoted:#2a78d6;--res-won:#059669}.dark .res-root{--res-quoted:#3987e5;--res-won:#0ea371}`;
const QUOTED = "var(--res-quoted)";
const WON = "var(--res-won)";

const ym = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthShort = (k: string) => {
  const [y, m] = k.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};
const isWon = (p: OrcamentoProposal) => p.status.toLowerCase().includes("aprov");
const isLost = (p: OrcamentoProposal) => /recus|cancel/i.test(p.status);

/**
 * Análise comercial a partir dos orçamentos: orçado × aprovado por mês (12 meses, pela data de
 * criação), ticket médio, conversão, tempo até a decisão e melhores clientes.
 */
export default function Results({ proposals, clients, onOpenClient }: { proposals: OrcamentoProposal[]; clients: OrcamentoClient[]; onOpenClient: (id: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);

  const months = useMemo(() => {
    const now = new Date();
    const keys = Array.from({ length: 12 }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - 11 + i, 1).toISOString()));
    const m = new Map(keys.map((k) => [k, { quoted: 0, won: 0, count: 0 }]));
    for (const p of proposals) {
      const k = ym(p.created);
      const row = m.get(k);
      if (!row) continue;
      row.count += 1;
      if (!isLost(p)) row.quoted += Number(p.total || 0);
      if (isWon(p)) row.won += Number(p.total || 0);
    }
    return keys.map((k) => ({ key: k, ...m.get(k)! }));
  }, [proposals]);

  const stats = useMemo(() => {
    const won = proposals.filter(isWon);
    const decided = proposals.filter((p) => isWon(p) || isLost(p));
    const decisionDays = proposals
      .filter((p) => p.clientDecidedAt)
      .map((p) => (new Date(p.clientDecidedAt!).getTime() - new Date(p.created).getTime()) / 86400_000)
      .filter((d) => d >= 0);
    const year = new Date().getFullYear();
    return {
      ticket: won.length ? won.reduce((s, p) => s + Number(p.total || 0), 0) / won.length : 0,
      conversion: decided.length ? Math.round((won.length / decided.length) * 100) : null,
      decisionDays: decisionDays.length ? Math.round(decisionDays.reduce((s, d) => s + d, 0) / decisionDays.length) : null,
      wonYear: won.filter((p) => new Date(p.created).getFullYear() === year).reduce((s, p) => s + Number(p.total || 0), 0),
      mrr: clients.filter((c) => c.status === "ativo" || c.status === "recorrente").reduce((s, c) => s + (c.monthlyValue ?? 0), 0),
    };
  }, [proposals, clients]);

  const top = useMemo(() => {
    const byClient = new Map<string, number>();
    for (const p of proposals) if (isWon(p) && p.clientId) byClient.set(p.clientId, (byClient.get(p.clientId) ?? 0) + Number(p.total || 0));
    return [...byClient.entries()]
      .map(([id, v]) => {
        const c = clients.find((x) => x.id === id);
        return { key: id, label: c?.name ?? "Cliente removido", value: v + (c?.monthlyValue ?? 0) * 12, sub: c?.monthlyValue ? "+ recorrência/ano" : "" };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [proposals, clients]);

  const W = 640;
  const H = 200;
  const pad = { l: 56, r: 8, t: 10, b: 24 };
  const max = Math.max(1, ...months.flatMap((m) => [m.quoted, m.won]));
  const step = (W - pad.l - pad.r) / months.length;
  const bw = Math.min(14, (step - 8) / 2);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const bar = (x: number, v: number, fill: string, dim: boolean) => {
    const top = y(v);
    const h = Math.max(0, H - pad.b - top);
    const r = Math.min(4, h, bw / 2);
    return <path d={`M${x},${H - pad.b} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${H - pad.b} Z`} fill={fill} opacity={dim ? 0.35 : 1} />;
  };
  const h = hover != null ? months[hover] : null;

  return (
    <div className="res-root space-y-4">
      <style>{CSS}</style>
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-4">
        {[
          ["Ticket médio", stats.ticket ? money(stats.ticket) : "—", "por proposta aprovada"],
          ["Conversão", stats.conversion == null ? "—" : `${stats.conversion}%`, "aprovadas ÷ decididas"],
          ["Tempo de decisão", stats.decisionDays == null ? "—" : `${stats.decisionDays} dias`, "do envio à resposta do cliente"],
          ["Fechado no ano", money(stats.wonYear), stats.mrr ? `+ ${money(stats.mrr)}/mês recorrente` : "propostas aprovadas"],
        ].map(([k, v, hint]) => (
          <div key={k} className="border-line p-4 sm:p-5 [&:nth-child(n+3)]:border-t [&:nth-child(even)]:border-l lg:[&:nth-child(n+3)]:border-t-0 lg:[&:not(:first-child)]:border-l">
            <p className={labelClass}>{k}</p>
            <p className="mt-2 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl">{v}</p>
            <p className="mt-0.5 truncate text-xs text-faint">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
        <section className={`${cardClass} xl:col-span-2`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">Orçado × aprovado por mês</h2>
            <div className="flex gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: QUOTED }} /> Orçado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: WON }} /> Aprovado
              </span>
            </div>
          </div>
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Valor orçado e aprovado nos últimos 12 meses" onMouseLeave={() => setHover(null)}>
              {[0, 0.5, 1].map((f) => (
                <g key={f}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(f * max)} y2={y(f * max)} stroke="var(--adm-line)" />
                  <text x={pad.l - 8} y={y(f * max) + 3} textAnchor="end" className="fill-faint text-[10px] tabular-nums">
                    {new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(f * max)}
                  </text>
                </g>
              ))}
              {months.map((m, i) => {
                const x0 = pad.l + i * step + (step - bw * 2 - 2) / 2;
                const dim = hover != null && hover !== i;
                return (
                  <g key={m.key}>
                    {bar(x0, m.quoted, QUOTED, dim)}
                    {bar(x0 + bw + 2, m.won, WON, dim)}
                    <text x={pad.l + i * step + step / 2} y={H - 7} textAnchor="middle" className="fill-faint text-[10px]">
                      {monthShort(m.key)}
                    </text>
                    <rect x={pad.l + i * step} y={pad.t} width={step} height={H - pad.t} fill="transparent" onMouseEnter={() => setHover(i)} />
                  </g>
                );
              })}
            </svg>
            {h ? (
              <Tooltip leftPct={((pad.l + hover! * step + step / 2) / W) * 100} flip={hover! > 6}>
                <p className="font-semibold">
                  {(() => {
                    const t = new Date(`${h.key}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                    return t.charAt(0).toUpperCase() + t.slice(1);
                  })()}
                </p>
                <p className="mt-1 flex items-center gap-1.5 tabular-nums">
                  <span className="size-2 rounded-sm" style={{ background: QUOTED }} /> Orçado {money(h.quoted)}
                </p>
                <p className="flex items-center gap-1.5 tabular-nums">
                  <span className="size-2 rounded-sm" style={{ background: WON }} /> Aprovado {money(h.won)}
                </p>
                <p className="mt-1 text-faint">{h.count} {h.count === 1 ? "orçamento" : "orçamentos"}</p>
              </Tooltip>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-faint">Pela data de criação do orçamento. Recusados não entram no orçado.</p>
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-base font-semibold">Melhores clientes</h2>
          {top.length ? (
            <BarList color={WON} rows={top} onPick={onOpenClient} />
          ) : (
            <p className="text-sm text-muted">Quando uma proposta for aprovada, o cliente aparece aqui.</p>
          )}
        </section>
      </div>
    </div>
  );
}
