-- Aprendizado do funil: relatórios semanais e guia de comunicação dos bots.
-- Seguro para rodar mais de uma vez. Rode depois do 021.

-- Relatório semanal (semana = segunda a domingo, horário de Brasília).
-- O markdown fica só aqui e é baixado pela tela; nada vai para o repositório.
CREATE TABLE IF NOT EXISTS prospect_learning_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  week_end date NOT NULL,
  markdown text NOT NULL DEFAULT '',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- gerando | ok | sem_chave | erro
  ai_status text NOT NULL DEFAULT 'gerando',
  ai_error text NOT NULL DEFAULT '',
  generated_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_learning_reports_week_idx
  ON prospect_learning_reports (week_start DESC);

-- Guia de comunicação: a IA propõe, o Pedro aprova. Só a versão aprovada chega aos bots.
CREATE TABLE IF NOT EXISTS prospect_guide (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  -- proposto | aprovado | recusado | substituido
  status text NOT NULL DEFAULT 'proposto',
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_id uuid REFERENCES prospect_learning_reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
ALTER TABLE prospect_guide DROP CONSTRAINT IF EXISTS prospect_guide_status_chk;
ALTER TABLE prospect_guide ADD CONSTRAINT prospect_guide_status_chk
  CHECK (status IN ('proposto', 'aprovado', 'recusado', 'substituido'));
CREATE INDEX IF NOT EXISTS prospect_guide_status_idx
  ON prospect_guide (status, decided_at DESC, created_at DESC);

ALTER TABLE prospect_learning_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_learning_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prospect_learning_reports_auth ON prospect_learning_reports;
CREATE POLICY prospect_learning_reports_auth ON prospect_learning_reports
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

ALTER TABLE prospect_guide ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_guide FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prospect_guide_auth ON prospect_guide;
CREATE POLICY prospect_guide_auth ON prospect_guide
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
