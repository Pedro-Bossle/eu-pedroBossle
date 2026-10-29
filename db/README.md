# Orçamentos · Neon

## 1. Conectar Neon no projeto Vercel

1. Vercel → projeto **dev-bossle** → Storage → **Create Database** → **Neon**.
2. Confirme que `DATABASE_URL` (e variantes) foram injetadas em Production/Preview.

## 2. Variáveis de ambiente

Além do Neon, configure (Production + Preview):

| Variável | Uso |
|---|---|
| `ORCAMENTOS_SESSION_SECRET` | JWT da sessão (≥ 16 chars) |
| `ORCAMENTOS_USERNAME` | Login do admin |
| `ORCAMENTOS_PASSWORD` | Senha do admin (≥ 8) |
| `ORCAMENTOS_BOOTSTRAP_SECRET` | Header `x-bootstrap-secret` no bootstrap |
| `ORCAMENTOS_PUBLIC_URL` | Base absoluta do painel (ex. `https://orcamentos.devbossle.com.br`) — obrigatória em Production para e-mails de reset/share |
| `RESEND_API_KEY` | API key do Resend (Marketplace ou dashboard Resend) |
| `RESEND_FROM` | Remetente, ex. `Pedro Bossle <orcamentos@devbossle.com.br>` |
| `GEMINI_API_KEY` | Chave do Google AI Studio (prospecção). Só no servidor — não vai ao navegador |
| `GEMINI_MODEL` | Modelo principal: `gemini-3.8-flash` (2.5 bloqueado para projetos novos) |
| `GEMINI_FALLBACK_MODELS` | Opcional. Reserva quando o principal não tem busca liberada (padrão `gemini-2.5-flash,gemini-2.5-flash-lite`; `none` desliga) |
| `CONTACT_NOTIFY_EMAIL` | Destinatário dos leads do formulário da Home (fallback: e-mail do perfil) |

### E-mail (Resend)

1. Aceite os termos do Marketplace e instale:  
   `vercel integration add resend/resend-email --no-claim`
2. Defina `RESEND_FROM` (Production + Preview + Development).
3. Verifique o domínio em [resend.com/domains](https://resend.com/domains). Sem domínio verificado, use `onboarding@resend.dev` só para testes na conta Resend.
4. Local: `npm run dev:app` (carrega `.env` / `.env.local`) e use o botão **Enviar** no painel.
5. Redefinição de senha: login → **Esqueci a senha** (ou **Meus dados** → Segurança). O link vai para o e-mail de `profile` (Meus dados).

## 3. Schema + RLS

No SQL Editor do Neon, rode os arquivos `001`…`009` (nesta ordem), **ou**:

```bash
# com DATABASE_URL no ambiente
npm run db:migrate
```

- `002` — link público da proposta (token + senha), comentários e decisão do cliente.
- `005` — tokens de redefinição de senha do admin.
- `006` — `session_version` para invalidar JWTs após reset de senha.
- `007` — `contact_leads` (formulário da Home → inbox do painel).
- `008` — `prospect_leads` (menu **Prospecção**). `integration_settings` ficou como legado: a chave do Gemini vem do ambiente.
- `009` — funil de prospecção: etapas (`stage`), saídas com motivo, pontuação, fontes do telefone, follow-up aprovado, histórico (`prospect_events`) e tokens dos bots (`bot_tokens`, só o hash).

### Funil e bots (009)

Etapas: `encontrado` → `aguardando` → `aprovado` → `enviado` → `followup` → `respondeu` → `proposta` → `resultado` (`result` = fechado | perdido).
Saídas: `descartado`, `banco_b`, `revisar`, `nao_contatar`, `sem_resposta`, `invalido` (sempre com motivo).

Painel (sessão do Pedro):

| Rota | Uso |
|---|---|
| `PATCH /api/orcamentos/prospects/stage` | `{ id, to, note?, result?, message? }` — aprovar, recusar, proposta, fechado… |
| `GET /api/orcamentos/prospects/stage?id=` | Histórico do lead |
| `POST /api/orcamentos/prospects/followup` | `{ id, message }` — aprova o texto do follow-up |
| `GET/POST/DELETE /api/orcamentos/prospects/bot-tokens` | Cria (`{ name, role }`, token aparece uma vez), lista e revoga tokens |

Bots (`Authorization: Bearer dbb_…`):

| Rota | Bot | Uso |
|---|---|---|
| `GET /api/orcamentos/bot/leads?name=&city=&whatsapp=` | Dev Bossle (`prospector`) | Checa duplicado |
| `POST /api/orcamentos/bot/leads` | Dev Bossle | Cria/atualiza lead em `encontrado`, `aguardando` ou saída. Para `aguardando` o servidor exige: sem site, 2 fontes de telefone, `siteCheck`, nota ≥ 70 e mensagem |
| `GET /api/orcamentos/bot/queue` | Whatsapp (`executor`) | Só leads `aprovado` e follow-ups aprovados, dentro da janela (seg–sex 9h–11h30 e 14h–17h30) e do limite de 15 por dia |
| `POST /api/orcamentos/bot/move` | Os dois | `{ id, to, note?, replyText? }` seguindo as transições permitidas a cada papel |

Aprovar (`aguardando` → `aprovado`) só o Pedro faz. O Whatsapp não consegue ler nem mover lead fora da sua fila.

### Prospecção com Gemini

1. Crie uma chave em [Google AI Studio](https://aistudio.google.com/apikey) e, no Google Cloud, restrinja-a à **Generative Language API**.
2. **Plano gratuito:** só o Gemini 2.5 Flash / Flash-Lite tem busca no Google Maps e na Pesquisa Google (até 500 pedidos/dia). Os modelos 3.x devolvem **429 com `limit: 0`** sem faturamento. O painel tenta `GEMINI_MODEL` e, se não houver busca liberada, os modelos de `GEMINI_FALLBACK_MODELS` (padrão `gemini-2.5-flash,gemini-2.5-flash-lite`; `none` desliga). Projetos novos podem não ter acesso ao 2.5: use a chave de um projeto mais antigo ou ative o faturamento (Tier 1, 5.000 buscas grátis/mês nos 3.x).
3. Defina `GEMINI_API_KEY` (e, se quiser, `GEMINI_MODEL`, padrão `gemini-3.8-flash`, e `GEMINI_FALLBACK_MODELS`) na Vercel e faça um novo deploy.
4. No painel: **Prospecção → Gemini → Testar conexão** confere a chave/modelo e se a busca no Google está liberada, mostrando a mensagem original do Google quando falha.
5. A busca pode levar até ~1 min; `vercel.json` define `maxDuration: 60` para `api/orcamentos-prospects-search.ts`.

Policies: todas as tabelas com `FORCE ROW LEVEL SECURITY`. A API autentica e faz `set_config('app.authenticated','true', true)` em transação. Login e bootstrap usam funções `SECURITY DEFINER`.

A API HTTP usa poucas Serverless Functions (Hobby ≤ 12):
- auth leve: `api/orcamentos-auth-*.ts` (login/me/logout/forgot/reset)
- prospecção: `api/orcamentos-prospects-search.ts` e `api/orcamentos-prospects-settings.ts`
- demais rotas: `api/orcamentos.ts` + rewrite `/api/orcamentos/:path*` → `/api/orcamentos` (a subrota é lida de `req.url`)
Handlers em `api/_handlers/*`. Catch-all `[...path]` não funciona fora do Next.js.

## 4. Bootstrap do usuário

```bash
curl -X POST https://dev-bossle.vercel.app/api/orcamentos/bootstrap \
  -H "x-bootstrap-secret: SEU_BOOTSTRAP_SECRET"
```

## 5. Importar JSON

1. Acesse `/orcamentos` (ou `https://orcamentos.devbossle.com.br`).
2. Faça login.
3. Em **Backup / seed** → **Importar (merge)**.

## 6. Domínio

Adicione `orcamentos.devbossle.com.br` ao projeto Vercel e aponte o DNS (CNAME para `cname.vercel-dns.com`). O `vercel.json` redireciona `/` desse host para `/orcamentos`.
