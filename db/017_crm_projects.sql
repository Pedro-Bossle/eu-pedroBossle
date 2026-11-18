-- Projetos/entregas: acompanhamento do que foi vendido, por etapa.
-- Ao aprovar uma proposta, o projeto nasce em "briefing" (gatilho de 014 atualizado aqui).
-- Seguro para rodar mais de uma vez. Rode depois do 016.

CREATE TABLE IF NOT EXISTS crm_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text REFERENCES clients(id) ON DELETE SET NULL,
  proposal_id text UNIQUE REFERENCES proposals(id) ON DELETE SET NULL,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'briefing',
  due_date date,
  value numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  stage_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE crm_projects DROP CONSTRAINT IF EXISTS crm_projects_stage_chk;
ALTER TABLE crm_projects ADD CONSTRAINT crm_projects_stage_chk
  CHECK (stage IN ('briefing', 'layout', 'desenvolvimento', 'revisao', 'publicado', 'pausado'));
CREATE INDEX IF NOT EXISTS crm_projects_stage_idx ON crm_projects (stage, due_date);

ALTER TABLE crm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_projects_auth ON crm_projects;
CREATE POLICY crm_projects_auth ON crm_projects
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

-- Gatilho de proposta: além do que o 014 já fazia, cria o projeto ao aprovar.
CREATE OR REPLACE FUNCTION crm_on_proposal_status() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  prev_auth text := current_setting('app.authenticated', true);
  label text := COALESCE(NULLIF(NEW.company, ''), 'orçamento');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.authenticated', 'true', true);

  IF NEW.status = 'Enviado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM crm_tasks WHERE proposal_id = NEW.id AND kind = 'follow-up' AND done_at IS NULL
    ) THEN
      INSERT INTO crm_tasks (title, kind, priority, due_at, all_day, client_id, proposal_id, notes)
      VALUES ('Follow-up: ' || label, 'follow-up', 1, now() + interval '3 days', true, NEW.client_id, NEW.id,
              'Criada automaticamente quando a proposta foi enviada.');
    END IF;

  ELSIF NEW.status = 'Aprovado' THEN
    UPDATE crm_tasks SET done_at = now(), updated_at = now()
      WHERE proposal_id = NEW.id AND kind = 'follow-up' AND done_at IS NULL;
    IF NEW.client_id IS NOT NULL THEN
      UPDATE clients SET status = 'ativo', updated_at = now()
        WHERE id = NEW.client_id AND status IN ('lead', 'pausado', 'encerrado');
      INSERT INTO crm_activities (client_id, kind, body)
        VALUES (NEW.client_id, 'nota', 'Proposta aprovada: ' || label || ' (R$ ' ||
          translate(to_char(NEW.total, 'FM999,999,990.00'), ',.', '.,') || ').');
    END IF;
    INSERT INTO crm_tasks (title, kind, priority, due_at, all_day, client_id, proposal_id, notes)
    VALUES ('Kickoff e cobrança da entrada: ' || label, 'cobranca', 2, now() + interval '1 day', true, NEW.client_id, NEW.id,
            'Criada automaticamente quando a proposta foi aprovada.');
    INSERT INTO crm_projects (client_id, proposal_id, title, value)
    VALUES (NEW.client_id, NEW.id, label, NEW.total)
    ON CONFLICT (proposal_id) DO NOTHING;

  ELSIF NEW.status = 'Recusado' THEN
    UPDATE crm_tasks SET done_at = now(), updated_at = now()
      WHERE proposal_id = NEW.id AND kind = 'follow-up' AND done_at IS NULL;
    IF NEW.client_id IS NOT NULL THEN
      INSERT INTO crm_activities (client_id, kind, body)
        VALUES (NEW.client_id, 'nota', 'Proposta recusada: ' || label || '.');
    END IF;
  END IF;

  PERFORM set_config('app.authenticated', COALESCE(prev_auth, ''), true);
  RETURN NEW;
END
$fn$;

-- Propostas já aprovadas antes desta migration viram projetos "publicado" (histórico)
DO $$
BEGIN
  PERFORM set_config('app.authenticated', 'true', true);
  INSERT INTO crm_projects (client_id, proposal_id, title, value, stage)
  SELECT p.client_id, p.id, COALESCE(NULLIF(p.company, ''), 'Projeto'), p.total, 'publicado'
  FROM proposals p WHERE p.status = 'Aprovado'
  ON CONFLICT (proposal_id) DO NOTHING;
END $$;
