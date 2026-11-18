-- Regras do funil editáveis no painel (área de cidades e lead com site ruim).
-- Seguro para rodar mais de uma vez. Rode depois do 018.

CREATE TABLE IF NOT EXISTS prospect_rules (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- Cidades aceitas para leads dos bots; vazio = qualquer cidade.
  cities text[] NOT NULL DEFAULT '{}',
  -- Aceita lead com site (fora do ar, com erro, modelo pronto…) desde que a checagem descreva o problema.
  allow_website boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO prospect_rules (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE prospect_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prospect_rules_auth ON prospect_rules;
CREATE POLICY prospect_rules_auth ON prospect_rules
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
