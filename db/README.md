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

### E-mail (Resend)

1. Aceite os termos do Marketplace e instale:  
   `vercel integration add resend/resend-email --no-claim`
2. Defina `RESEND_FROM` (Production + Preview + Development).
3. Verifique o domínio em [resend.com/domains](https://resend.com/domains). Sem domínio verificado, use `onboarding@resend.dev` só para testes na conta Resend.
4. Local: `npm run dev:app` (carrega `.env` / `.env.local`) e use o botão **Enviar** no painel.
5. Redefinição de senha: login → **Esqueci a senha** (ou **Meus dados** → Segurança). O link vai para o e-mail de `profile` (Meus dados).

## 3. Schema + RLS

No SQL Editor do Neon, rode os arquivos `001`…`005` (nesta ordem), **ou**:

```bash
# com DATABASE_URL no ambiente
npm run db:migrate
```

- `002` — link público da proposta (token + senha), comentários e decisão do cliente.
- `005` — tokens de redefinição de senha do admin.
- `006` — `session_version` para invalidar JWTs após reset de senha.

Policies: todas as tabelas com `FORCE ROW LEVEL SECURITY`. A API autentica e faz `set_config('app.authenticated','true', true)` em transação. Login e bootstrap usam funções `SECURITY DEFINER`.

A API HTTP é um único Serverless Function (`api/orcamentos/[...path].ts`) que despacha para `api/_handlers/*`, para caber no limite do plano Hobby (≤ 12 functions).

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
