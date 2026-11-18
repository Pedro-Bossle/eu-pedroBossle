import { useMemo, useState, type ReactNode } from "react";
import type { FinAccount, FinAnalytics, FinOverview } from "../../../types/orcamentos";
import { cardClass, labelClass } from "../panelStyles";
import { BarList, CumulativeChart, Delta, Donut, Sparkline, WeekdayBars } from "./charts";
import { C_IN, C_OUT, CAT_OTHER, categoryColors, money } from "./theme";

const isCredit = (a: FinAccount) => a.type === "CREDIT";
const monthName = (ym: string, opts: Intl.DateTimeFormatOptions = { month: "long" }) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString("pt-BR", opts);
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const fmtDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

/** Último dia com dado: hoje no mês corrente, senão o mês todo. */
function lastDayOf(month: string, length: number) {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return cur === month ? now.getDate() : length;
}

function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${cardClass} ${className}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Skeleton({ h = "h-48" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-xl bg-sunken/70 motion-reduce:animate-none`} aria-hidden />;
}

// ---------- Visão geral ----------

export function Overview({
  data,
  analytics,
  month,
  monthly,
  onPickCategory,
}: {
  data: FinOverview;
  analytics: FinAnalytics | null;
  month: string;
  /** Gráfico de 13 meses (fica em Finance.tsx). */
  monthly: ReactNode;
  onPickCategory: (c: string) => void;
}) {
  const [hoverCat, setHoverCat] = useState("");
  const visible = data.accounts.filter((a) => !a.hidden);
  const cash = visible.filter((a) => !isCredit(a)).reduce((s, a) => s + a.balance, 0);
  const cards = visible.filter(isCredit).reduce((s, a) => s + a.balance, 0);
  const invested = data.investments.reduce((s, i) => s + i.balance, 0);

  const colorOf = useMemo(() => categoryColors(analytics?.categories ?? []), [analytics]);

  if (!analytics) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Skeleton h="h-56 xl:col-span-2" />
        <Skeleton h="h-56" />
        <Skeleton h="h-72 xl:col-span-2" />
        <Skeleton h="h-72" />
      </div>
    );
  }

  const a = analytics;
  const result = a.current.income - a.current.expense;
  const lastDay = lastDayOf(month, a.cumulative.current.length);
  const spentSoFar = a.cumulative.current[lastDay - 1] ?? a.current.expense;
  const prevSameDay = a.cumulative.previous[Math.min(lastDay, a.cumulative.previous.length) - 1] ?? 0;
  const isCurrent = lastDay < a.cumulative.current.length;
  const projected = isCurrent && lastDay > 3 ? (spentSoFar / lastDay) * a.cumulative.current.length : null;
  const curName = monthName(month);
  const prevName = monthName(a.previousMonth);

  // Rosca: 6 maiores com cor própria + "Outros"
  const spentCats = a.categories.filter((c) => c.spent > 0);
  const colored = spentCats.filter((c) => colorOf(c.category) !== CAT_OTHER).slice(0, 6);
  const otherTotal = spentCats.filter((c) => !colored.includes(c)).reduce((s, c) => s + c.spent, 0);
  const slices = [
    ...colored.map((c) => ({ key: c.category, label: c.category, value: c.spent, color: colorOf(c.category) })),
    ...(otherTotal > 0 ? [{ key: "__outros", label: "Outras categorias", value: otherTotal, color: CAT_OTHER }] : []),
  ];

  const insights = buildInsights(a, { lastDay, spentSoFar, prevSameDay, projected, curName, prevName, isCurrent });
  const recurringTotal = a.recurring.reduce((s, r) => s + r.avg, 0);

  return (
    <div className="space-y-4">
      {/* Resultado + patrimônio */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className={`${cardClass} xl:col-span-2`}>
          <p className={labelClass}>Resultado de {curName}</p>
          <p className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${result < 0 ? "text-danger" : ""}`}>
            {result >= 0 ? "+" : "−"}
            {money(Math.abs(result))}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <span className="size-2 rounded-full" style={{ background: C_IN }} /> Entradas
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{money(a.current.income)}</p>
              <Delta value={a.current.income} base={a.previous.income} invert={false} />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <span className="size-2 rounded-full" style={{ background: C_OUT }} /> Saídas
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{money(a.current.expense)}</p>
              <Delta value={spentSoFar} base={prevSameDay} />
              <span className="ml-1 text-[11px] text-faint">vs mesmo dia de {prevName}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm text-muted">Taxa de poupança</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {a.current.income > 0 ? `${Math.round((result / a.current.income) * 100)}%` : "—"}
              </p>
              <span className="text-[11px] text-faint">do que entrou, sobrou</span>
            </div>
          </div>
          {insights.length ? (
            <ul className="mt-6 space-y-2 border-t border-line pt-4">
              {insights.map((t) => (
                <li key={t.text} className="flex gap-2.5 text-sm">
                  <span
                    className={`mt-1.5 size-1.5 shrink-0 rounded-full ${t.tone === "bad" ? "bg-danger" : t.tone === "good" ? "bg-accent" : "bg-line-strong"}`}
                    aria-hidden
                  />
                  <span className="text-muted">{t.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className={cardClass}>
          <p className={labelClass}>Patrimônio líquido</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money(cash + invested - cards)}</p>
          <dl className="mt-5 space-y-3 text-sm">
            {[
              ["Saldo em contas", cash],
              ["Investimentos", invested],
              ["Faturas dos cartões", -cards],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="tabular-nums">{money(v as number)}</dd>
              </div>
            ))}
          </dl>
          {visible.some((x) => isCredit(x) && x.billDueDate) ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className={labelClass}>Próximas faturas</p>
              <ul className="mt-2 space-y-2 text-sm">
                {visible
                  .filter((x) => isCredit(x))
                  .map((x) => (
                    <li key={x.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {x.name}
                        {x.billDueDate ? <span className="ml-1 text-xs text-faint">vence {fmtDay(x.billDueDate)}</span> : null}
                      </span>
                      <span className="tabular-nums">{money(x.balance)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      {/* Ritmo de gasto + para onde foi */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
        <Section
          title="Ritmo de gasto"
          className="xl:col-span-2"
          aside={
            <div className="flex gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ background: C_OUT }} /> {cap(curName)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed" style={{ borderColor: CAT_OTHER }} /> {cap(prevName)}
              </span>
            </div>
          }
        >
          <CumulativeChart
            current={a.cumulative.current}
            previous={a.cumulative.previous}
            currentLabel={cap(curName)}
            previousLabel={cap(prevName)}
            lastDay={lastDay}
          />
          <p className="mt-2 text-xs text-faint">Gasto acumulado dia a dia. Passe o cursor para comparar os dois meses.</p>
        </Section>

        <Section title="Para onde foi o dinheiro">
          {slices.length ? (
            <>
              <Donut
                slices={slices}
                total={a.current.expense}
                centerLabel="Saídas"
                active={hoverCat}
                onHover={setHoverCat}
                onPick={(k) => k !== "__outros" && onPickCategory(k)}
              />
              <ul className="mt-4 space-y-1">
                {slices.map((s) => (
                  <li key={s.key}>
                    <button
                      type="button"
                      onMouseEnter={() => setHoverCat(s.key)}
                      onMouseLeave={() => setHoverCat("")}
                      onClick={() => s.key !== "__outros" && onPickCategory(s.key)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-sunken/60 ${hoverCat === s.key ? "bg-sunken/60" : ""}`}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1 truncate">{s.label}</span>
                      <span className="tabular-nums">{money(s.value)}</span>
                      <span className="w-9 text-right text-xs tabular-nums text-faint">
                        {Math.round((s.value / Math.max(1, a.current.expense)) * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted">Sem gastos neste mês.</p>
          )}
        </Section>
      </div>

      {/* Estabelecimentos + recorrências */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Onde você mais gastou">
          {a.merchants.length ? (
            <BarList
              color={C_OUT}
              rows={a.merchants.slice(0, 8).map((m) => ({
                key: m.label,
                label: m.label,
                value: m.spent,
                sub: `${m.count} ${m.count === 1 ? "compra" : "compras"}`,
                color: colorOf(m.category),
              }))}
            />
          ) : (
            <p className="text-sm text-muted">Nada por aqui ainda.</p>
          )}
        </Section>

        <Section
          title="Gastos recorrentes"
          aside={a.recurring.length ? <span className="text-sm tabular-nums text-muted">~{money(recurringTotal)}/mês</span> : null}
        >
          {a.recurring.length ? (
            <ul className="divide-y divide-line">
              {a.recurring.slice(0, 8).map((r) => (
                <li key={r.label} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(r.category) }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{r.label}</p>
                    <p className="text-xs text-faint">
                      {r.category} · {r.months} dos últimos 4 meses · último em {fmtDay(r.lastDay)}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">{money(r.avg)}</span>
                  {!r.inMonth ? <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] text-muted">ainda não veio</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Assinaturas e contas fixas aparecem aqui quando o mesmo gasto se repete em 3 dos últimos 4 meses.
            </p>
          )}
        </Section>
      </div>

      {/* 13 meses + dia da semana e entradas */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:items-start">
        <Section title="Entradas e saídas nos últimos 13 meses" className="xl:col-span-2">
          {monthly}
        </Section>
        <div className="grid grid-cols-1 gap-4">
          <Section title="Gasto médio por dia da semana">
            <WeekdayBars values={a.weekday} />
            <p className="mt-3 text-xs text-faint">Média dos últimos 4 meses, por dia.</p>
          </Section>
          <Section title="De onde veio o dinheiro">
            {a.income.length ? (
              <BarList color={C_IN} rows={a.income.slice(0, 5).map((i) => ({ key: i.category, label: i.category, value: i.value }))} />
            ) : (
              <p className="text-sm text-muted">Nenhuma entrada neste mês.</p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

type Insight = { text: string; tone: "good" | "bad" | "neutral" };

function buildInsights(
  a: FinAnalytics,
  ctx: { lastDay: number; spentSoFar: number; prevSameDay: number; projected: number | null; curName: string; prevName: string; isCurrent: boolean },
): Insight[] {
  const out: Insight[] = [];
  if (ctx.prevSameDay > 0) {
    const diff = ctx.spentSoFar - ctx.prevSameDay;
    const pct = Math.round(Math.abs(diff / ctx.prevSameDay) * 100);
    if (pct >= 3) {
      out.push({
        text: `${ctx.isCurrent ? `Até o dia ${ctx.lastDay}` : `Em ${ctx.curName}`} você gastou ${money(Math.abs(diff))} ${diff > 0 ? "a mais" : "a menos"} que ${ctx.isCurrent ? "no mesmo período de" : "em"} ${ctx.prevName} (${pct}%).`,
        tone: diff > 0 ? "bad" : "good",
      });
    }
  }
  if (ctx.projected) out.push({ text: `No ritmo atual, o mês fecha com cerca de ${money(ctx.projected)} em saídas.`, tone: "neutral" });

  const changes = a.categories
    .filter((c) => c.avg3 > 0 && Math.abs(c.spent - c.avg3) >= 50)
    .map((c) => ({ ...c, diff: c.spent - c.avg3 }));
  const up = [...changes].sort((x, y) => y.diff - x.diff)[0];
  if (up && up.diff > 0 && up.diff / up.avg3 >= 0.2) {
    out.push({ text: `${up.category} está ${money(up.diff)} acima da sua média dos últimos 3 meses.`, tone: "bad" });
  }
  const down = [...changes].sort((x, y) => x.diff - y.diff)[0];
  if (down && down.diff < 0 && -down.diff / down.avg3 >= 0.2 && !ctx.isCurrent) {
    out.push({ text: `${down.category} ficou ${money(-down.diff)} abaixo da média.`, tone: "good" });
  }
  const top = a.categories[0];
  if (top && top.spent > 0 && a.current.expense > 0) {
    out.push({
      text: `A maior categoria é ${top.category}, com ${Math.round((top.spent / a.current.expense) * 100)}% das saídas.`,
      tone: "neutral",
    });
  }
  return out.slice(0, 4);
}

// ---------- Categorias ----------

export function CategoriesView({
  analytics,
  budgets,
  onPickCategory,
}: {
  analytics: FinAnalytics | null;
  budgets: { category: string; limit: number }[];
  onPickCategory: (c: string) => void;
}) {
  const [sort, setSort] = useState<"valor" | "variacao">("valor");
  const colorOf = useMemo(() => categoryColors(analytics?.categories ?? []), [analytics]);
  if (!analytics) return <Skeleton h="h-96" />;
  const limits = new Map(budgets.map((b) => [b.category, b.limit]));
  const total = Math.max(1, analytics.current.expense);
  const rows = [...analytics.categories].sort((x, y) =>
    sort === "valor" ? y.spent - x.spent : Math.abs(y.spent - y.avg3) - Math.abs(x.spent - x.avg3),
  );
  const monthsLabel = `${monthName(analytics.months[0]!, { month: "short" })}–${monthName(analytics.months.at(-1)!, { month: "short" })}`;

  return (
    <section className={`${cardClass} p-0 xl:p-0`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h3 className="text-base font-semibold">Categorias de {monthName(analytics.month)}</h3>
          <p className="text-xs text-muted">Comparado ao mês anterior e à média dos 3 meses antes. Clique para ver as transações.</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-sunken/70 p-1 text-xs" role="group" aria-label="Ordenar categorias">
          {(
            [
              ["valor", "Maior gasto"],
              ["variacao", "Maior variação"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={sort === id}
              onClick={() => setSort(id)}
              className={`rounded-md px-2.5 py-1 ${sort === id ? "bg-surface font-medium text-ink shadow-sm" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 font-medium">Categoria</th>
              <th className="px-3 py-2.5 text-right font-medium">Este mês</th>
              <th className="px-3 py-2.5 text-right font-medium">% das saídas</th>
              <th className="px-3 py-2.5 text-right font-medium">vs anterior</th>
              <th className="px-3 py-2.5 text-right font-medium">vs média 3m</th>
              <th className="px-3 py-2.5 font-medium">{monthsLabel}</th>
              <th className="px-5 py-2.5 font-medium">Orçamento</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const color = colorOf(c.category);
              const limit = limits.get(c.category);
              const pct = limit ? c.spent / limit : 0;
              return (
                <tr
                  key={c.category}
                  onClick={() => onPickCategory(c.category)}
                  className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-sunken/40"
                >
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="font-medium">{c.category}</span>
                      <span className="text-xs text-faint">{c.count ? `${c.count}×` : ""}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{money(c.spent)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted">{Math.round((c.spent / total) * 100)}%</td>
                  <td className="px-3 py-3 text-right">
                    <Delta value={c.spent} base={c.previous} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Delta value={c.spent} base={c.avg3} />
                  </td>
                  <td className="px-3 py-1.5">
                    <Sparkline values={c.history} color={color === CAT_OTHER ? "var(--adm-muted)" : color} label={`${c.category}, últimos 6 meses`} />
                  </td>
                  <td className="px-5 py-3">
                    {limit ? (
                      <div className="w-32">
                        <div className="h-1.5 rounded-full bg-sunken">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, pct * 100)}%`, background: pct > 1 ? "var(--adm-danger)" : pct > 0.85 ? C_OUT : C_IN }}
                          />
                        </div>
                        <p className={`mt-1 text-[11px] tabular-nums ${pct > 1 ? "text-danger" : "text-faint"}`}>
                          {Math.round(pct * 100)}% de {money(limit)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-faint">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted">
                  Sem gastos nos últimos 6 meses.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
