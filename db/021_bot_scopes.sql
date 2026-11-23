-- Permissões por chave de API dos bots + texto original do bot nos leads.
-- Seguro para rodar mais de uma vez. Rode depois do 020.

-- Cada chave libera um ou mais grupos: funil, mensagens, instagram
ALTER TABLE bot_tokens ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}';
UPDATE bot_tokens SET scopes = ARRAY['funil'] WHERE scopes = '{}' AND role = 'prospector';
UPDATE bot_tokens SET scopes = ARRAY['mensagens'] WHERE scopes = '{}' AND role = 'executor';

-- O papel antigo vira opcional (chaves só de Instagram não têm papel no funil)
ALTER TABLE bot_tokens ALTER COLUMN role DROP NOT NULL;
ALTER TABLE bot_tokens DROP CONSTRAINT IF EXISTS bot_tokens_role_check;
ALTER TABLE bot_tokens ADD CONSTRAINT bot_tokens_role_check
  CHECK (role IS NULL OR role IN ('prospector', 'executor'));

-- Mensagem como o bot escreveu, para comparar com a versão que Pedro aprovou
ALTER TABLE prospect_leads ADD COLUMN IF NOT EXISTS bot_message text NOT NULL DEFAULT '';
UPDATE prospect_leads SET bot_message = message
  WHERE bot_message = '' AND source = 'bot' AND stage IN ('encontrado', 'aguardando', 'revisar');
