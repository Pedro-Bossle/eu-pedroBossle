import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireSession } from "../../_lib/auth.js";
import { withAuth } from "../../_lib/db.js";

const TZ = "America/Sao_Paulo";

type Row = { day: string; amount: number; category: string; key: string; label: string };

const monthOf = (day: string) => day.slice(0, 7);
const shift = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const daysIn = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
};
const round = (n: number) => Math.round(n * 100) / 100;

/** Chave estável de estabelecimento: nome do merchant ou descrição sem números/ruído. */
function merchantKey(merchant: string, description: string) {
  const base = (merchant || description)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(PAG|PGTO|COMPRA|DEBITO|CREDITO|PIX|ENVIADO|RECEBIDO|TRANSF\w*)\b\*?/g, " ")
    .replace(/[*#]/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base.split(" ").slice(0, 3).join(" ") || "OUTROS";
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/**
 * GET finance/analytics?month=YYYY-MM → análise do mês para o painel:
 * totais vs mês anterior, gasto acumulado por dia, categorias (mês, anterior, média 3m e
 * histórico 6m), estabelecimentos, dia da semana, entradas por categoria e recorrências.
 * Considera só transações não ignoradas de contas visíveis.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const month = String(req.query.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return json(res, 400, { error: "month=YYYY-MM obrigatório" });

  try {
    const first = shift(month, -5);
    const rows = await withAuth(async (db) => {
      const { rows } = await db.query(
        `SELECT to_char(t.date AT TIME ZONE '${TZ}', 'YYYY-MM-DD') AS day, t.amount, t.category,
                t.merchant, t.description
         FROM fin_transactions t JOIN fin_accounts a ON a.id = t.account_id
         WHERE NOT t.ignored AND NOT a.hidden
           AND (t.date AT TIME ZONE '${TZ}') >= $1::date
           AND (t.date AT TIME ZONE '${TZ}') < ($2::date + interval '1 month')`,
        [`${first}-01`, `${month}-01`],
      );
      return rows.map(
        (r): Row => ({
          day: String(r.day),
          amount: Number(r.amount),
          category: String(r.category || "Outros"),
          key: merchantKey(String(r.merchant ?? ""), String(r.description ?? "")),
          label: String(r.merchant || r.description || ""),
        }),
      );
    });

    const prev = shift(month, -1);
    const months6 = Array.from({ length: 6 }, (_, i) => shift(month, i - 5));
    const prior3 = [shift(month, -1), shift(month, -2), shift(month, -3)];

    const totals = (ym: string) => {
      let income = 0;
      let expense = 0;
      for (const r of rows) {
        if (monthOf(r.day) !== ym) continue;
        if (r.amount > 0) income += r.amount;
        else expense -= r.amount;
      }
      return { income: round(income), expense: round(expense) };
    };

    // Gasto acumulado dia a dia (mês atual × anterior)
    const cumulative = (ym: string) => {
      const perDay = new Array(daysIn(ym)).fill(0) as number[];
      for (const r of rows) if (monthOf(r.day) === ym && r.amount < 0) perDay[Number(r.day.slice(8)) - 1]! -= r.amount;
      let acc = 0;
      return perDay.map((v) => round((acc += v)));
    };

    // Categorias (saídas)
    const spendBy = (ym: string) => {
      const m = new Map<string, number>();
      for (const r of rows) if (monthOf(r.day) === ym && r.amount < 0) m.set(r.category, (m.get(r.category) ?? 0) - r.amount);
      return m;
    };
    const byMonth = new Map(months6.map((ym) => [ym, spendBy(ym)]));
    const cur = byMonth.get(month)!;
    const allCats = new Set<string>();
    for (const m of byMonth.values()) for (const c of m.keys()) allCats.add(c);
    const categories = [...allCats]
      .map((category) => ({
        category,
        spent: round(cur.get(category) ?? 0),
        previous: round(byMonth.get(prev)?.get(category) ?? 0),
        avg3: round(prior3.reduce((s, ym) => s + (byMonth.get(ym)?.get(category) ?? 0), 0) / 3),
        history: months6.map((ym) => round(byMonth.get(ym)?.get(category) ?? 0)),
        count: rows.filter((r) => monthOf(r.day) === month && r.amount < 0 && r.category === category).length,
      }))
      .filter((c) => c.spent > 0 || c.previous > 0 || c.avg3 > 0)
      .sort((a, b) => b.spent - a.spent || b.avg3 - a.avg3);

    // Entradas por categoria
    const incomeMap = new Map<string, number>();
    for (const r of rows) if (monthOf(r.day) === month && r.amount > 0) incomeMap.set(r.category, (incomeMap.get(r.category) ?? 0) + r.amount);
    const income = [...incomeMap].map(([category, value]) => ({ category, value: round(value) })).sort((a, b) => b.value - a.value);

    // Estabelecimentos do mês
    const merch = new Map<string, { label: string; spent: number; count: number; category: string }>();
    for (const r of rows) {
      if (monthOf(r.day) !== month || r.amount >= 0) continue;
      const m = merch.get(r.key) ?? { label: titleCase(r.key), spent: 0, count: 0, category: r.category };
      m.spent -= r.amount;
      m.count += 1;
      merch.set(r.key, m);
    }
    const merchants = [...merch.values()]
      .map((m) => ({ ...m, spent: round(m.spent) }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 10);

    // Dia da semana: média de gasto por ocorrência do dia nos últimos 3 meses + atual
    const window4 = new Set([month, ...prior3]);
    const wdSum = new Array(7).fill(0) as number[];
    const wdDays = new Array(7).fill(0) as number[];
    for (const ym of window4) {
      const [y, m] = ym.split("-").map(Number);
      const lastDay = ym === month ? Math.min(daysIn(ym), todayInMonth(ym)) : daysIn(ym);
      for (let d = 1; d <= lastDay; d += 1) wdDays[new Date(Date.UTC(y!, m! - 1, d)).getUTCDay()]! += 1;
    }
    for (const r of rows) {
      if (!window4.has(monthOf(r.day)) || r.amount >= 0) continue;
      const [y, m, d] = r.day.split("-").map(Number);
      wdSum[new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()]! -= r.amount;
    }
    const weekday = wdSum.map((s, i) => round(wdDays[i] ? s / wdDays[i]! : 0));

    // Recorrências: mesmo estabelecimento em 3+ dos últimos 4 meses, valor estável (±25%)
    const recurring: { label: string; category: string; avg: number; months: number; lastDay: string; inMonth: boolean }[] = [];
    const recentMonths = [month, ...prior3];
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      if (r.amount >= 0 || !recentMonths.includes(monthOf(r.day))) continue;
      groups.set(r.key, [...(groups.get(r.key) ?? []), r]);
    }
    for (const [key, list] of groups) {
      const perMonth = new Map<string, number>();
      for (const r of list) perMonth.set(monthOf(r.day), (perMonth.get(monthOf(r.day)) ?? 0) - r.amount);
      const values = [...perMonth.values()];
      const fullMonths = [...perMonth.keys()].filter((ym) => ym !== month);
      if (fullMonths.length < 2 || perMonth.size < 3) continue;
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const spread = Math.max(...values) - Math.min(...values);
      if (avg < 5 || spread / avg > 0.5) continue;
      const counts = [...perMonth.keys()].map((ym) => list.filter((r) => monthOf(r.day) === ym).length);
      if (Math.max(...counts) > 3) continue; // compra frequente (mercado, café) não é assinatura
      recurring.push({
        label: titleCase(key),
        category: list[0]!.category,
        avg: round(avg),
        months: perMonth.size,
        lastDay: list.map((r) => r.day).sort().pop()!,
        inMonth: perMonth.has(month),
      });
    }
    recurring.sort((a, b) => b.avg - a.avg);

    return json(res, 200, {
      month,
      previousMonth: prev,
      current: totals(month),
      previous: totals(prev),
      cumulative: { current: cumulative(month), previous: cumulative(prev) },
      categories,
      months: months6,
      income,
      merchants,
      weekday,
      recurring: recurring.slice(0, 20),
    });
  } catch (error) {
    console.error("finance analytics:", error);
    return json(res, 500, { error: "Falha na análise" });
  }
}

function todayInMonth(ym: string) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return cur === ym ? now.getDate() : 31;
}
