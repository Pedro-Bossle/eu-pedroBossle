-- Presets de texto para seções do orçamento

CREATE TABLE IF NOT EXISTS text_presets (
  id text PRIMARY KEY,
  section text NOT NULL CHECK (
    section IN ('timeline', 'payment', 'needs', 'notes')
  ),
  name text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS text_presets_section_idx
  ON text_presets (section, name ASC);

ALTER TABLE text_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_presets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS text_presets_auth ON text_presets;
CREATE POLICY text_presets_auth ON text_presets
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
