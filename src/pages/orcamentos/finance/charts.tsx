import { useState, type ReactNode } from "react";

import { C_OUT, money, moneyShort } from "./theme";

// ---------- Rosca (parte do todo) ----------

export type DonutSlice = { key: string; label: string; value: number; color: string };

export function Donut({
  slices,
  total,
  centerLabel,
  onPick,
  active,
  onHover,
}: {
  slices: DonutSlice[];
  total: number;
  centerLabel: string;
  onPick?: (key: string) => void;
  active?: string;
  onHover?: (key: string) => void;
}) {
  const size = 220;
  const r = 88;
  const w = 26;
  const c = size / 2;
  const sum = slices.reduce((s, x) => s + x.value, 0) || 1;
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((t, x) => t + x.value, 0));
  const arcs = slices.map((s, i) => {
    const a0 = -Math.PI / 2 + (starts[i]! / sum) * Math.PI * 2;
    const a1 = a0 + (s.value / sum) * Math.PI * 2;
    return { ...s, a0, a1 };
  });
  const arc = (a0: number, a1: number, rad: number) => {
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = c + rad * Math.cos(a0);
    const y0 = c + rad * Math.sin(a0);
    const x1 = c + rad * Math.cos(a1);
    const y1 = c + rad * Math.sin(a1);
    return `M${x0},${y0} A${rad},${rad} 0 ${large} 1 ${x1},${y1}`;
  };
  const focus = arcs.find((a) => a.key === active);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[220px]" role="img" aria-label={`${centerLabel}: ${money(total)}`}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--adm-sunken)" strokeWidth={w} />
      {arcs.map((a) =>
        a.a1 - a.a0 > 0.001 ? (
          <path
            key={a.key}
            d={a.a1 - a.a0 >= Math.PI * 2 - 0.001 ? arc(a.a0, a.a1 - 0.0001, r) : arc(a.a0, a.a1, r)}
            fill="none"
            stroke={a.color}
            strokeWidth={a.key === active ? w + 6 : w}
            opacity={active && a.key !== active ? 0.35 : 1}
            className="cursor-pointer transition-[opacity,stroke-width]"
            onMouseEnter={() => onHover?.(a.key)}
            onMouseLeave={() => onHover?.("")}
            onClick={() => onPick?.(a.key)}
          >
            <title>{`${a.label}: ${money(a.value)} (${Math.round((a.value / sum) * 100)}%)`}</title>
          </path>
        ) : null,
      )}
      {/* 2px de respiro entre fatias */}
      {arcs.length > 1
        ? arcs.map((a) => (
            <line
              key={`gap-${a.key}`}
              x1={c + (r - w / 2 - 4) * Math.cos(a.a0)}
              y1={c + (r - w / 2 - 4) * Math.sin(a.a0)}
              x2={c + (r + w / 2 + 4) * Math.cos(a.a0)}
              y2={c + (r + w / 2 + 4) * Math.sin(a.a0)}
              stroke="var(--adm-surface)"
              strokeWidth={2}
              pointerEvents="none"
            />
          ))
        : null}
      <text x={c} y={c - 8} textAnchor="middle" className="fill-muted text-[11px]">
        {focus ? focus.label : centerLabel}
      </text>
      <text x={c} y={c + 14} textAnchor="middle" className="fill-ink text-[17px] font-semibold tabular-nums">
        {money(focus ? focus.value : total)}
      </text>
      {focus ? (
        <text x={c} y={c + 32} textAnchor="middle" className="fill-faint text-[11px] tabular-nums">
          {Math.round((focus.value / sum) * 100)}% do total
        </text>
      ) : null}
    </svg>
  );
}

// ---------- Linha acumulada (mês × anterior) ----------

export function CumulativeChart({
  current,
  previous,
  currentLabel,
  previousLabel,
  lastDay,
}: {
  current: number[];
  previous: number[];
  currentLabel: string;
  previousLabel: string;
  /** Último dia com dado no mês atual (hoje, se for o mês corrente). */
  lastDay: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const pad = { l: 66, r: 12, t: 12, b: 26 };
  const days = Math.max(current.length, previous.length, 28);
  const cur = current.slice(0, lastDay);
  const max = Math.max(1, ...cur, ...previous) * 1.08;
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (days - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((f) => (f * max) / 1.08);
  const h = hover ?? null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Gasto acumulado: ${currentLabel} ${money(cur.at(-1) ?? 0)}, ${previousLabel} ${money(previous.at(-1) ?? 0)}`}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days - 1));
          setHover(Math.max(0, Math.min(days - 1, i)));
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--fin-grid)" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" className="fill-faint text-[10px] tabular-nums">
              {moneyShort(t)}
            </text>
          </g>
        ))}
        {[1, 10, 20, days].map((d) => (
          <text key={d} x={x(d - 1)} y={H - 8} textAnchor="middle" className="fill-faint text-[10px] tabular-nums">
            {d}
          </text>
        ))}
        <path d={path(previous)} fill="none" stroke="var(--cat-other)" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
        <path d={`${path(cur)} L${x(cur.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={C_OUT} opacity={0.08} />
        <path d={path(cur)} fill="none" stroke={C_OUT} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {cur.length ? <circle cx={x(cur.length - 1)} cy={y(cur.at(-1)!)} r={4.5} fill={C_OUT} stroke="var(--adm-surface)" strokeWidth={2} /> : null}
        {h != null ? (
          <g pointerEvents="none">
            <line x1={x(h)} x2={x(h)} y1={pad.t} y2={H - pad.b} stroke="var(--adm-line-strong)" />
            {h < cur.length ? <circle cx={x(h)} cy={y(cur[h]!)} r={4} fill={C_OUT} stroke="var(--adm-surface)" strokeWidth={2} /> : null}
            {h < previous.length ? <circle cx={x(h)} cy={y(previous[h]!)} r={4} fill="var(--cat-other)" stroke="var(--adm-surface)" strokeWidth={2} /> : null}
          </g>
        ) : null}
      </svg>
      {h != null ? (
        <Tooltip leftPct={(x(h) / W) * 100} flip={h > days / 2}>
          <p className="font-semibold">Dia {h + 1}</p>
          <p className="mt-1 flex items-center gap-1.5 tabular-nums">
            <span className="h-0.5 w-3 rounded" style={{ background: C_OUT }} /> {currentLabel}: {h < cur.length ? money(cur[h]!) : "—"}
          </p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <span className="h-0.5 w-3 rounded border-t-2 border-dashed" style={{ borderColor: "var(--cat-other)" }} /> {previousLabel}:{" "}
            {h < previous.length ? money(previous[h]!) : "—"}
          </p>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function Tooltip({ leftPct, flip, children }: { leftPct: number; flip?: boolean; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-float"
      style={{ left: `${leftPct}%`, transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
    >
      {children}
    </div>
  );
}

// ---------- Minigráfico (6 meses) ----------

export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const W = 96;
  const H = 28;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [2 + ((W - 4) * i) / Math.max(1, values.length - 1), H - 3 - (H - 6) * (v / max)] as const);
  const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const last = pts.at(-1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-24" role="img" aria-label={label}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {last ? <circle cx={last[0]} cy={last[1]} r={2.75} fill={color} /> : null}
    </svg>
  );
}

// ---------- Barras horizontais com rótulo ----------

export function BarList({
  rows,
  color,
  onPick,
}: {
  rows: { key: string; label: string; value: number; sub?: string; color?: string }[];
  color: string;
  onPick?: (key: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{money(r.value)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-sunken">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.color ?? color }} />
              </div>
              {r.sub ? <span className="w-20 shrink-0 text-right text-[11px] text-faint">{r.sub}</span> : null}
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {onPick ? (
              <button type="button" className="block w-full rounded-lg text-left hover:bg-sunken/40" onClick={() => onPick(r.key)}>
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Dia da semana ----------

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WeekdayBars({ values }: { values: number[] }) {
  // Segunda primeiro
  const order = [1, 2, 3, 4, 5, 6, 0];
  const max = Math.max(1, ...values);
  const top = values.indexOf(Math.max(...values));
  const [hover, setHover] = useState<number | null>(null);
  const items = order.map((i) => ({ i, v: values[i] ?? 0 }));
  return (
    <div className="flex h-36 items-end gap-2" role="img" aria-label={`Gasto médio por dia da semana; maior: ${WEEKDAYS[top]}`}>
      {items.map(({ i, v }) => (
        <div
          key={i}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          <span className={`text-[10px] tabular-nums ${hover === i || i === top ? "text-ink" : "text-transparent"}`}>{moneyShort(v)}</span>
          <div
            className="w-full max-w-9 rounded-t-[4px] transition-opacity"
            style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: C_OUT, opacity: hover == null || hover === i ? 1 : 0.4 }}
          />
          <span className={`text-[11px] ${i === top ? "font-semibold text-ink" : "text-muted"}`}>{WEEKDAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Variação ----------

/** Variação em relação a uma base. Para gastos, subir é ruim (tom de alerta). */
export function Delta({ value, base, invert = true, className = "" }: { value: number; base: number; invert?: boolean; className?: string }) {
  if (!base) return <span className={`text-xs text-faint ${className}`}>sem base</span>;
  const pct = ((value - base) / base) * 100;
  if (Math.abs(pct) < 1) return <span className={`text-xs text-faint ${className}`}>estável</span>;
  const up = pct > 0;
  const bad = invert ? up : !up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${bad ? "text-danger" : "text-accent-text"} ${className}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(pct) >= 999 ? "+999" : Math.round(Math.abs(pct))}%<span className="sr-only">{up ? " a mais" : " a menos"}</span>
    </span>
  );
}
