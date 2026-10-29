-- Funil de prospecção: etapas, saídas, pontuação, histórico e tokens dos bots.
-- Seguro para rodar mais de uma vez. Rode depois do 008.

-- 1) Novas colunas no lead
ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'encontrado',
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS exit_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS score integer,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS phone_sources text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS site_check text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS activity text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detail text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'landing',
  ADD COLUMN IF NOT EXISTS followup_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS followup_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_text text NOT NULL DEFAULT '';

-- Etapas (1–8) e saídas do funil. "resultado" usa result = fechado | perdido.
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_stage_chk;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_stage_chk CHECK (stage IN (
  'encontrado','aguardando','aprovado','enviado','followup','respondeu','proposta','resultado',
  'descartado','banco_b','revisar','nao_contatar','sem_resposta','invalido'
));
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_result_chk;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_result_chk
  CHECK (result IN ('', 'fechado', 'perdido'));
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_score_chk;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_score_chk
  CHECK (score IS NULL OR score BETWEEN 0 AND 100);
ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_project_type_chk;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_project_type_chk
  CHECK (project_type IN ('landing', 'sistema'));

-- Leads antigos: deriva a etapa do par enviado/respondeu (só se ainda estiverem no padrão)
UPDATE prospect_leads SET
  stage = CASE WHEN replied THEN 'respondeu' WHEN sent THEN 'enviado' ELSE 'encontrado' END,
  stage_changed_at = COALESCE(replied_at, sent_at, created_at)
WHERE stage = 'encontrado' AND (sent OR replied);

CREATE INDEX IF NOT EXISTS prospect_leads_stage_idx
  ON prospect_leads (stage, stage_changed_at DESC);

-- Mesmo WhatsApp = mesmo negócio (evita contato duplicado mesmo com nome escrito diferente)
CREATE INDEX IF NOT EXISTS prospect_leads_whatsapp_idx
  ON prospect_leads (regexp_replace(whatsapp, '\D', '', 'g'))
  WHERE whatsapp <> '';

-- 2) Histórico de cada mudança de etapa
CREATE TABLE IF NOT EXISTS prospect_events (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES prospect_leads(id) ON DELETE CASCADE,
  from_stage text NOT NULL DEFAULT '',
  to_stage text NOT NULL,
  actor text NOT NULL,          -- 'pedro' | 'bot:dev-bossle' | 'bot:whatsapp'
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospect_events_lead_idx
  ON prospect_events (lead_id, created_at DESC);

ALTER TABLE prospect_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS prospect_events_auth ON prospect_events;
CREATE POLICY prospect_events_auth ON prospect_events
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

-- 3) Tokens dos bots (só o hash SHA-256 fica no banco)
CREATE TABLE IF NOT EXISTS bot_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('prospector', 'executor')),
  token_hash text NOT NULL UNIQUE,
  last4 text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

ALTER TABLE bot_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bot_tokens_auth ON bot_tokens;
CREATE POLICY bot_tokens_auth ON bot_tokens
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
