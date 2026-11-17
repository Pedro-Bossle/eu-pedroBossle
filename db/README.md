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
| `CONTACT_NOTIFY_EMAIL` | Destinatário dos leads do formulário da Home (fallback: e-mail do perfil) |

### E-mail (Resend)

1. Aceite os termos do Marketplace e instale:  
   `vercel integration add resend/resend-email --no-claim`
2. Defina `RESEND_FROM` (Production + Preview + Development).
3. Verifique o domínio em [resend.com/domains](https://resend.com/domains). Sem domínio verificado, use `onboarding@resend.dev` só para testes na conta Resend.
4. Local: `npm run dev:app` (carrega `.env` / `.env.local`) e use o botão **Enviar** no painel.
5. Redefinição de senha: login → **Esqueci a senha** (ou **Meus dados** → Segurança). O link vai para o e-mail de `profile` (Meus dados).

## 3. Schema + RLS

No SQL Editor do Neon, rode os arquivos `001`…`012` (nesta ordem), **ou**:

```bash
# com DATABASE_URL no ambiente
npm run db:migrate
```

- `002` — link público da proposta (token + senha), comentários e decisão do cliente.
- `005` — tokens de redefinição de senha do admin.
- `006` — `session_version` para invalidar JWTs após reset de senha.
- `007` — `contact_leads` (formulário da Home → inbox do painel).
- `008` — `prospect_leads` (menu **Prospecção**). `integration_settings` é legado e pode ficar vazia.
- `009`/`010` — funil de prospecção e nota do lead.
- `011` — Instagram: `integration_credentials` (token criptografado), `ig_media`, `ig_comments`, `ig_posts`.
- `012` — Finanças (Pluggy): `fin_items`, `fin_accounts`, `fin_transactions`, `fin_investments`, `fin_rules`, `fin_budgets`.

### Prospecção

O menu **Prospecção** guarda os leads em `prospect_leads`. Eles entram pelo cadastro manual ou por **Importar / exportar** (CSV ou JSON; mesmo nome + cidade atualiza em vez de duplicar). A integração com o Gemini foi removida.

Policies: todas as tabelas com `FORCE ROW LEVEL SECURITY`. A API autentica e faz `set_config('app.authenticated','true', true)` em transação. Login e bootstrap usam funções `SECURITY DEFINER`.

A API HTTP usa poucas Serverless Functions (Hobby ≤ 12):
- auth leve: `api/orcamentos-auth-*.ts` (login/me/logout/forgot/reset)
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

## 7. Instagram (menu **Instagram**)

Calendário de posts, agendamento (foto, carrossel, Reels, Story), biblioteca com métricas e caixa de comentários com status (sem resposta / respondido / arquivado).

| Variável | Uso |
|---|---|
| `CRON_SECRET` | 16+ caracteres. Protege `/api/orcamentos/cron`; a Vercel Cron envia sozinha |
| `INTEGRATIONS_ENC_KEY` | (recomendado) chave para criptografar tokens no banco; sem ela usa o `ORCAMENTOS_SESSION_SECRET` |
| `META_APP_ID` / `META_APP_SECRET` | (opcional) botão “Entrar com Instagram” e troca por token de 60 dias |
| `META_REDIRECT_URI` | (opcional) padrão `https://<ORCAMENTOS_PUBLIC_URL>/api/orcamentos/instagram/oauth-callback` |
| `META_GRAPH_VERSION` | (opcional) padrão `v24.0` |
| `BLOB_READ_WRITE_TOKEN` | (opcional) Vercel Blob para enviar fotos/vídeos pelo painel. Sem ele, use URLs públicas |

1. Conta do Instagram **profissional** (Criador ou Empresa).
2. developers.facebook.com → app Business → produto **Instagram** (API com login do Instagram). Permissões: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`.
3. Gere o token e cole em **Instagram → Conta**, ou configure `META_APP_ID`/`META_APP_SECRET` + a URL de redirecionamento no app da Meta e use o botão.
4. O token é renovado automaticamente (cron diário) antes dos 60 dias.

**Agendamento.** A API do Instagram não agenda sozinha: o painel guarda o post e publica na hora. A Vercel Hobby só permite cron diário (`vercel.json`), então o workflow `.github/workflows/instagram-scheduler.yml` chama `/api/orcamentos/cron?tasks=publish` a cada 10 min. Configure no GitHub (Settings → Secrets → Actions) `APP_URL` e `CRON_SECRET`. No plano Pro dá para trocar o cron do `vercel.json` para `*/5 * * * *`.

Mídias precisam ser URLs públicas: imagem **JPEG** (o upload do painel converte PNG/WebP), vídeo MP4/MOV. Reels levam alguns minutos para processar; o post fica “Publicando” e sai no próximo ciclo.

## 8. Finanças (menu **Finanças**)

Saldo, faturas, investimentos, entradas × saídas por mês, gastos por categoria, orçamentos e regras de categorização.

| Variável | Uso |
|---|---|
| `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` | Credenciais do dashboard da Pluggy (ficam só no servidor) |
| `PLUGGY_ITEM_IDS` | (opcional) Item IDs separados por vírgula, cadastrados automaticamente no sync |

1. Crie a conta em pluggy.ai → Dashboard → copie Client ID e Client Secret.
2. Em meu.pluggy.ai conecte seus bancos (Open Finance). No menu ⋮ de cada conexão, **Copiar Item ID**.
3. Em **Finanças → Contas**, cole o Item ID. O painel importa 12 meses e o cron diário mantém em dia.

Pagamento de fatura e transferência entre contas próprias são ignorados nos totais automaticamente (dá para mudar por transação). Edições manuais de categoria não são sobrescritas pelo sync.
