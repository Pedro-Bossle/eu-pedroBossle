-- Webhooks da Meta (Instagram): registro dos eventos recebidos em /webhooks/meta.
-- A API mantém só os 200 mais recentes. Seguro para rodar mais de uma vez. Rode depois do 019.

CREATE TABLE IF NOT EXISTS meta_webhook_events (
  id bigserial PRIMARY KEY,
  object text NOT NULL DEFAULT '',
  field text NOT NULL DEFAULT '',
  entry_id text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text NOT NULL DEFAULT '',
  received_at timestamptz NOT NULL DEFAULT now()
);
-- Se a tabela já existia com outro formato, completa as colunas que a API usa
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS object text NOT NULL DEFAULT '';
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS field text NOT NULL DEFAULT '';
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS entry_id text NOT NULL DEFAULT '';
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS error text NOT NULL DEFAULT '';
ALTER TABLE meta_webhook_events ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS meta_webhook_events_received_idx ON meta_webhook_events (received_at DESC);

ALTER TABLE meta_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_webhook_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_webhook_events_auth ON meta_webhook_events;
CREATE POLICY meta_webhook_events_auth ON meta_webhook_events
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
