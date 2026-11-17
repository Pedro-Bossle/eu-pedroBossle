import type { PoolClient } from "@neondatabase/serverless";

/**
 * Pluggy (Open Finance). Uso pessoal: conecte os bancos no Meu Pluggy (meu.pluggy.ai),
 * copie o Item ID de cada conexão e cadastre no painel. clientId/secret ficam só no servidor.
 */
const BASE = "https://api.pluggy.ai";
let cached: { key: string; exp: number } | null = null;

export const pluggyConfigured = () =>
  Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);

async function apiKey(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.key;
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET");
  const r = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  const data = (await r.json().catch(() => ({}))) as { apiKey?: string; message?: string };
  if (!r.ok || !data.apiKey) throw new Error(`Pluggy auth: ${data.message ?? r.status}`);
  // A apiKey vale 2h; renova antes
  cached = { key: data.apiKey, exp: Date.now() + 100 * 60_000 };
  return data.apiKey;
}

export async function pluggy<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = await apiKey();
  const r = await fetch(`${BASE}${path}`, {
    method: init.method ?? "GET",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (r.status === 401) cached = null;
  if (!r.ok) throw new Error(`Pluggy ${path.split("?")[0]}: ${data.message ?? r.status}`);
  return data;
}

type PItem = {
  id: string;
  status?: string;
  executionStatus?: string;
  lastUpdatedAt?: string;
  error?: { message?: string } | null;
  connector?: { name?: string; imageUrl?: string };
};

type PAccount = {
  id: string;
  type?: string;
  subtype?: string;
  name?: string;
  marketingName?: string;
  number?: string;
  balance?: number;
  currencyCode?: string;
  creditData?: { creditLimit?: number; availableCreditLimit?: number; balanceDueDate?: string } | null;
};

type PTransaction = {
  id: string;
  description?: string;
  descriptionRaw?: string;
  amount: number;
  currencyCode?: string;
  date: string;
  category?: string;
  type?: "DEBIT" | "CREDIT";
  status?: string;
  merchant?: { name?: string; businessName?: string } | null;
};

type PInvestment = {
  id: string;
  name?: string;
  type?: string;
  subtype?: string;
  balance?: number;
  amountOriginal?: number;
  annualRate?: number;
  dueDate?: string;
};

type Page<T> = { results: T[]; totalPages?: number; page?: number };

// ---------- Categorias ----------

/** Tradução das categorias da Pluggy (as que mais aparecem). */
const CATEGORY_PT: Record<string, string> = {
  Income: "Renda",
  Salary: "Salário",
  Retirement: "Aposentadoria",
  "Entrepreneurial activities": "Renda extra",
  "Government aid": "Benefícios",
  "Non-recurring income": "Renda eventual",
  Loans: "Empréstimos",
  Investments: "Investimentos",
  "Fixed income": "Investimentos",
  "Variable income": "Investimentos",
  "Same person transfer": "Transferência própria",
  "Transfers": "Transferências",
  "Transfer - PIX": "Pix",
  "Transfer - TED": "TED",
  "Transfer - Bank slip": "Boleto",
  "Credit card payment": "Pagamento de fatura",
  "Credit card": "Cartão",
  "Legal obligations": "Obrigações",
  "Services": "Serviços",
  "Telecommunications": "Telefone e internet",
  "Internet": "Telefone e internet",
  "Mobile": "Telefone e internet",
  "TV": "Assinaturas",
  "Education": "Educação",
  "Online courses": "Educação",
  "Wellness and fitness": "Saúde e bem-estar",
  "Gyms and fitness centers": "Academia",
  "Health": "Saúde",
  "Pharmacy": "Farmácia",
  "Dentist": "Saúde",
  "Hospital clinics and labs": "Saúde",
  "Insurance": "Seguros",
  "Leisure": "Lazer",
  "Sports": "Lazer",
  "Tickets": "Lazer",
  "Gaming": "Lazer",
  "Digital services": "Assinaturas",
  "Video streaming": "Assinaturas",
  "Music streaming": "Assinaturas",
  "Shopping": "Compras",
  "Online shopping": "Compras",
  "Electronics": "Compras",
  "Clothing": "Roupas",
  "Pet supplies and vet": "Pet",
  "Groceries": "Mercado",
  "Food and drinks": "Alimentação",
  "Eating out": "Restaurantes",
  "Food delivery": "Delivery",
  "Travel": "Viagem",
  "Airport and airlines": "Viagem",
  "Accomodation": "Viagem",
  "Donations": "Doações",
  "Lottery": "Apostas",
  "Betting": "Apostas",
  "Taxes": "Impostos",
  "Income taxes": "Impostos",
  "Bank fees": "Tarifas bancárias",
  "Interests charged": "Juros",
  "Housing": "Moradia",
  "Rent": "Aluguel",
  "Utilities": "Contas da casa",
  "Water": "Contas da casa",
  "Electricity": "Contas da casa",
  "Gas": "Contas da casa",
  "Houseware": "Casa",
  "Transportation": "Transporte",
  "Taxi and ride-hailing": "Transporte",
  "Public transportation": "Transporte",
  "Car rental": "Transporte",
  "Gas stations": "Combustível",
  "Parking": "Transporte",
  "Tolls and in vehicle payment": "Transporte",
  "Vehicle maintenance": "Carro",
  "Automotive": "Carro",
};

export const translateCategory = (c: string) => CATEGORY_PT[c] ?? c ?? "";

/** Movimentos que distorcem gasto/entrada: pagamento de fatura e transferência entre contas próprias. */
const AUTO_IGNORE =
  /(credit card payment|same person transfer|pagamento de fatura|pagto fatura|pag fatura|transf(er[eê]ncia)? (entre contas|mesma titularidade))/i;

export type Rule = { pattern: string; category: string; ignore: boolean };

export function classify(t: { description: string; pluggyCategory: string }, rules: Rule[]) {
  const desc = t.description.toLowerCase();
  const rule = rules.find((r) => r.pattern && desc.includes(r.pattern.toLowerCase()));
  const base = translateCategory(t.pluggyCategory) || "Outros";
  return {
    category: rule?.category || base,
    ignored: rule ? rule.ignore : AUTO_IGNORE.test(`${t.pluggyCategory} ${t.description}`),
  };
}

// ---------- Sync ----------

const ymd = (d: Date) => d.toISOString().slice(0, 10);

async function allTransactions(accountId: string, from: string, to: string) {
  const out: PTransaction[] = [];
  for (let page = 1; page <= 40; page += 1) {
    const r = await pluggy<Page<PTransaction>>(
      `/transactions?accountId=${encodeURIComponent(accountId)}&from=${from}&to=${to}&pageSize=500&page=${page}`,
    );
    out.push(...(r.results ?? []));
    if (!r.totalPages || page >= r.totalPages) break;
  }
  return out;
}

export async function loadRules(db: PoolClient): Promise<Rule[]> {
  const { rows } = await db.query(`SELECT pattern, category, ignore FROM fin_rules ORDER BY length(pattern) DESC`);
  return rows as Rule[];
}

export type ItemSync = { itemId: string; accounts: number; transactions: number; investments: number; error?: string };

export async function syncItem(db: PoolClient, itemId: string, opts: { full?: boolean } = {}): Promise<ItemSync> {
  const item = await pluggy<PItem>(`/items/${encodeURIComponent(itemId)}`);
  const prev = await db.query(`SELECT synced_at FROM fin_items WHERE id = $1`, [itemId]);
  const lastSync: Date | null = prev.rows[0]?.synced_at ? new Date(prev.rows[0].synced_at) : null;

  await db.query(
    `INSERT INTO fin_items (id, connector_name, connector_image, status, execution_status, error, bank_updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET connector_name = EXCLUDED.connector_name,
       connector_image = EXCLUDED.connector_image, status = EXCLUDED.status,
       execution_status = EXCLUDED.execution_status, error = EXCLUDED.error,
       bank_updated_at = EXCLUDED.bank_updated_at`,
    [
      itemId,
      item.connector?.name ?? "",
      item.connector?.imageUrl ?? "",
      item.status ?? "",
      item.executionStatus ?? "",
      item.error?.message ?? "",
      item.lastUpdatedAt ?? null,
    ],
  );

  const accounts = (await pluggy<Page<PAccount>>(`/accounts?itemId=${encodeURIComponent(itemId)}`)).results ?? [];
  for (const a of accounts) {
    await db.query(
      `INSERT INTO fin_accounts (id, item_id, type, subtype, name, number, balance, currency,
         credit_limit, available_credit, bill_due_date, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, subtype = EXCLUDED.subtype,
         name = EXCLUDED.name, number = EXCLUDED.number, balance = EXCLUDED.balance,
         currency = EXCLUDED.currency, credit_limit = EXCLUDED.credit_limit,
         available_credit = EXCLUDED.available_credit, bill_due_date = EXCLUDED.bill_due_date, synced_at = now()`,
      [
        a.id,
        itemId,
        a.type ?? "",
        a.subtype ?? "",
        a.marketingName || a.name || "",
        a.number ?? "",
        a.balance ?? 0,
        a.currencyCode ?? "BRL",
        a.creditData?.creditLimit ?? null,
        a.creditData?.availableCreditLimit ?? null,
        a.creditData?.balanceDueDate ? a.creditData.balanceDueDate.slice(0, 10) : null,
      ],
    );
  }

  // Janela: 1 ano no primeiro sync; depois 35 dias para trás (pega pendentes que viraram lançados)
  const now = new Date();
  const fromDate = !lastSync || opts.full ? new Date(now.getTime() - 365 * 86400_000) : new Date(lastSync.getTime() - 35 * 86400_000);
  const from = ymd(fromDate);
  const to = ymd(new Date(now.getTime() + 86400_000));
  const rules = await loadRules(db);
  let txCount = 0;

  for (const a of accounts) {
    const txs = await allTransactions(a.id, from, to);
    txCount += txs.length;
    if (txs.length) {
      const cols = {
        id: [] as string[],
        date: [] as string[],
        description: [] as string[],
        amount: [] as number[],
        currency: [] as string[],
        pcat: [] as string[],
        cat: [] as string[],
        merchant: [] as string[],
        status: [] as string[],
        ignored: [] as boolean[],
      };
      for (const t of txs) {
        const description = (t.description || t.descriptionRaw || "").trim();
        const magnitude = Math.abs(Number(t.amount) || 0);
        // Normaliza: saída negativa, entrada positiva (vale para conta e cartão)
        const signed = t.type === "CREDIT" ? magnitude : t.type === "DEBIT" ? -magnitude : Number(t.amount) || 0;
        const c = classify({ description, pluggyCategory: t.category ?? "" }, rules);
        cols.id.push(t.id);
        cols.date.push(t.date);
        cols.description.push(description);
        cols.amount.push(signed);
        cols.currency.push(t.currencyCode ?? "BRL");
        cols.pcat.push(t.category ?? "");
        cols.cat.push(c.category);
        cols.merchant.push(t.merchant?.businessName || t.merchant?.name || "");
        cols.status.push(t.status ?? "POSTED");
        cols.ignored.push(c.ignored);
      }
      await db.query(
        `INSERT INTO fin_transactions (id, account_id, date, description, amount, currency,
           pluggy_category, category, merchant, status, ignored, synced_at)
         SELECT u.id, $1, u.date, u.description, u.amount, u.currency, u.pcat, u.cat, u.merchant, u.status, u.ignored, now()
         FROM unnest($2::text[], $3::timestamptz[], $4::text[], $5::numeric[], $6::text[], $7::text[],
                     $8::text[], $9::text[], $10::text[], $11::boolean[])
           AS u(id, date, description, amount, currency, pcat, cat, merchant, status, ignored)
         ON CONFLICT (id) DO UPDATE SET
           account_id = EXCLUDED.account_id, date = EXCLUDED.date, description = EXCLUDED.description,
           amount = EXCLUDED.amount, currency = EXCLUDED.currency, pluggy_category = EXCLUDED.pluggy_category,
           merchant = EXCLUDED.merchant, status = EXCLUDED.status, synced_at = now(),
           category = CASE WHEN fin_transactions.category_manual THEN fin_transactions.category ELSE EXCLUDED.category END,
           ignored = CASE WHEN fin_transactions.category_manual THEN fin_transactions.ignored ELSE EXCLUDED.ignored END`,
        [a.id, cols.id, cols.date, cols.description, cols.amount, cols.currency, cols.pcat, cols.cat, cols.merchant, cols.status, cols.ignored],
      );
    }
    // Pendentes que sumiram (viraram lançamento com outro id)
    await db.query(
      `DELETE FROM fin_transactions WHERE account_id = $1 AND date >= $2 AND status = 'PENDING' AND NOT (id = ANY($3))`,
      [a.id, from, txs.map((t) => t.id)],
    );
  }

  let investments: PInvestment[];
  try {
    investments = (await pluggy<Page<PInvestment>>(`/investments?itemId=${encodeURIComponent(itemId)}&pageSize=500`)).results ?? [];
  } catch {
    investments = []; // nem todo conector tem investimentos
  }
  for (const inv of investments) {
    await db.query(
      `INSERT INTO fin_investments (id, item_id, name, type, subtype, balance, amount_original, annual_rate, due_date, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, subtype = EXCLUDED.subtype,
         balance = EXCLUDED.balance, amount_original = EXCLUDED.amount_original,
         annual_rate = EXCLUDED.annual_rate, due_date = EXCLUDED.due_date, synced_at = now()`,
      [
        inv.id,
        itemId,
        inv.name ?? "",
        inv.type ?? "",
        inv.subtype ?? "",
        inv.balance ?? 0,
        inv.amountOriginal ?? null,
        inv.annualRate ?? null,
        inv.dueDate ? inv.dueDate.slice(0, 10) : null,
      ],
    );
  }
  if (investments.length) {
    await db.query(`DELETE FROM fin_investments WHERE item_id = $1 AND NOT (id = ANY($2))`, [
      itemId,
      investments.map((i) => i.id),
    ]);
  }

  await db.query(`UPDATE fin_items SET synced_at = now() WHERE id = $1`, [itemId]);
  return { itemId, accounts: accounts.length, transactions: txCount, investments: investments.length };
}

/** Sincroniza todos os itens (um por transação, para um banco com erro não travar os outros). */
export async function syncAllItems(
  withAuth: <T>(fn: (db: PoolClient) => Promise<T>) => Promise<T>,
  opts: { refresh?: boolean; onlyId?: string; full?: boolean } = {},
): Promise<ItemSync[]> {
  const envIds = (process.env.PLUGGY_ITEM_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ids = await withAuth(async (db) => {
    for (const id of envIds) {
      await db.query(`INSERT INTO fin_items (id) VALUES ($1) ON CONFLICT DO NOTHING`, [id]);
    }
    const { rows } = await db.query(`SELECT id FROM fin_items ORDER BY created_at`);
    return rows.map((r) => String(r.id));
  });
  const targets = opts.onlyId ? ids.filter((id) => id === opts.onlyId) : ids;
  const results: ItemSync[] = [];
  for (const id of targets) {
    try {
      if (opts.refresh) {
        // Pede ao banco dados novos; o sync abaixo já traz o que existir
        await pluggy(`/items/${encodeURIComponent(id)}`, { method: "PATCH", body: {} }).catch(() => null);
      }
      results.push(await withAuth((db) => syncItem(db, id, { full: opts.full })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await withAuth((db) => db.query(`UPDATE fin_items SET error = $2 WHERE id = $1`, [id, msg.slice(0, 500)])).catch(() => null);
      results.push({ itemId: id, accounts: 0, transactions: 0, investments: 0, error: msg });
    }
  }
  return results;
}
