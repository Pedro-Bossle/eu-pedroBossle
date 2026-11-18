/**
 * Datas no fuso de São Paulo sem impedir o uso de índice: em vez de converter a coluna
 * (`(col AT TIME ZONE tz)::date = …`), comparamos a coluna crua com o início do dia local.
 */
export const TZ = "America/Sao_Paulo";

/** Hoje (date) no fuso local. */
export const TODAY = `(now() AT TIME ZONE '${TZ}')::date`;

/** Início do dia local de uma expressão `date`, como timestamptz. */
export const dayStart = (dateExpr: string) => `((${dateExpr})::timestamp AT TIME ZONE '${TZ}')`;

/** `col` dentro do dia local `dateExpr`. */
export const onDay = (col: string, dateExpr: string) =>
  `(${col} >= ${dayStart(dateExpr)} AND ${col} < ${dayStart(`(${dateExpr}) + 1`)})`;

/** Primeiro dia do mês local corrente / do mês "YYYY-MM" informado em parâmetro. */
export const MONTH_START = `date_trunc('month', now() AT TIME ZONE '${TZ}')::date`;
export const monthOf = (param: string) => `((${param} || '-01')::date)`;

/** `col` dentro do mês local que começa em `firstDayExpr`. */
export const inMonth = (col: string, firstDayExpr: string) =>
  `(${col} >= ${dayStart(firstDayExpr)} AND ${col} < ${dayStart(`(${firstDayExpr} + interval '1 month')::date`)})`;
