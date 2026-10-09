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

## 3. Schema + RLS

No SQL Editor do Neon, rode o arquivo `001_orcamentos_schema.sql`, **ou**:

```bash
# com DATABASE_URL no ambiente
npm run db:migrate
```

Policies: todas as tabelas com `FORCE ROW LEVEL SECURITY`. A API autentica e faz `set_config('app.authenticated','true', true)` em transação. Login e bootstrap usam funções `SECURITY DEFINER`.

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
