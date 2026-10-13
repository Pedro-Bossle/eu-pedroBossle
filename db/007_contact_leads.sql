-- Leads do formulário público (Home → Como me contratar)

CREATE TABLE IF NOT EXISTS contact_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  idea text NOT NULL,
  style text NOT NULL DEFAULT '',
  style_id text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_leads_created_at_idx
  ON contact_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS contact_leads_email_idx
  ON contact_leads (email);

ALTER TABLE contact_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_leads_auth ON contact_leads;
CREATE POLICY contact_leads_auth ON contact_leads
  FOR ALL
  USING (current_setting('app.authenticated', true) = 'true')
  WITH CHECK (current_setting('app.authenticated', true) = 'true');

-- Insert público via SECURITY DEFINER (sem abrir RLS genérico)
CREATE OR REPLACE FUNCTION public.public_insert_contact_lead(
  p_name text,
  p_email text,
  p_idea text,
  p_style text,
  p_style_id text,
  p_ip text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'nome inválido';
  END IF;
  IF p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email inválido';
  END IF;
  IF length(trim(p_idea)) < 8 THEN
    RAISE EXCEPTION 'ideia inválida';
  END IF;

  INSERT INTO contact_leads (name, email, idea, style, style_id, ip)
  VALUES (
    left(trim(p_name), 120),
    lower(left(trim(p_email), 200)),
    left(trim(p_idea), 4000),
    left(trim(coalesce(p_style, '')), 80),
    left(trim(coalesce(p_style_id, '')), 80),
    left(trim(coalesce(p_ip, '')), 80)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_insert_contact_lead(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_insert_contact_lead(text, text, text, text, text, text) TO PUBLIC;
