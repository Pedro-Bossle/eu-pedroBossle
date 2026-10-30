-- Dados que alimentam a nota do lead (recalculada ao editar o card).
-- Seguro para rodar mais de uma vez. Rode depois do 009.

ALTER TABLE prospect_leads
  ADD COLUMN IF NOT EXISTS reviews_count integer,
  ADD COLUMN IF NOT EXISTS last_review_at date,
  ADD COLUMN IF NOT EXISTS followers integer,
  ADD COLUMN IF NOT EXISTS last_post_at date,
  ADD COLUMN IF NOT EXISTS invest_level smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS competitor_site boolean NOT NULL DEFAULT false;

ALTER TABLE prospect_leads DROP CONSTRAINT IF EXISTS prospect_leads_invest_chk;
ALTER TABLE prospect_leads ADD CONSTRAINT prospect_leads_invest_chk
  CHECK (invest_level BETWEEN 0 AND 3);
