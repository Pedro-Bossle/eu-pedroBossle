-- CRM: status/etiquetas do cliente, tarefas e follow-ups, histórico de interações.
-- Seguro para rodar mais de uma vez. Rode depois do 012.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS next_contact_at date,
  ADD COLUMN IF NOT EXISTS monthly_value numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_chk;
ALTER TABLE clients ADD CONSTRAINT clients_status_chk
  CHECK (status IN ('lead', 'ativo', 'recorrente', 'pausado', 'encerrado'));

-- Tarefas e follow-ups (podem apontar para cliente, proposta ou lead do funil)
CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'tarefa',
  priority smallint NOT NULL DEFAULT 1,
  due_at timestamptz,
  all_day boolean NOT NULL DEFAULT true,
  done_at timestamptz,
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id text REFERENCES proposals(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES prospect_leads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_kind_chk;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_kind_chk
  CHECK (kind IN ('tarefa', 'follow-up', 'reuniao', 'ligacao', 'entrega', 'cobranca'));
ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_priority_chk;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_priority_chk CHECK (priority BETWEEN 0 AND 2);
CREATE INDEX IF NOT EXISTS crm_tasks_open_idx ON crm_tasks (due_at) WHERE done_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_client_idx ON crm_tasks (client_id);

-- Histórico de interações com o cliente
CREATE TABLE IF NOT EXISTS crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  body text NOT NULL DEFAULT '',
  at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_kind_chk;
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_kind_chk
  CHECK (kind IN ('nota', 'ligacao', 'reuniao', 'email', 'whatsapp', 'pagamento', 'entrega'));
CREATE INDEX IF NOT EXISTS crm_activities_client_idx ON crm_activities (client_id, at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_tasks','crm_activities'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_auth', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (current_setting(''app.authenticated'', true) = ''true'') WITH CHECK (current_setting(''app.authenticated'', true) = ''true'')',
      t || '_auth', t);
  END LOOP;
END $$;
