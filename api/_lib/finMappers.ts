const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
const n = (v: unknown) => (v == null ? null : Number(v));
const day = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));

export const mapItem = (r: Record<string, unknown>) => ({
  id: String(r.id),
  connectorName: String(r.connector_name ?? ""),
  connectorImage: String(r.connector_image ?? ""),
  status: String(r.status ?? ""),
  executionStatus: String(r.execution_status ?? ""),
  error: String(r.error ?? ""),
  bankUpdatedAt: iso(r.bank_updated_at),
  syncedAt: iso(r.synced_at),
});

export const mapAccount = (r: Record<string, unknown>) => ({
  id: String(r.id),
  itemId: String(r.item_id),
  type: String(r.type ?? ""),
  subtype: String(r.subtype ?? ""),
  name: String(r.name ?? ""),
  number: String(r.number ?? ""),
  balance: Number(r.balance ?? 0),
  currency: String(r.currency ?? "BRL"),
  creditLimit: n(r.credit_limit),
  availableCredit: n(r.available_credit),
  billDueDate: day(r.bill_due_date),
  hidden: Boolean(r.hidden),
  connectorName: String(r.connector_name ?? ""),
  syncedAt: iso(r.synced_at),
});

export const mapTx = (r: Record<string, unknown>) => ({
  id: String(r.id),
  accountId: String(r.account_id),
  date: iso(r.date),
  description: String(r.description ?? ""),
  amount: Number(r.amount ?? 0),
  pluggyCategory: String(r.pluggy_category ?? ""),
  category: String(r.category ?? ""),
  categoryManual: Boolean(r.category_manual),
  merchant: String(r.merchant ?? ""),
  status: String(r.status ?? ""),
  ignored: Boolean(r.ignored),
  notes: String(r.notes ?? ""),
});

export const mapInvestment = (r: Record<string, unknown>) => ({
  id: String(r.id),
  itemId: String(r.item_id),
  name: String(r.name ?? ""),
  type: String(r.type ?? ""),
  subtype: String(r.subtype ?? ""),
  balance: Number(r.balance ?? 0),
  amountOriginal: n(r.amount_original),
  annualRate: n(r.annual_rate),
  dueDate: day(r.due_date),
});
