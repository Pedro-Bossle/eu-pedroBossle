-- Invalida sessões JWT ao redefinir senha (claim sv no token).

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.get_user_auth(text);

CREATE FUNCTION public.get_user_auth(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  password_hash text,
  session_version integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.username, u.password_hash, u.session_version
  FROM app_users u
  WHERE lower(u.username) = lower(p_username)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_auth(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.get_session_version(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT u.session_version FROM app_users u WHERE u.id = p_user_id LIMIT 1),
    -1
  );
$$;

REVOKE ALL ON FUNCTION public.get_session_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_session_version(uuid) TO PUBLIC;

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
  SET
    password_hash = p_password_hash,
    session_version = session_version + 1
  WHERE id = v_user_id;

  UPDATE password_reset_tokens
  SET used_at = now()
  WHERE id = v_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.consume_password_reset_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(text, text) TO PUBLIC;
