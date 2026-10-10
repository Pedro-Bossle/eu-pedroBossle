-- Painel de orçamentos · Neon Postgres
-- Execute no SQL Editor do Neon (ou: npm run db:migrate com DATABASE_URL).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  session_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposals (
  id text PRIMARY KEY,
  client_id text REFERENCES clients (id) ON DELETE SET NULL,
  company text NOT NULL DEFAULT '',
  validity integer NOT NULL DEFAULT 7,
  version text NOT NULL DEFAULT '1',
  idea text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT '',
  timeline text NOT NULL DEFAULT '',
  total numeric(12, 2) NOT NULL DEFAULT 0,
  manual_total boolean NOT NULL DEFAULT false,
  payment text NOT NULL DEFAULT '',
  needs text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Em elaboração',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  linkedin text NOT NULL DEFAULT '',
  portfolio text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO profile (id, name, title, email, linkedin, portfolio)
VALUES (
  1,
  'Pedro Bossle',
  'Desenvolvedor Web',
  'pedro.bossle.s@gmail.com',
  'https://www.linkedin.com/in/pedro-bossle-sandi-685625277/',
  'https://dev-bossle.vercel.app/'
)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS proposals_client_id_idx ON proposals (client_id);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals (created_at DESC);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients (name);

-- Login: bypass RLS via SECURITY DEFINER (nunca expõe a tabela inteira ao cliente).
-- session_version / retorno completo: ver 006 (DROP+CREATE para mudar OUT params).
DROP FUNCTION IF EXISTS public.get_user_auth(text);
CREATE FUNCTION public.get_user_auth(p_username text)
RETURNS TABLE (id uuid, username text, password_hash text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.username, u.password_hash
  FROM app_users u
  WHERE lower(u.username) = lower(p_username)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_auth(text) TO PUBLIC;

-- Bootstrap admin (SECURITY DEFINER: não depende de app.authenticated).
CREATE OR REPLACE FUNCTION public.bootstrap_admin(
  p_username text,
  p_password_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM app_users) > 0 THEN
    RETURN 'exists';
  END IF;
  INSERT INTO app_users (username, password_hash)
  VALUES (p_username, p_password_hash);
  RETURN 'created';
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_admin(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin(text, text) TO PUBLIC;

-- ---------------------------------------------------------------------------
-- RLS: API autentica e faz set_config('app.authenticated', 'true', true)
-- ---------------------------------------------------------------------------

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;

ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;
ALTER TABLE proposals FORCE ROW LEVEL SECURITY;
ALTER TABLE profile FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_users_auth ON app_users;
DROP POLICY IF EXISTS clients_auth ON clients;
DROP POLICY IF EXISTS proposals_auth ON proposals;
DROP POLICY IF EXISTS profile_auth ON profile;

CREATE POLICY app_users_auth ON app_users
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

CREATE POLICY clients_auth ON clients
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

CREATE POLICY proposals_auth ON proposals
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

CREATE POLICY profile_auth ON profile
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');
