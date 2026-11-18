-- Tarefas recorrentes: ao concluir, a API cria a próxima ocorrência.
-- Seguro para rodar mais de uma vez. Rode depois do 014.

ALTER TABLE crm_tasks
  ADD COLUMN IF NOT EXISTS repeat text NOT NULL DEFAULT 'none';

ALTER TABLE crm_tasks DROP CONSTRAINT IF EXISTS crm_tasks_repeat_chk;
ALTER TABLE crm_tasks ADD CONSTRAINT crm_tasks_repeat_chk
  CHECK (repeat IN ('none', 'daily', 'weekdays', 'weekly', 'monthly'));
