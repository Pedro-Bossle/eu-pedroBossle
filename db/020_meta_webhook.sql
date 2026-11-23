-- Eventos recebidos no webhook da Meta (Instagram). Serve para conferir no painel que a Meta está chamando.
-- Seguro para rodar mais de uma vez. Rode depois do 019.

CREATE TABLE IF NOT EXISTS meta_webhook_events (
  id bigserial PRIMARY KEY,
  object text NOT NULL DEFAULT '',
  field text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meta_webhook_events_created_idx ON meta_webhook_events (created_at DESC);

ALTER TABLE meta_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_webhook_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meta_webhook_events_auth ON meta_webhook_events;
CREATE POLICY meta_webhook_events_auth ON meta_webhook_events
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
