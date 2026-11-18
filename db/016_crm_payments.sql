-- Cobranças / a receber: parcelas por cliente (opcionalmente ligadas a uma proposta).
-- Seguro para rodar mais de uma vez. Rode depois do 015.

CREATE TABLE IF NOT EXISTS crm_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  proposal_id text REFERENCES proposals(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  method text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_payments_open_idx ON crm_payments (due_date) WHERE paid_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_payments_client_idx ON crm_payments (client_id, due_date);

ALTER TABLE crm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_payments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_payments_auth ON crm_payments;
CREATE POLICY crm_payments_auth ON crm_payments
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
