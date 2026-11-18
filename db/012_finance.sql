-- Finanças pessoais (Pluggy): conexões, contas, transações, investimentos, regras e orçamentos.
-- Seguro para rodar mais de uma vez. Rode depois do 011.

CREATE TABLE IF NOT EXISTS fin_items (
  id text PRIMARY KEY,                    -- itemId da Pluggy (Meu Pluggy → Copiar Item ID)
  connector_name text NOT NULL DEFAULT '',
  connector_image text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '',
  execution_status text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  bank_updated_at timestamptz,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_accounts (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES fin_items(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',          -- BANK | CREDIT
  subtype text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  number text NOT NULL DEFAULT '',
  balance numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  credit_limit numeric(14,2),
  available_credit numeric(14,2),
  bill_due_date date,
  hidden boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- amount: negativo = saída, positivo = entrada (normalizado a partir do type DEBIT/CREDIT)
CREATE TABLE IF NOT EXISTS fin_transactions (
  id text PRIMARY KEY,
  account_id text NOT NULL REFERENCES fin_accounts(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  pluggy_category text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',      -- categoria efetiva (regra/manual > Pluggy)
  category_manual boolean NOT NULL DEFAULT false,
  merchant text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'POSTED',
  ignored boolean NOT NULL DEFAULT false, -- transferências entre contas, pagamento de fatura…
  notes text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_transactions_date_idx ON fin_transactions (date DESC);
CREATE INDEX IF NOT EXISTS fin_transactions_account_idx ON fin_transactions (account_id, date DESC);

CREATE TABLE IF NOT EXISTS fin_investments (
  id text PRIMARY KEY,
  item_id text NOT NULL REFERENCES fin_items(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  subtype text NOT NULL DEFAULT '',
  balance numeric(14,2) NOT NULL DEFAULT 0,
  amount_original numeric(14,2),
  annual_rate numeric(10,4),
  due_date date,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- Regras: descrição contém `pattern` → categoria (e/ou ignorar)
CREATE TABLE IF NOT EXISTS fin_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL,
  category text NOT NULL DEFAULT '',
  ignore boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fin_budgets (
  category text PRIMARY KEY,
  monthly_limit numeric(14,2) NOT NULL CHECK (monthly_limit >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fin_items','fin_accounts','fin_transactions','fin_investments','fin_rules','fin_budgets'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_auth', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (current_setting(''app.authenticated'', true) = ''true'') WITH CHECK (current_setting(''app.authenticated'', true) = ''true'')',
      t || '_auth', t);
  END LOOP;
END $$;
