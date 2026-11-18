-- Índices para as consultas do dia a dia (Hoje, Agenda, contadores, busca, finanças).
-- Seguro para rodar mais de uma vez. Rode depois do 017.

CREATE INDEX IF NOT EXISTS crm_tasks_done_idx ON crm_tasks (done_at) WHERE done_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_proposal_idx ON crm_tasks (proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_payments_paid_idx ON crm_payments (paid_at) WHERE paid_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_projects_client_idx ON crm_projects (client_id);
CREATE INDEX IF NOT EXISTS crm_projects_due_idx ON crm_projects (due_date) WHERE stage NOT IN ('publicado', 'pausado');
CREATE INDEX IF NOT EXISTS clients_next_contact_idx ON clients (next_contact_at) WHERE next_contact_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS proposals_client_idx ON proposals (client_id);
CREATE INDEX IF NOT EXISTS contact_leads_unread_idx ON contact_leads (created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS ig_posts_published_idx ON ig_posts (published_at) WHERE published_at IS NOT NULL;

-- Busca por trecho de texto (Ctrl+K e filtros): trigramas
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS prospect_leads_name_trgm ON prospect_leads USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS fin_transactions_desc_trgm ON fin_transactions USING gin (description gin_trgm_ops);
