-- Instagram (API da Meta): credencial, biblioteca de mídia, comentários (CRM) e posts agendados.
-- Seguro para rodar mais de uma vez. Rode depois do 010.

-- Credenciais de integrações (token criptografado com AES-256-GCM pela API)
CREATE TABLE IF NOT EXISTS integration_credentials (
  provider text PRIMARY KEY,
  secret_enc text NOT NULL DEFAULT '',
  last4 text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Biblioteca: posts já publicados no perfil (sincronizados) + métricas
CREATE TABLE IF NOT EXISTS ig_media (
  id text PRIMARY KEY,
  caption text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT '',
  media_product_type text NOT NULL DEFAULT '',
  media_url text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '',
  permalink text NOT NULL DEFAULT '',
  posted_at timestamptz,
  like_count integer,
  comments_count integer,
  reach integer,
  views integer,
  saved integer,
  shares integer,
  insights_at timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ig_media_posted_idx ON ig_media (posted_at DESC);

-- Comentários: inbox com status para não deixar ninguém sem resposta
CREATE TABLE IF NOT EXISTS ig_comments (
  id text PRIMARY KEY,
  media_id text NOT NULL REFERENCES ig_media(id) ON DELETE CASCADE,
  parent_id text,
  username text NOT NULL DEFAULT '',
  text text NOT NULL DEFAULT '',
  posted_at timestamptz,
  from_me boolean NOT NULL DEFAULT false,
  hidden boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'novo',
  synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ig_comments DROP CONSTRAINT IF EXISTS ig_comments_status_chk;
ALTER TABLE ig_comments ADD CONSTRAINT ig_comments_status_chk
  CHECK (status IN ('novo', 'respondido', 'arquivado'));
CREATE INDEX IF NOT EXISTS ig_comments_status_idx ON ig_comments (status, posted_at DESC);
CREATE INDEX IF NOT EXISTS ig_comments_media_idx ON ig_comments (media_id, posted_at);

-- Posts criados no painel: rascunho → agendado → publicando → publicado | erro
CREATE TABLE IF NOT EXISTS ig_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'image',
  caption text NOT NULL DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}',
  cover_url text NOT NULL DEFAULT '',
  share_to_feed boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'rascunho',
  container_id text NOT NULL DEFAULT '',
  child_ids text[] NOT NULL DEFAULT '{}',
  published_media_id text NOT NULL DEFAULT '',
  permalink text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  attempts integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ig_posts DROP CONSTRAINT IF EXISTS ig_posts_kind_chk;
ALTER TABLE ig_posts ADD CONSTRAINT ig_posts_kind_chk
  CHECK (kind IN ('image', 'carousel', 'reel', 'story'));
ALTER TABLE ig_posts DROP CONSTRAINT IF EXISTS ig_posts_status_chk;
ALTER TABLE ig_posts ADD CONSTRAINT ig_posts_status_chk
  CHECK (status IN ('rascunho', 'agendado', 'publicando', 'publicado', 'erro'));
CREATE INDEX IF NOT EXISTS ig_posts_due_idx ON ig_posts (status, scheduled_at);

ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_credentials_auth ON integration_credentials;
CREATE POLICY integration_credentials_auth ON integration_credentials
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

ALTER TABLE ig_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_media FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ig_media_auth ON ig_media;
CREATE POLICY ig_media_auth ON ig_media
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

ALTER TABLE ig_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_comments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ig_comments_auth ON ig_comments;
CREATE POLICY ig_comments_auth ON ig_comments
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

ALTER TABLE ig_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ig_posts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ig_posts_auth ON ig_posts;
CREATE POLICY ig_posts_auth ON ig_posts
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
