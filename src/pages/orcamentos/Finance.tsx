import { useCallback, useEffect, useMemo, useState } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import { peek, remember } from "../../lib/orcamentos/cache";
import type { FinAccount, FinAnalytics, FinMonth, FinOverview, FinTransaction } from "../../types/orcamentos";
import { CategoriesView, Overview } from "./finance/Analysis";
import { C_IN, C_OUT, FIN_PALETTE_CSS } from "./finance/theme";
import Select from "./ui/Select";
import { btn, btnDangerSm, btnPrimary, btnSm, cardClass, control, inputClass, labelClass, tabItem, tabList } from "./panelStyles";

type Props = { showToast: (msg: string) => void };
type View = "visao" | "categorias" | "transacoes" | "orcamentos" | "contas";

const VIEWS: { id: View; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "categorias", label: "Categorias" },
  { id: "transacoes", label: "Transações" },
  { id: "orcamentos", label: "Orçamentos e regras" },
  { id: "contas", label: "Contas" },
];

const smallLabel = labelClass;


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
  const [data, setData] = useState<FinOverview | null>(() => peek<FinOverview>("fin"));
  const [loading, setLoading] = useState(() => !peek("fin"));
  const [syncing, setSyncing] = useState(false);
  const [month, setMonth] = useState(monthKey());
  const [txs, setTxs] = useState<FinTransaction[]>(() => peek<FinTransaction[]>(`fin:tx:${monthKey()}`) ?? []);
  const [txLoading, setTxLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [analytics, setAnalytics] = useState<FinAnalytics | null>(() => peek<FinAnalytics>(`fin:an:${monthKey()}`));

  const load = useCallback(async () => {
    try {
      setData(remember("fin", await orcamentosApi.finOverview()));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao carregar finanças");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadTxs = useCallback(async () => {
    setTxLoading(true);
    try {
      const cachedTx = peek<FinTransaction[]>(`fin:tx:${month}`);
      if (cachedTx) setTxs(cachedTx);
      const r = await orcamentosApi.finTransactions({ month });
      setTxs(remember(`fin:tx:${month}`, r.transactions));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro nas transações");
    } finally {
      setTxLoading(false);
    }
  }, [month, showToast]);

  const loadAnalytics = useCallback(async () => {
    try {
      const cachedAn = peek<FinAnalytics>(`fin:an:${month}`);
      if (cachedAn) setAnalytics(cachedAn);
      setAnalytics(remember(`fin:an:${month}`, await orcamentosApi.finAnalytics(month)));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na análise");
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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnalytics();
  }, [loadAnalytics]);
  const refreshAll = useCallback(() => Promise.all([load(), loadTxs(), loadAnalytics()]), [load, loadTxs, loadAnalytics]);

  const sync = async (refresh = false) => {
    setSyncing(true);
    try {
      const { results } = await orcamentosApi.finSync({ refresh });
      const failed = results.filter((r) => r.error);
      const total = results.reduce((s, r) => s + r.transactions, 0);
      showToast(failed.length ? `Erro em ${failed.length} conexão(ões): ${failed[0]!.error}` : `${total} transações sincronizadas`);
      await refreshAll();
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
      loadAnalytics();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro ao salvar");
      loadTxs();
    }
  };

  if (loading) return <p className="text-sm text-muted">Carregando finanças…</p>;
  if (!data) return null;

  const hasData = data.accounts.length > 0;

  return (
    <section className="fin-root space-y-6" aria-labelledby="fin-title">
      <style>{FIN_PALETTE_CSS}</style>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={smallLabel}>Pessoal</p>
          <h2 id="fin-title" className="mt-1 text-2xl font-semibold tracking-tight">
            Finanças
          </h2>
          <p className="mt-1 text-xs text-muted">
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Defina <code>PLUGGY_CLIENT_ID</code> e <code>PLUGGY_CLIENT_SECRET</code> nas variáveis da Vercel para conectar seus bancos.
        </div>
      ) : !data.items.length ? (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-900 dark:text-sky-200">
          Nenhum banco conectado ainda.{" "}
          <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setView("contas")}>
            Conecte seu primeiro banco
          </button>
          .
        </div>
      ) : null}

      <nav className={`${tabList} w-fit max-w-full`} aria-label="Seções de finanças">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-current={view === v.id ? "page" : undefined}
            className={tabItem(view === v.id)}
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
            analytics={analytics?.month === month ? analytics : null}
            month={month}
            monthly={<MonthlyChart months={data.months} selected={month} onPick={setMonth} />}
            onPickCategory={(c) => {
              setCategoryFilter(c);
              setView("transacoes");
            }}
          />
        ) : (
          <EmptyState onGo={() => setView("contas")} />
        )
      ) : null}

      {view === "categorias" ? (
        hasData ? (
          <CategoriesView
            analytics={analytics?.month === month ? analytics : null}
            budgets={data.budgets}
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
          onRuleCreated={refreshAll}
        />
      ) : null}

      {view === "orcamentos" ? <Budgets data={data} txs={txs} month={month} showToast={showToast} onChanged={refreshAll} /> : null}

      {view === "contas" ? <Accounts data={data} showToast={showToast} onChanged={refreshAll} /> : null}
    </section>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <div className={`${cardClass} text-center`}>
      <p className="text-sm text-muted">Conecte um banco para ver saldo, gastos por categoria e evolução mensal.</p>
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

function Legend() {
  return (
    <div className="flex gap-4 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-lg" style={{ background: C_IN }} /> Entradas
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-lg" style={{ background: C_OUT }} /> Saídas
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
            <tr className="text-left text-xs text-muted">
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Entradas</th>
              <th className="py-1 text-right font-medium">Saídas</th>
              <th className="py-1 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((m) => (
              <tr key={m.month} className="border-t border-line">
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
    <div className="relative">
      <div className="mb-2 flex justify-end">
        <Legend />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Entradas e saídas dos últimos 13 meses">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--fin-grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-faint text-[10px]">
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
              {sel ? <rect x={pad.l + i * step} y={pad.t} width={step} height={H - pad.t - pad.b} className="fill-sunken" /> : null}
              {bar(m.income, x0, C_IN)}
              {bar(m.expense, x0 + barW + 2, C_OUT)}
              <text x={pad.l + i * step + step / 2} y={H - 8} textAnchor="middle" className={`text-[10px] ${sel ? "fill-ink font-semibold" : "fill-faint"}`}>
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
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="currentColor" className="text-faint" />
      </svg>
      {hovered ? (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-sm"
          style={{
            left: `${((pad.l + series.indexOf(hovered) * step + step / 2) / W) * 100}%`,
            transform: series.indexOf(hovered) > series.length / 2 ? "translateX(-105%)" : "translateX(5%)",
          }}
        >
          <p className="font-semibold">{monthLabel(hovered.month)}</p>
          <p className="mt-1 flex items-center gap-1.5 tabular-nums">
            <span className="size-2 rounded-lg" style={{ background: C_IN }} /> {money(hovered.income)}
          </p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <span className="size-2 rounded-lg" style={{ background: C_OUT }} /> {money(hovered.expense)}
          </p>
          <p className="mt-1 border-t border-line pt-1 tabular-nums">Resultado {money(hovered.income - hovered.expense)}</p>
        </div>
      ) : null}
      <div className="mt-2 flex justify-between text-xs text-muted">
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
        <Select
          ariaLabel="Conta"
          value={account}
          onChange={setAccount}
          options={[{ value: "", label: "Todas as contas" }, ...data.accounts.map((a) => ({ value: a.id, label: a.name, hint: a.type === "CREDIT" ? "cartão" : "" }))]}
        />
        <Select
          ariaLabel="Categoria"
          value={category}
          onChange={setCategory}
          options={[{ value: "", label: "Todas as categorias" }, ...data.categories.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          ariaLabel="Tipo"
          value={kind}
          onChange={(v) => setKind(v)}
          options={[
            { value: "todas", label: "Entradas e saídas" },
            { value: "saidas", label: "Só saídas" },
            { value: "entradas", label: "Só entradas" },
          ]}
        />
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
        <span className="ml-auto text-muted">
          {list.length} transações · saldo <strong className="tabular-nums text-ink">{money(total)}</strong>
          {loading ? " · carregando…" : ""}
        </span>
      </div>

      {rule ? (
        <div className={`${cardClass} space-y-3`}>
          <p className="text-sm font-medium">Nova regra: quando a descrição contiver…</p>
          <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_auto_auto] sm:items-center">
            <input className={inputClass} value={rule.pattern} onChange={(e) => setRule({ ...rule, pattern: e.target.value })} />
            <Select
              ariaLabel="Categoria da regra"
              placeholder="Categoria"
              creatable
              value={rule.category}
              onChange={(v) => setRule({ ...rule, category: v })}
              options={data.categories.map((c) => ({ value: c, label: c }))}
            />
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
          <p className="text-xs text-muted">Aplica nas transações já existentes (exceto as editadas à mão) e nas próximas.</p>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sunken/50 text-left text-xs text-muted dark:bg-sunken/50">
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
              <tr key={t.id} className={`border-t border-line align-top ${t.ignored ? "opacity-50" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted">
                  {fmtDay(t.date)}
                  {t.status === "PENDING" ? <span className="block text-[10px]">pendente</span> : null}
                </td>
                <td className="px-3 py-2">
                  <p className="font-medium">{t.merchant || t.description}</p>
                  <p className="text-xs text-muted">
                    {t.merchant && t.merchant !== t.description ? `${t.description} · ` : ""}
                    {accName.get(t.accountId)}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <div className="w-44">
                    <Select
                      size="sm"
                      creatable
                      ariaLabel="Categoria"
                      value={t.category}
                      onChange={(v) => v !== t.category && onPatch(t, { category: v })}
                      options={data.categories.map((c) => ({ value: c, label: c }))}
                    />
                  </div>
                </td>
                <td className={`px-3 py-2 text-right font-medium whitespace-nowrap tabular-nums ${t.amount > 0 ? "text-accent-text" : ""}`}>
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
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
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
          <span className="text-xs text-muted">{monthLabel(month)}</span>
        </div>
        {data.budgets.length ? (
          <p className="mt-1 text-sm text-muted">
            {money(totalSpentBudgeted)} de {money(totalLimit)} ({Math.round((totalSpentBudgeted / Math.max(1, totalLimit)) * 100)}%)
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Defina limites por categoria para acompanhar o mês.</p>
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
                <div className="mt-1.5 h-2 bg-sunken">
                  <div className="h-full rounded-r-[4px]" style={{ width: `${Math.min(100, pct * 100)}%`, background: tone }} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {pct > 1 ? `⚠ Estourou ${money(s - b.limit)}` : `Restam ${money(b.limit - s)}`}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-[1fr_140px_auto]">
          <Select
            ariaLabel="Categoria do orçamento"
            placeholder="Categoria"
            creatable
            value={newCat}
            onChange={setNewCat}
            options={data.categories.filter((c) => !data.budgets.some((b) => b.category === c)).map((c) => ({ value: c, label: c }))}
          />
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
            <span className="text-xs text-muted">Sem orçamento:</span>
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
        <p className="mt-1 text-sm text-muted">
          Quando a descrição contém o texto, a transação ganha a categoria (ou é ignorada nos totais). Pagamento de fatura e transferência entre suas contas já são ignorados.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input className={inputClass} placeholder="Texto (ex. UBER)" value={rule.pattern} onChange={(e) => setRule({ ...rule, pattern: e.target.value })} />
          <Select
            ariaLabel="Categoria da regra"
            placeholder="Categoria"
            creatable
            value={rule.category}
            onChange={(v) => setRule({ ...rule, category: v })}
            options={data.categories.map((c) => ({ value: c, label: c }))}
          />
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
        <ul className="mt-4 divide-y divide-line">
          {data.rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                “<strong>{r.pattern}</strong>” → {r.category || "—"}
                {r.ignore ? <span className="ml-1 text-xs text-muted">(ignorar)</span> : null}
              </span>
              <button
                type="button"
                className={btnDangerSm}
                onClick={async () => {
                  await orcamentosApi.finDeleteRule(r.id);
                  await onChanged();
                }}
              >
                Remover
              </button>
            </li>
          ))}
          {!data.rules.length ? <li className="py-2 text-sm text-muted">Nenhuma regra ainda.</li> : null}
        </ul>
      </div>
    </div>
  );
}

// ---------- Contas ----------

function Accounts({ data, showToast, onChanged }: { data: FinOverview; showToast: (m: string) => void; onChanged: () => Promise<unknown> }) {
  const [itemId, setItemId] = useState("");
  const [busy, setBusy] = useState("");
  const [hook, setHook] = useState<{ url: string | null; registered: boolean } | null>(null);

  // Estado do webhook (só consulta; setState acontece no retorno do fetch)
  useEffect(() => {
    if (!data.configured) return;
    let cancelled = false;
    orcamentosApi
      .finWebhook("GET")
      .then((r) => !cancelled && setHook(r))
      .catch(() => !cancelled && setHook(null));
    return () => {
      cancelled = true;
    };
  }, [data.configured]);

  const toggleWebhook = async (on: boolean) => {
    setBusy("webhook");
    try {
      const r = await orcamentosApi.finWebhook(on ? "POST" : "DELETE");
      setHook(r);
      showToast(on ? "Atualização automática ativada" : "Atualização automática desativada");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro no webhook");
    } finally {
      setBusy("");
    }
  };

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

  /**
   * Abre o widget oficial Pluggy Connect. O servidor gera um connect token temporário
   * (o client secret não vem para o navegador). Ao concluir, o item é salvo e sincronizado.
   * Com `updateItemId`, abre direto a reconexão daquele banco (senha trocada, consentimento vencido).
   */
  const openConnect = async (updateItemId?: string) => {
    setBusy(updateItemId ?? "connect");
    try {
      const [{ accessToken }, { PluggyConnect }] = await Promise.all([
        orcamentosApi.finConnectToken(updateItemId),
        import("pluggy-connect-sdk"),
      ]);
      const widget = new PluggyConnect({
        connectToken: accessToken,
        updateItem: updateItemId,
        countries: ["BR"],
        language: "pt",
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        onSuccess: async ({ item }: { item: { id: string } }) => {
          setBusy(item.id);
          try {
            const { result } = await orcamentosApi.finAddItem(item.id);
            showToast(
              result.error
                ? `Banco conectado, mas a sincronização falhou: ${result.error}`
                : `Banco conectado: ${result.accounts} contas e ${result.transactions} transações importadas`,
            );
            await onChanged();
          } catch (e) {
            showToast(e instanceof Error ? e.message : "Erro ao salvar a conexão");
          } finally {
            setBusy("");
          }
        },
        onError: ({ message }: { message: string }) => showToast(`Pluggy: ${message}`),
        onClose: () => setBusy((b) => (b === "connect" || b === updateItemId ? "" : b)),
      });
      await widget.init();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível abrir a Pluggy");
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
                {item.connectorImage ? <img src={item.connectorImage} alt="" className="size-10 rounded-full bg-surface object-contain p-1" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.connectorName || "Conexão"}</p>
                  <p className="truncate font-mono text-[11px] text-muted">{item.id}</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                    ok
                      ? "border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                      : "border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300"
                  }`}
                >
                  {ok ? "✓ Atualizado" : `⚠ ${item.status || "Pendente"}`}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Banco atualizou {relTime(item.bankUpdatedAt)} · painel sincronizou {relTime(item.syncedAt)}
              </p>
              {item.error ? <p className="mt-2 text-xs text-danger">{item.error}</p> : null}
              <ul className="mt-4 divide-y divide-line text-sm">
                {accounts.map((a) => (
                  <li key={a.id} className={`flex items-center justify-between gap-3 py-2 ${a.hidden ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate">{a.name}</p>
                      <p className="text-xs text-muted">
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
                      <p className="text-xs text-muted">
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
                {!ok ? (
                  <button type="button" className={btnSm} disabled={!!busy} onClick={() => openConnect(item.id)} title="Abre a Pluggy para refazer o login ou renovar o consentimento">
                    Reconectar
                  </button>
                ) : null}
                <button type="button" className={btnSm} disabled={!!busy} onClick={() => syncOne(item.id, true)} title="Reimporta os últimos 12 meses">
                  Reimportar 12 meses
                </button>
                <button
                  type="button"
                  className={`${btnDangerSm} ml-auto `}
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
        <h3 className="text-base font-semibold">Conectar banco</h3>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Abre a janela oficial da Pluggy. Você escolhe o banco e autoriza pelo Open Finance; o painel importa 12 meses e passa
          a sincronizar todo dia. Sua senha do banco fica só na Pluggy.
        </p>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={!data.configured || !!busy}
          onClick={() => openConnect()}
        >
          {busy === "connect" ? "Abrindo a Pluggy…" : "Conectar banco"}
        </button>
        {!data.configured ? (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET na Vercel primeiro.</p>
        ) : null}

        {data.configured ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunken/70 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Atualização automática {hook?.registered ? <span className="text-accent-text">ativada</span> : <span className="text-muted">desativada</span>}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {hook?.registered
                  ? "A Pluggy avisa o painel quando o banco tem novidade e as transações entram sozinhas."
                  : hook && !hook.url
                    ? "Precisa de um endereço https público (ORCAMENTOS_PUBLIC_URL) para a Pluggy chamar."
                    : "Sem isso, os dados atualizam uma vez por dia ou quando você clica em Sincronizar."}
              </p>
            </div>
            <button
              type="button"
              className={hook?.registered ? btnSm : `${btnPrimary} min-h-8 px-3 py-1 text-xs`}
              disabled={busy === "webhook" || (!hook?.registered && !hook?.url)}
              onClick={() => toggleWebhook(!hook?.registered)}
            >
              {busy === "webhook" ? "Salvando…" : hook?.registered ? "Desativar" : "Ativar"}
            </button>
          </div>
        ) : null}

        <details className="mt-5 border-t border-line pt-4">
          <summary className="text-sm font-medium text-muted">Já tenho um Item ID (Meu Pluggy)</summary>
          <p className="mt-2 text-sm text-muted">No meu.pluggy.ai, menu ⋮ da conexão → “Copiar Item ID”.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className={`${inputClass} font-mono`}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              disabled={!data.configured}
              aria-label="Item ID da Pluggy"
            />
            <button
              type="button"
              className={btn}
              disabled={!data.configured || !/^[0-9a-f-]{36}$/i.test(itemId.trim()) || busy === "add"}
              onClick={add}
            >
              {busy === "add" ? "Importando…" : "Adicionar"}
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
