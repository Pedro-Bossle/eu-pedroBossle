-- Automações do CRM ao mudar o status de uma proposta (vale para painel, envio e decisão do cliente).
-- Enviado  → cria follow-up em 3 dias (se ainda não houver um aberto para a proposta)
-- Aprovado → cliente vira "ativo", tarefa de kickoff/cobrança da entrada e registro no histórico
-- Recusado → fecha follow-ups abertos da proposta e registra no histórico
-- Seguro para rodar mais de uma vez. Rode depois do 013.

CREATE OR REPLACE FUNCTION crm_on_proposal_status() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  prev_auth text := current_setting('app.authenticated', true);
  label text := COALESCE(NULLIF(NEW.company, ''), 'orçamento');
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  -- Em INSERT só o envio conta: importar seed/backup com propostas aprovadas não pode
  -- recriar kickoff, histórico e projeto a cada importação.
  IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'Enviado' THEN
    RETURN NEW;
  END IF;

  -- As tabelas do CRM têm RLS: libera só durante esta automação e restaura depois
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

DROP TRIGGER IF EXISTS proposals_crm_status ON proposals;
CREATE TRIGGER proposals_crm_status
  AFTER INSERT OR UPDATE OF status ON proposals
  FOR EACH ROW EXECUTE FUNCTION crm_on_proposal_status();
