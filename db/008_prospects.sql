-- Prospecção: leads de negócios locais (cadastro manual ou importação).
-- integration_settings é legado (integração com Gemini removida); pode ficar vazia.

CREATE TABLE IF NOT EXISTS prospect_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  niche text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  neighborhood text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  problems text NOT NULL DEFAULT '',
  pitch text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  maps_url text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'manual',
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  replied boolean NOT NULL DEFAULT false,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Mesmo nome + cidade = mesmo lead (importações e buscas atualizam em vez de duplicar)
CREATE UNIQUE INDEX IF NOT EXISTS prospect_leads_name_city_uidx
  ON prospect_leads (lower(name), lower(city));

CREATE INDEX IF NOT EXISTS prospect_leads_created_at_idx
  ON prospect_leads (created_at DESC);

ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prospect_leads_auth ON prospect_leads;
CREATE POLICY prospect_leads_auth ON prospect_leads
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

CREATE TABLE IF NOT EXISTS integration_settings (
  provider text PRIMARY KEY,
  api_key_enc text NOT NULL DEFAULT '',
  api_key_last4 text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integration_settings_auth ON integration_settings;
CREATE POLICY integration_settings_auth ON integration_settings
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
