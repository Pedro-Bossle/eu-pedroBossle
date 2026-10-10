-- Link público de proposta: token + senha, comentários e decisão do cliente

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS share_token text,
  ADD COLUMN IF NOT EXISTS share_password_hash text,
  ADD COLUMN IF NOT EXISTS share_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_decision_note text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS proposals_share_token_uidx
  ON proposals (share_token)
  WHERE share_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS proposal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id text NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  author text NOT NULL CHECK (author IN ('client', 'admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_comments_proposal_id_idx
  ON proposal_comments (proposal_id, created_at ASC);

ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proposal_comments_auth ON proposal_comments;
CREATE POLICY proposal_comments_auth ON proposal_comments
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

-- ---------------------------------------------------------------------------
-- Acesso público via SECURITY DEFINER (não abre RLS genérico)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_get_share_auth(p_token text)
RETURNS TABLE (
  proposal_id text,
  share_password_hash text,
  share_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.share_password_hash, p.share_enabled
  FROM proposals p
  WHERE p.share_token = p_token
    AND p.share_enabled = true
    AND p.share_password_hash IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.public_get_share_auth(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_share_auth(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.public_get_proposal_payload(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', p.id,
      'company', p.company,
      'validity', p.validity,
      'version', p.version,
      'idea', p.idea,
      'scope', p.scope,
      'timeline', p.timeline,
      'total', p.total,
      'manualTotal', p.manual_total,
      'payment', p.payment,
      'needs', p.needs,
      'notes', p.notes,
      'status', p.status,
      'items', p.items,
      'links', p.links,
      'created', p.created_at,
      'clientDecidedAt', p.client_decided_at,
      'clientDecisionNote', p.client_decision_note
    ),
    'client', CASE
      WHEN c.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'name', c.name,
        'company', c.company
      )
    END,
    'profile', (
      SELECT jsonb_build_object(
        'name', pr.name,
        'title', pr.title,
        'phone', pr.phone,
        'email', pr.email,
        'linkedin', pr.linkedin,
        'portfolio', pr.portfolio
      )
      FROM profile pr
      WHERE pr.id = 1
    ),
    'comments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'author', cm.author,
          'body', cm.body,
          'created', cm.created_at
        )
        ORDER BY cm.created_at ASC
      )
      FROM proposal_comments cm
      WHERE cm.proposal_id = p.id
    ), '[]'::jsonb)
  )
  INTO result
  FROM proposals p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.share_token = p_token
    AND p.share_enabled = true;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_proposal_payload(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_proposal_payload(text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.public_add_comment(
  p_token text,
  p_author text,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid text;
  row_out proposal_comments%ROWTYPE;
BEGIN
  IF p_author NOT IN ('client', 'admin') THEN
    RAISE EXCEPTION 'author inválido';
  END IF;
  IF trim(p_body) = '' THEN
    RAISE EXCEPTION 'comentário vazio';
  END IF;

  SELECT p.id INTO pid
  FROM proposals p
  WHERE p.share_token = p_token
    AND p.share_enabled = true;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'proposta não encontrada';
  END IF;

  INSERT INTO proposal_comments (proposal_id, author, body)
  VALUES (pid, p_author, trim(p_body))
  RETURNING * INTO row_out;

  RETURN jsonb_build_object(
    'id', row_out.id,
    'author', row_out.author,
    'body', row_out.body,
    'created', row_out.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_add_comment(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_add_comment(text, text, text) TO PUBLIC;

CREATE OR REPLACE FUNCTION public.public_set_decision(
  p_token text,
  p_status text,
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid text;
  current_status text;
  decided_at timestamptz;
BEGIN
  IF p_status NOT IN ('Aprovado', 'Recusado') THEN
    RAISE EXCEPTION 'status inválido';
  END IF;

  SELECT p.id, p.status, p.client_decided_at
  INTO pid, current_status, decided_at
  FROM proposals p
  WHERE p.share_token = p_token
    AND p.share_enabled = true
  FOR UPDATE;

  IF pid IS NULL THEN
    RAISE EXCEPTION 'proposta não encontrada';
  END IF;

  IF decided_at IS NOT NULL OR current_status IN ('Aprovado', 'Recusado') THEN
    RAISE EXCEPTION 'proposta já decidida';
  END IF;

  UPDATE proposals
  SET
    status = p_status,
    client_decided_at = now(),
    client_decision_note = COALESCE(trim(p_note), ''),
    updated_at = now()
  WHERE id = pid;

  IF trim(COALESCE(p_note, '')) <> '' THEN
    INSERT INTO proposal_comments (proposal_id, author, body)
    VALUES (
      pid,
      'client',
      CASE
        WHEN p_status = 'Aprovado' THEN 'Aprovou a proposta: ' || trim(p_note)
        ELSE 'Recusou a proposta: ' || trim(p_note)
      END
    );
  END IF;

  RETURN jsonb_build_object(
    'status', p_status,
    'clientDecidedAt', now(),
    'clientDecisionNote', COALESCE(trim(p_note), '')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_set_decision(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_set_decision(text, text, text) TO PUBLIC;
