-- Dados opcionais para contrato (cliente e prestador)

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS legal_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS document text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

UPDATE profile
SET
  document = COALESCE(NULLIF(document, ''), '053.545.380-92'),
  address = COALESCE(
    NULLIF(address, ''),
    'Rua Santo Dalfovo, 440, Panazzolo, Caxias do Sul – RS'
  )
WHERE id = 1;
