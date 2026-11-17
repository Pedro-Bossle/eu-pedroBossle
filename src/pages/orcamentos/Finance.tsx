import { useCallback, useEffect, useMemo, useState } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type { FinAccount, FinMonth, FinOverview, FinTransaction } from "../../types/orcamentos";
import { btn, btnPrimary, cardClass, focusRing } from "./panelStyles";

type Props = { showToast: (msg: string) => void };
type View = "visao" | "transacoes" | "orcamentos" | "contas";

const VIEWS: { id: View; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "transacoes", label: "Transações" },
  { id: "orcamentos", label: "Orçamentos e regras" },
  { id: "contas", label: "Contas" },
];

const control = `border border-neutral-200 bg-[#f9f9f9] outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400 ${focusRing}`;
const inputClass = `${control} w-full min-h-11 px-3 py-2 text-base sm:text-sm`;
const btnSm = `inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium transition-[border-color,opacity] hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`;
const smallLabel = "text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400";

// Paleta validada (dataviz): entradas / saídas, claro e escuro
const C_IN = "var(--fin-in)";
const C_OUT = "var(--fin-out)";
const paletteStyle = `
.fin-root{--fin-in:#059669;--fin-out:#d97706;--fin-grid:#e5e5e5;--fin-surface:#fff}
.dark .fin-root{--fin-in:#0ea371;--fin-out:#d27a06;--fin-grid:#2a2a2a;--fin-surface:#151515}
`;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlShort = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const money = (n: number) => brl.format(n);
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (k: string, style: "long" | "short" = "long") => {
  const [y, m] = k.split("-").map(Number);
  const label = new Date(y!, m! - 1, 1).toLocaleDateString("pt-BR", style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
  return style === "long" ? label.charAt(0).toUpperCase() + label.slice(1) : label;
};
const shiftMonth = (k: string, n: number) => {
  const [y, m] = k.split("-").map(Number);
  return monthKey(new Date(y!, m! - 1 + n, 1));
};
const fmtDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "");
const relTime = (iso: string | null) => {
  if (!iso) return "nunca";
  const h = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (h < 1) return "agora há pouco";
  if (h < 48) return `há ${Math.round(h)} h`;
  return `há ${Math.round(h / 24)} dias`;
};

const isCredit = (a: FinAccount) => a.type === "CREDIT";

export default function Finance({ showToast }: Props) {
  const [view, setView] = useState<View>("visao");
  const [data, setData] = useState<FinOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [month, setMonth] = useState(monthKey());
  const [txs, setTxs] = useState<FinTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await orcamentosApi.finOverview());
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar finanças");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadTxs = useCallback(async () => {
    setTxLoading(true);
    try {
      const r = await orcamentosApi.finTransactions({ month });
      setTxs(r.transactions);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro nas transações");
    } finally {
      setTxLoading(false);
    }
  }, [month, showToast]);

  // Busca ao abrir / trocar de mês (o setState acontece depois do fetch)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTxs();
  }, [loadTxs]);

  const sync = async (refresh = false) => {
    setSyncing(true);
    try {
      const { results } = await orcamentosApi.finSync({ refresh });
      const failed = results.filter((r) => r.error);
      const total = results.reduce((s, r) => s + r.transactions, 0);
      showToast(failed.length ? `Erro em ${failed.length} conexão(ões): ${failed[0]!.error}` : `${total} transações sincronizadas`);
      await Promise.all([load(), loadTxs()]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const patchTx = async (t: FinTransaction, patch: { category?: string; ignored?: boolean; notes?: string }) => {
    setTxs((list) => list.map((x) => (x.id === t.id ? { ...x, ...patch, categoryManual: true } : x)));
    try {
      const r = await orcamentosApi.finPatchTx(t.id, patch);
      setTxs((list) => list.map((x) => (x.id === t.id ? r.transaction : x)));
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
      loadTxs();
    }
  };

  if (loading) return <p className="text-sm text-neutral-500">Carregando finanças…</p>;
  if (!data) return null;

  const hasData = data.accounts.length > 0;

  return (
    <section className="fin-root space-y-6" aria-labelledby="fin-title">
      <style>{paletteStyle}</style>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={smallLabel}>Pessoal</p>
          <h2 id="fin-title" className="mt-1 text-2xl font-semibold tracking-tight">
            Finanças
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Última sincronização: {relTime(data.items.map((i) => i.syncedAt).filter(Boolean).sort().pop() ?? null)}
          </p>
        </div>
        {data.configured && data.items.length ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btn} disabled={syncing} onClick={() => sync(true)} title="Pede dados novos ao banco antes de puxar">
              Atualizar no banco
            </button>
            <button type="button" className={btnPrimary} disabled={syncing} onClick={() => sync(false)}>
              {syncing ? "Sincronizando…" : "Sincronizar"}
            </button>
          </div>
        ) : null}
      </header>

      {!data.configured ? (
        <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Defina <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> nas variáveis da Vercel para conectar seus bancos.
        </div>
      ) : !data.items.length ? (
        <div className="border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-200">
          Nenhum banco conectado ainda.{" "}
          <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setView("contas")}>
            Adicione o Item ID do Meu Pluggy
          </button>
          .
        </div>
      ) : null}

      <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800" aria-label="Seções de finanças">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-current={view === v.id ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm ${focusRing} ${
              view === v.id ? "border-neutral-900 font-medium dark:border-white" : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {view !== "contas" && hasData ? <MonthPicker month={month} onChange={setMonth} /> : null}

      {view === "visao" ? (
        hasData ? (
          <Overview
            data={data}
            month={month}
            txs={txs}
            loading={txLoading}
            onPickMonth={setMonth}
            onPickCategory={(c) => {
              setCategoryFilter(c);
              setView("transacoes");
            }}
          />
        ) : (
          <EmptyState onGo={() => setView("contas")} />
        )
      ) : null}

      {view === "transacoes" ? (
        <Transactions
          data={data}
          txs={txs}
          loading={txLoading}
          category={categoryFilter}
          setCategory={setCategoryFilter}
          onPatch={patchTx}
          showToast={showToast}
          onRuleCreated={() => Promise.all([load(), loadTxs()])}
        />
      ) : null}

      {view === "orcamentos" ? <Budgets data={data} txs={txs} month={month} showToast={showToast} onChanged={() => Promise.all([load(), loadTxs()])} /> : null}

      {view === "contas" ? <Accounts data={data} showToast={showToast} onChanged={() => Promise.all([load(), loadTxs()])} /> : null}
    </section>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className={`${cardClass} text-center`}>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Conecte um banco para ver saldo, gastos por categoria e evolução mensal.</p>
      <button type="button" className={`${btnPrimary} mt-4`} onClick={onGo}>
        Conectar banco
      </button>
    </div>
  );
}

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month === monthKey();
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btnSm} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mês anterior">
        ←
      </button>
      <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
      <button type="button" className={btnSm} disabled={isCurrent} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Próximo mês">
        →
      </button>
      {!isCurrent ? (
        <button type="button" className={btnSm} onClick={() => onChange(monthKey())}>
          Mês atual
        </button>
      ) : null}
    </div>
  );
}

// ---------- Visão geral ----------

function useMonthStats(txs: FinTransaction[], accounts: FinAccount[]) {
  return useMemo(() => {
    const hidden = new Set(accounts.filter((a) => a.hidden).map((a) => a.id));
    const valid = txs.filter((t) => !t.ignored && !hidden.has(t.accountId));
    const income = valid.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expense = -valid.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const byCat = new Map<string, number>();
    for (const t of valid) if (t.amount < 0) byCat.set(t.category || "Outros", (byCat.get(t.category || "Outros") ?? 0) - t.amount);
    const categories = [...byCat.entries()].map(([category, spent]) => ({ category, spent })).sort((a, b) => b.spent - a.spent);
    const biggest = valid.filter((t) => t.amount < 0).sort((a, b) => a.amount - b.amount).slice(0, 6);
    return { income, expense, categories, biggest, count: valid.length };
  }, [txs, accounts]);
}

function Overview({
  data,
  month,
  txs,
  loading,
  onPickMonth,
  onPickCategory,
}: {
  data: FinOverview;
  month: string;
  txs: FinTransaction[];
  loading: boolean;
  onPickMonth: (m: string) => void;
  onPickCategory: (c: string) => void;
}) {
  const visible = data.accounts.filter((a) => !a.hidden);
  const cash = visible.filter((a) => !isCredit(a)).reduce((s, a) => s + a.balance, 0);
  const cards = visible.filter(isCredit).reduce((s, a) => s + a.balance, 0);
  const invested = data.investments.reduce((s, i) => s + i.balance, 0);
  const stats = useMonthStats(txs, data.accounts);
  const budgets = new Map(data.budgets.map((b) => [b.category, b.limit]));
  const result = stats.income - stats.expense;
  const maxCat = Math.max(1, ...stats.categories.map((c) => Math.max(c.spent, budgets.get(c.category) ?? 0)));
  const accName = new Map(data.accounts.map((a) => [a.id, a.name]));

  // Mês corrente: ritmo de gasto projetado
  const isCurrent = month === monthKey();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = isCurrent && now.getDate() > 3 ? (stats.expense / now.getDate()) * daysInMonth : null;

  const tiles = [
    { label: "Saldo em contas", value: money(cash) },
    { label: "Faturas dos cartões", value: money(cards), hint: data.accounts.filter(isCredit).length ? "valor atual das faturas" : "nenhum cartão" },
    { label: "Investimentos", value: money(invested), hint: `${data.investments.length} aplicações` },
    { label: "Patrimônio líquido", value: money(cash + invested - cards) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={cardClass}>
            <p className={smallLabel}>{t.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{t.value}</p>
            {t.hint ? <p className="mt-1 text-xs text-neutral-500">{t.hint}</p> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className={cardClass}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">Entradas e saídas por mês</h3>
            <Legend />
          </div>
          <MonthlyChart months={data.months} selected={month} onPick={onPickMonth} />
        </div>

        <div className={cardClass}>
          <h3 className="text-base font-semibold">{monthLabel(month)}</h3>
          <dl className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <dt className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-sm" style={{ background: C_IN }} /> Entradas
              </dt>
              <dd className="text-lg font-semibold tabular-nums">{money(stats.income)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-sm" style={{ background: C_OUT }} /> Saídas
              </dt>
              <dd className="text-lg font-semibold tabular-nums">{money(stats.expense)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <dt className="text-sm font-medium">Resultado</dt>
              <dd className={`text-xl font-semibold tabular-nums ${result < 0 ? "text-red-700 dark:text-red-400" : ""}`}>
                {result >= 0 ? "+" : "−"}
                {money(Math.abs(result))}
              </dd>
            </div>
            {stats.income > 0 ? (
              <p className="text-xs text-neutral-500">
                Taxa de poupança: {Math.round((result / stats.income) * 100)}% da renda
              </p>
            ) : null}
            {projected ? (
              <p className="text-xs text-neutral-500">No ritmo atual, o mês fecha com ~{money(projected)} em saídas.</p>
            ) : null}
          </dl>
          {data.accounts.some((a) => isCredit(a) && a.billDueDate) ? (
            <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <p className={smallLabel}>Faturas</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {data.accounts
                  .filter((a) => isCredit(a) && !a.hidden)
                  .map((a) => (
                    <li key={a.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {a.name} {a.billDueDate ? <span className="text-xs text-neutral-500">vence {fmtDay(a.billDueDate)}</span> : null}
                      </span>
                      <span className="tabular-nums">{money(a.balance)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className={cardClass}>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-semibold">Gastos por categoria</h3>
            {loading ? <span className="text-xs text-neutral-500">carregando…</span> : null}
          </div>
          {!stats.categories.length ? <p className="mt-4 text-sm text-neutral-500">Sem gastos neste mês.</p> : null}
          <ul className="mt-4 space-y-3">
            {stats.categories.map((c) => {
              const limit = budgets.get(c.category);
              const over = limit != null && c.spent > limit;
              return (
                <li key={c.category}>
                  <button type="button" onClick={() => onPickCategory(c.category)} className={`group block w-full text-left ${focusRing}`} title="Ver transações">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate group-hover:underline">{c.category}</span>
                      <span className="shrink-0 tabular-nums">
                        {money(c.spent)}
                        {limit != null ? <span className="text-xs text-neutral-500"> / {money(limit)}</span> : null}
                        <span className="ml-2 text-xs text-neutral-500">{Math.round((c.spent / Math.max(1, stats.expense)) * 100)}%</span>
                      </span>
                    </div>
                    <div className="relative mt-1.5 h-2 bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-r-[4px]"
                        style={{ width: `${(c.spent / maxCat) * 100}%`, background: over ? "#dc2626" : C_OUT }}
                      />
                      {limit != null ? (
                        <span className="absolute -top-1 h-4 w-0.5 bg-neutral-900 dark:bg-white" style={{ left: `${Math.min(100, (limit / maxCat) * 100)}%` }} aria-hidden />
                      ) : null}
                    </div>
                    {over ? <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">⚠ Passou {money(c.spent - limit!)} do orçamento</p> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={cardClass}>
          <h3 className="text-base font-semibold">Maiores gastos do mês</h3>
          <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {stats.biggest.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{t.merchant || t.description}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {fmtDay(t.date)} · {t.category} · {accName.get(t.accountId)}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">{money(-t.amount)}</span>
              </li>
            ))}
            {!stats.biggest.length ? <li className="py-2 text-sm text-neutral-500">Nada ainda.</li> : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-neutral-600 dark:text-neutral-300">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: C_IN }} /> Entradas
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: C_OUT }} /> Saídas
      </span>
    </div>
  );
}

/** Barras agrupadas (entrada × saída), 13 meses. Hover mostra os valores; há visão em tabela. */
function MonthlyChart({ months, selected, onPick }: { months: FinMonth[]; selected: string; onPick: (m: string) => void }) {
  const [hover, setHover] = useState<string>("");
  const [asTable, setAsTable] = useState(false);
  const series = useMemo(() => {
    const map = new Map(months.map((m) => [m.month, m]));
    const out: FinMonth[] = [];
    for (let i = 12; i >= 0; i -= 1) {
      const k = shiftMonth(monthKey(), -i);
      out.push(map.get(k) ?? { month: k, income: 0, expense: 0 });
    }
    return out;
  }, [months]);

  const W = 640;
  const H = 220;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const max = Math.max(1, ...series.flatMap((m) => [m.income, m.expense]));
  const step = (W - pad.l - pad.r) / series.length;
  const barW = Math.min(14, (step - 6) / 2);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const hovered = series.find((m) => m.month === hover);

  if (asTable) {
    return (
      <div className="mt-4">
        <button type="button" className={btnSm} onClick={() => setAsTable(false)}>
          Ver gráfico
        </button>
        <table className="mt-3 w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Entradas</th>
              <th className="py-1 text-right font-medium">Saídas</th>
              <th className="py-1 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((m) => (
              <tr key={m.month} className="border-t border-neutral-100 dark:border-neutral-800">
                <td className="py-1.5">{monthLabel(m.month)}</td>
                <td className="py-1.5 text-right">{money(m.income)}</td>
                <td className="py-1.5 text-right">{money(m.expense)}</td>
                <td className="py-1.5 text-right">{money(m.income - m.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Entradas e saídas dos últimos 13 meses">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--fin-grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-neutral-500 text-[10px]">
              {brlShort.format(t)}
            </text>
          </g>
        ))}
        {series.map((m, i) => {
          const x0 = pad.l + i * step + (step - barW * 2 - 2) / 2;
          const sel = m.month === selected;
          const dim = hover && hover !== m.month;
          const bar = (v: number, x: number, fill: string) => {
            const top = y(v);
            const h = Math.max(0, H - pad.b - top);
            const r = Math.min(4, h, barW / 2);
            // topo arredondado (4px), base reta no eixo
            return (
              <path
                d={`M${x},${H - pad.b} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - pad.b} Z`}
                fill={fill}
                opacity={dim ? 0.35 : 1}
              />
            );
          };
          return (
            <g key={m.month}>
              {sel ? <rect x={pad.l + i * step} y={pad.t} width={step} height={H - pad.t - pad.b} className="fill-neutral-100 dark:fill-neutral-800/60" /> : null}
              {bar(m.income, x0, C_IN)}
              {bar(m.expense, x0 + barW + 2, C_OUT)}
              <text x={pad.l + i * step + step / 2} y={H - 8} textAnchor="middle" className={`text-[10px] ${sel ? "fill-neutral-900 font-semibold dark:fill-white" : "fill-neutral-500"}`}>
                {monthLabel(m.month, "short").replace(".", "")}
              </text>
              {/* área de hover maior que a barra */}
              <rect
                x={pad.l + i * step}
                y={pad.t}
                width={step}
                height={H - pad.t}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHover(m.month)}
                onMouseLeave={() => setHover("")}
                onClick={() => onPick(m.month)}
              />
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="currentColor" className="text-neutral-300 dark:text-neutral-700" />
      </svg>
      {hovered ? (
        <div
          className="pointer-events-none absolute top-0 z-10 border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-neutral-700 dark:bg-[#1c1c1c]"
          style={{
            left: `${((pad.l + series.indexOf(hovered) * step + step / 2) / W) * 100}%`,
            transform: series.indexOf(hovered) > series.length / 2 ? "translateX(-105%)" : "translateX(5%)",
          }}
        >
          <p className="font-semibold">{monthLabel(hovered.month)}</p>
          <p className="mt-1 flex items-center gap-1.5 tabular-nums">
            <span className="size-2 rounded-sm" style={{ background: C_IN }} /> {money(hovered.income)}
          </p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <span className="size-2 rounded-sm" style={{ background: C_OUT }} /> {money(hovered.expense)}
          </p>
          <p className="mt-1 border-t border-neutral-200 pt-1 tabular-nums dark:border-neutral-700">Resultado {money(hovered.income - hovered.expense)}</p>
        </div>
      ) : null}
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>Clique num mês para ver os detalhes.</span>
        <button type="button" className="underline underline-offset-4" onClick={() => setAsTable(true)}>
          Ver como tabela
        </button>
      </div>
    </div>
  );
}

// ---------- Transações ----------

function Transactions({
  data,
  txs,
  loading,
  category,
  setCategory,
  onPatch,
  showToast,
  onRuleCreated,
}: {
  data: FinOverview;
  txs: FinTransaction[];
  loading: boolean;
  category: string;
  setCategory: (c: string) => void;
  onPatch: (t: FinTransaction, patch: { category?: string; ignored?: boolean; notes?: string }) => void;
  showToast: (m: string) => void;
  onRuleCreated: () => Promise<unknown>;
}) {
  const [q, setQ] = useState("");
  const [account, setAccount] = useState("");
  const [kind, setKind] = useState<"todas" | "saidas" | "entradas">("todas");
  const [showIgnored, setShowIgnored] = useState(false);
  const [searchAll, setSearchAll] = useState<FinTransaction[] | null>(null);
  const [rule, setRule] = useState<{ pattern: string; category: string; ignore: boolean } | null>(null);
  const accName = new Map(data.accounts.map((a) => [a.id, a.name]));

  const source = searchAll ?? txs;
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return source.filter(
      (t) =>
        (showIgnored || !t.ignored) &&
        (!account || t.accountId === account) &&
        (!category || t.category === category) &&
        (kind === "todas" || (kind === "saidas" ? t.amount < 0 : t.amount > 0)) &&
        (!needle || `${t.description} ${t.merchant} ${t.notes}`.toLowerCase().includes(needle)),
    );
  }, [source, q, account, category, kind, showIgnored]);
  const total = list.filter((t) => !t.ignored).reduce((s, t) => s + t.amount, 0);

  const searchEverywhere = async () => {
    if (q.trim().length < 2) return;
    try {
      const r = await orcamentosApi.finTransactions({ q: q.trim() });
      setSearchAll(r.transactions);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na busca");
    }
  };

  const saveRule = async () => {
    if (!rule) return;
    try {
      const r = await orcamentosApi.finAddRule({ ...rule, apply: true });
      showToast(`Regra criada · ${r.applied} transações ajustadas`);
      setRule(null);
      await onRuleCreated();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na regra");
    }
  };

  return (
    <div className="space-y-4">
      <datalist id="fin-categories">
        {data.categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Buscar descrição…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!e.target.value) setSearchAll(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && searchEverywhere()}
          />
          <button type="button" className={btn} onClick={searchEverywhere} title="Busca nos últimos 2 anos" disabled={q.trim().length < 2}>
            Todos os meses
          </button>
        </div>
        <select className={inputClass} value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Conta">
          <option value="">Todas as contas</option>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {data.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className={inputClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Tipo">
          <option value="todas">Entradas e saídas</option>
          <option value="saidas">Só saídas</option>
          <option value="entradas">Só entradas</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showIgnored} onChange={(e) => setShowIgnored(e.target.checked)} />
          Mostrar ignoradas
        </label>
        {searchAll ? (
          <button type="button" className={btnSm} onClick={() => setSearchAll(null)}>
            Voltar ao mês
          </button>
        ) : null}
        <span className="ml-auto text-neutral-500">
          {list.length} transações · saldo <strong className="tabular-nums text-neutral-900 dark:text-white">{money(total)}</strong>
          {loading ? " · carregando…" : ""}
        </span>
      </div>

      {rule ? (
        <div className={`${cardClass} space-y-3`}>
          <p className="text-sm font-medium">Nova regra: quando a descrição contiver…</p>
          <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto_auto] sm:items-center">
            <input className={inputClass} value={rule.pattern} onChange={(e) => setRule({ ...rule, pattern: e.target.value })} />
            <input className={inputClass} list="fin-categories" placeholder="Categoria" value={rule.category} onChange={(e) => setRule({ ...rule, category: e.target.value })} />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={rule.ignore} onChange={(e) => setRule({ ...rule, ignore: e.target.checked })} />
              Ignorar nos totais
            </label>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} onClick={saveRule}>
                Criar
              </button>
              <button type="button" className={btn} onClick={() => setRule(null)}>
                Cancelar
              </button>
            </div>
          </div>
          <p className="text-xs text-neutral-500">Aplica nas transações já existentes (exceto as editadas à mão) e nas próximas.</p>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500 dark:bg-white/[0.03]">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-3 py-2 font-medium">Descrição</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 text-right font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className={`border-t border-neutral-100 align-top dark:border-neutral-800 ${t.ignored ? "opacity-50" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-neutral-500">
                  {fmtDay(t.date)}
                  {t.status === "PENDING" ? <span className="block text-[10px] uppercase">pendente</span> : null}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium">{t.merchant || t.description}</p>
                  <p className="text-xs text-neutral-500">
                    {t.merchant && t.merchant !== t.description ? `${t.description} · ` : ""}
                    {accName.get(t.accountId)}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <input
                    className={`${control} min-h-9 w-40 px-2 py-1 text-sm`}
                    list="fin-categories"
                    defaultValue={t.category}
                    key={`${t.id}-${t.category}`}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== t.category) onPatch(t, { category: v });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    aria-label="Categoria"
                  />
                </td>
                <td className={`px-3 py-2 text-right font-medium whitespace-nowrap tabular-nums ${t.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                  {t.amount > 0 ? "+" : "−"}
                  {money(Math.abs(t.amount))}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button type="button" className={btnSm} onClick={() => onPatch(t, { ignored: !t.ignored })} title="Não contar nos totais (transferência, fatura…)">
                      {t.ignored ? "Contar" : "Ignorar"}
                    </button>
                    <button
                      type="button"
                      className={btnSm}
                      onClick={() =>
                        setRule({
                          pattern: (t.merchant || t.description).split(/\s+/).slice(0, 3).join(" "),
                          category: t.category,
                          ignore: t.ignored,
                        })
                      }
                    >
                      Regra
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                  Nenhuma transação.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Orçamentos e regras ----------

function Budgets({
  data,
  txs,
  month,
  showToast,
  onChanged,
}: {
  data: FinOverview;
  txs: FinTransaction[];
  month: string;
  showToast: (m: string) => void;
  onChanged: () => Promise<unknown>;
}) {
  const stats = useMonthStats(txs, data.accounts);
  const spent = new Map(stats.categories.map((c) => [c.category, c.spent]));
  const [newCat, setNewCat] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [rule, setRule] = useState({ pattern: "", category: "", ignore: false });
  const totalLimit = data.budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpentBudgeted = data.budgets.reduce((s, b) => s + (spent.get(b.category) ?? 0), 0);

  const setBudget = async (category: string, limit: number | null) => {
    try {
      await orcamentosApi.finSetBudget(category, limit);
      await onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    }
  };

  // Sugestão: média dos últimos meses não está disponível por categoria; usa o gasto do mês como base
  const unbudgeted = stats.categories.filter((c) => !data.budgets.some((b) => b.category === c.category));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className={cardClass}>
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold">Orçamento mensal</h3>
          <span className="text-xs text-neutral-500">{monthLabel(month)}</span>
        </div>
        {data.budgets.length ? (
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {money(totalSpentBudgeted)} de {money(totalLimit)} ({Math.round((totalSpentBudgeted / Math.max(1, totalLimit)) * 100)}%)
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">Defina limites por categoria para acompanhar o mês.</p>
        )}
        <ul className="mt-4 space-y-4">
          {data.budgets.map((b) => {
            const s = spent.get(b.category) ?? 0;
            const pct = s / Math.max(1, b.limit);
            const tone = pct > 1 ? "#dc2626" : pct > 0.85 ? "#d97706" : "var(--fin-in)";
            return (
              <li key={b.category}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{b.category}</span>
                  <span className="flex items-center gap-2 tabular-nums">
                    {money(s)} /
                    <input
                      type="number"
                      min={0}
                      step={10}
                      defaultValue={b.limit}
                      key={`${b.category}-${b.limit}`}
                      className={`${control} min-h-8 w-24 px-2 py-0.5 text-right text-sm`}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v !== b.limit) setBudget(b.category, v || null);
                      }}
                      aria-label={`Limite de ${b.category}`}
                    />
                    <button type="button" className={`${btnSm} px-2`} onClick={() => setBudget(b.category, null)} aria-label={`Remover orçamento de ${b.category}`}>
                      ✕
                    </button>
                  </span>
                </div>
                <div className="mt-1.5 h-2 bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-full rounded-r-[4px]" style={{ width: `${Math.min(100, pct * 100)}%`, background: tone }} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {pct > 1 ? `⚠ Estourou ${money(s - b.limit)}` : `Restam ${money(b.limit - s)}`}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 grid gap-2 border-t border-neutral-200 pt-4 sm:grid-cols-[1fr_140px_auto] dark:border-neutral-800">
          <datalist id="fin-categories-b">
            {data.categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input className={inputClass} list="fin-categories-b" placeholder="Categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <input className={inputClass} type="number" min={0} placeholder="Limite R$" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
          <button
            type="button"
            className={btnPrimary}
            disabled={!newCat.trim() || !Number(newLimit)}
            onClick={async () => {
              await setBudget(newCat.trim(), Number(newLimit));
              setNewCat("");
              setNewLimit("");
            }}
          >
            Adicionar
          </button>
        </div>
        {unbudgeted.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-neutral-500">Sem orçamento:</span>
            {unbudgeted.slice(0, 8).map((c) => (
              <button
                key={c.category}
                type="button"
                className={btnSm}
                onClick={() => {
                  setNewCat(c.category);
                  setNewLimit(String(Math.ceil(c.spent / 50) * 50));
                }}
              >
                {c.category}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-semibold">Regras de categorização</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Quando a descrição contém o texto, a transação ganha a categoria (ou é ignorada nos totais). Pagamento de fatura e transferência entre suas contas já são ignorados.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={inputClass} placeholder="Texto (ex. UBER)" value={rule.pattern} onChange={(e) => setRule({ ...rule, pattern: e.target.value })} />
          <input className={inputClass} list="fin-categories-b" placeholder="Categoria" value={rule.category} onChange={(e) => setRule({ ...rule, category: e.target.value })} />
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={rule.ignore} onChange={(e) => setRule({ ...rule, ignore: e.target.checked })} />
            Ignorar nos totais
          </label>
          <button
            type="button"
            className={btnPrimary}
            disabled={rule.pattern.trim().length < 2 || (!rule.category.trim() && !rule.ignore)}
            onClick={async () => {
              try {
                const r = await orcamentosApi.finAddRule({ ...rule, apply: true });
                showToast(`Regra criada · ${r.applied} transações ajustadas`);
                setRule({ pattern: "", category: "", ignore: false });
                await onChanged();
              } catch (e) {
                showToast(e instanceof Error ? e.message : "Erro");
              }
            }}
          >
            Criar regra
          </button>
        </div>
        <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {data.rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                “<strong>{r.pattern}</strong>” → {r.category || "—"}
                {r.ignore ? <span className="ml-1 text-xs text-neutral-500">(ignorar)</span> : null}
              </span>
              <button
                type="button"
                className={`${btnSm} text-red-600 dark:text-red-400`}
                onClick={async () => {
                  await orcamentosApi.finDeleteRule(r.id);
                  await onChanged();
                }}
              >
                Remover
              </button>
            </li>
          ))}
          {!data.rules.length ? <li className="py-2 text-sm text-neutral-500">Nenhuma regra ainda.</li> : null}
        </ul>
      </div>
    </div>
  );
}

// ---------- Contas ----------

function Accounts({ data, showToast, onChanged }: { data: FinOverview; showToast: (m: string) => void; onChanged: () => Promise<unknown> }) {
  const [itemId, setItemId] = useState("");
  const [busy, setBusy] = useState("");

  const add = async () => {
    setBusy("add");
    try {
      const { result } = await orcamentosApi.finAddItem(itemId.trim());
      showToast(result.error ? `Cadastrado, mas: ${result.error}` : `${result.accounts} contas e ${result.transactions} transações importadas`);
      setItemId("");
      await onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy("");
    }
  };

  const syncOne = async (id: string, full = false) => {
    setBusy(id);
    try {
      const { results } = await orcamentosApi.finSync({ itemId: id, full, refresh: !full });
      const r = results[0];
      showToast(r?.error ? r.error : `${r?.transactions ?? 0} transações sincronizadas`);
      await onChanged();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {data.items.map((item) => {
          const accounts = data.accounts.filter((a) => a.itemId === item.id);
          const inv = data.investments.filter((i) => i.itemId === item.id);
          const ok = item.status === "UPDATED" && !item.error;
          return (
            <div key={item.id} className={cardClass}>
              <div className="flex items-center gap-3">
                {item.connectorImage ? <img src={item.connectorImage} alt="" className="size-10 rounded-full bg-white object-contain p-1" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.connectorName || "Conexão"}</p>
                  <p className="truncate font-mono text-[11px] text-neutral-500">{item.id}</p>
                </div>
                <span
                  className={`border px-2 py-0.5 text-[11px] font-medium ${
                    ok
                      ? "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                      : "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"
                  }`}
                >
                  {ok ? "✓ Atualizado" : `⚠ ${item.status || "Pendente"}`}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Banco atualizou {relTime(item.bankUpdatedAt)} · painel sincronizou {relTime(item.syncedAt)}
              </p>
              {item.error ? <p className="mt-2 text-xs text-red-700 dark:text-red-400">{item.error}</p> : null}
              <ul className="mt-4 divide-y divide-neutral-100 text-sm dark:divide-neutral-800">
                {accounts.map((a) => (
                  <li key={a.id} className={`flex items-center justify-between gap-3 py-2 ${a.hidden ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate">{a.name}</p>
                      <p className="text-xs text-neutral-500">
                        {isCredit(a) ? "Cartão" : a.subtype === "SAVINGS_ACCOUNT" ? "Poupança" : "Conta"}
                        {a.number ? ` · ${a.number}` : ""}
                        {isCredit(a) && a.availableCredit != null ? ` · disponível ${money(a.availableCredit)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{money(a.balance)}</span>
                      <button
                        type="button"
                        className={btnSm}
                        title={a.hidden ? "Voltar a contar nos totais" : "Tirar dos totais"}
                        onClick={async () => {
                          await orcamentosApi.finHideAccount(a.id, !a.hidden);
                          await onChanged();
                        }}
                      >
                        {a.hidden ? "Mostrar" : "Ocultar"}
                      </button>
                    </div>
                  </li>
                ))}
                {inv.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate">{i.name}</p>
                      <p className="text-xs text-neutral-500">
                        Investimento · {i.type}
                        {i.dueDate ? ` · vence ${new Date(i.dueDate).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </div>
                    <span className="tabular-nums">{money(i.balance)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnSm} disabled={!!busy} onClick={() => syncOne(item.id)}>
                  {busy === item.id ? "Sincronizando…" : "Sincronizar"}
                </button>
                <button type="button" className={btnSm} disabled={!!busy} onClick={() => syncOne(item.id, true)} title="Reimporta os últimos 12 meses">
                  Reimportar 12 meses
                </button>
                <button
                  type="button"
                  className={`${btnSm} ml-auto text-red-600 dark:text-red-400`}
                  disabled={!!busy}
                  onClick={async () => {
                    if (!window.confirm("Remover esta conexão e todo o histórico dela do painel?")) return;
                    await orcamentosApi.finDeleteItem(item.id);
                    await onChanged();
                  }}
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={cardClass}>
        <h3 className="text-base font-semibold">Conectar banco (Meu Pluggy)</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
          <li>Em meu.pluggy.ai, conecte seu banco pelo Open Finance.</li>
          <li>No menu (⋮) da conexão, toque em “Copiar Item ID”.</li>
          <li>Cole abaixo. O painel importa 12 meses e passa a sincronizar todo dia.</li>
        </ol>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputClass} font-mono`}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            disabled={!data.configured}
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={!data.configured || !/^[0-9a-f-]{36}$/i.test(itemId.trim()) || busy === "add"}
            onClick={add}
          >
            {busy === "add" ? "Importando…" : "Adicionar"}
          </button>
        </div>
        {!data.configured ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel primeiro.</p>
        ) : null}
      </div>
    </div>
  );
}
