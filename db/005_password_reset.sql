-- Redefinição de senha do admin (e-mail = profile.email)

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON password_reset_tokens (user_id);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_reset_tokens_auth ON password_reset_tokens;
CREATE POLICY password_reset_tokens_auth ON password_reset_tokens
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

-- Alvo do reset: único admin + e-mail de Meus dados
CREATE OR REPLACE FUNCTION public.get_password_reset_target()
RETURNS TABLE (user_id uuid, username text, email text, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.username, trim(both FROM coalesce(p.email, '')), coalesce(p.name, '')
  FROM app_users u
  CROSS JOIN profile p
  WHERE p.id = 1
  ORDER BY u.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_password_reset_target() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_password_reset_target() TO PUBLIC;

-- Invalida tokens antigos e cria um novo
CREATE OR REPLACE FUNCTION public.create_password_reset_token(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE password_reset_tokens
  SET used_at = coalesce(used_at, now())
  WHERE user_id = p_user_id
    AND used_at IS NULL;

  INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, p_expires_at);
END;
$$;

REVOKE ALL ON FUNCTION public.create_password_reset_token(uuid, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_password_reset_token(uuid, text, timestamptz) TO PUBLIC;

-- Consome token e atualiza senha
CREATE OR REPLACE FUNCTION public.consume_password_reset_token(
  p_token_hash text,
  p_password_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_user_id uuid;
  v_expires timestamptz;
  v_used timestamptz;
BEGIN
  SELECT t.id, t.user_id, t.expires_at, t.used_at
  INTO v_id, v_user_id, v_expires, v_used
  FROM password_reset_tokens t
  WHERE t.token_hash = p_token_hash
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN 'invalid';
  END IF;
  IF v_used IS NOT NULL THEN
    RETURN 'used';
  END IF;
  IF v_expires < now() THEN
    RETURN 'expired';
  END IF;

  UPDATE app_users
  SET password_hash = p_password_hash
  WHERE id = v_user_id;

  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = v_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_password_reset_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(text, text) TO PUBLIC;
