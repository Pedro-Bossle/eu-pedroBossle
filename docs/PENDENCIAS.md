# Pendências do seu lado — CRM Dev Bossle

Tudo que foi feito está na branch `claude/peaceful-sagan-d3j20b`. Esta lista é o que **só você** consegue fazer (contas, chaves, aprovações). Faça na ordem: os primeiros itens destravam os outros.

---

## 1. Colocar no ar (15 min)

- [ ] **Merge da branch na `main`** (GitHub → Pull requests → nova PR de `claude/peaceful-sagan-d3j20b` para `main`, ou me peça para abrir a PR).
- [ ] **Migrations no banco de produção.** As tabelas novas (011 a 016) já existem na branch de preview do Neon, mas não na `main`.
  - Opção A: me mande a connection string da branch `main` do Neon que eu rodo.
  - Opção B: no seu computador, com a URL da `main`: `DATABASE_URL="postgresql://…" npm run db:migrate` (pode rodar mais de uma vez, só cria o que falta).
- [ ] **Trocar a senha do banco de preview.** A connection string passou pelo chat. Neon → Roles → `neondb_owner` → Reset password.
- [ ] **Neon: parar de criar um banco por preview** (evita o erro de limite de branches de novo). Vercel → Integrations → Neon → Manage → desmarcar *Create a database branch for Preview deployments*.

## 2. Variáveis na Vercel

Vercel → projeto `dev-bossle` → Settings → Environment Variables (marque **Production** e **Preview**). Depois de criar, faça **Redeploy**.

| Variável | Obrigatória? | Onde conseguir / o que pôr |
|---|---|---|
| `ORCAMENTOS_PUBLIC_URL` | **Sim** | `https://orcamentos.devbossle.com.br` (sem `www`; o domínio com `www.orcamentos` não existe no projeto) |
| `CRON_SECRET` | **Sim** | Invente 32+ caracteres aleatórios (ex.: `openssl rand -hex 24`). Protege as tarefas automáticas |
| `INTEGRATIONS_ENC_KEY` | Recomendada | Outros 32+ caracteres aleatórios. Criptografa o token do Instagram no banco. **Não troque depois** (o token salvo deixa de abrir) |
| `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET` | Para Finanças | dashboard.pluggy.ai → sua aplicação |
| `RESEND_API_KEY` / `RESEND_FROM` | Para e-mails | Já devem existir (usados nas propostas). O resumo diário usa os mesmos |
| `CRM_DIGEST_EMAIL` | Opcional | E-mail que recebe o resumo diário. Sem ela usa `CONTACT_NOTIFY_EMAIL` ou o e-mail de *Meus dados* |
| `CRM_DIGEST` | Opcional | `off` desliga o resumo diário |
| `BLOB_READ_WRITE_TOKEN` | Opcional | Vercel → Storage → Create → **Blob** → conectar ao projeto (cria a variável sozinha). Habilita enviar fotos/vídeos do Instagram pelo painel |
| `META_APP_ID` / `META_APP_SECRET` | Opcional | App da Meta (seção 4). Habilita o botão “Entrar com Instagram” |
| `META_REDIRECT_URI` | Opcional | Só se quiser outro endereço; padrão `https://orcamentos.devbossle.com.br/api/orcamentos/instagram/oauth-callback` |
| `PLUGGY_WEBHOOK_SECRET` | Opcional | Segredo próprio do webhook da Pluggy; sem ele é derivado do `ORCAMENTOS_SESSION_SECRET` |

## 3. Agendador de posts (GitHub)

A Vercel gratuita só roda tarefa automática 1×/dia (06:23, horário de Brasília). Para os posts agendados saírem na hora certa, um workflow do GitHub chama o painel a cada 10 min.

- [ ] GitHub → repositório → Settings → Secrets and variables → Actions → **New repository secret**:
  - `APP_URL` = `https://orcamentos.devbossle.com.br`
  - `CRON_SECRET` = o mesmo valor da Vercel
- [ ] Conferir em Actions → “Agendador do Instagram” → *Run workflow* (deve terminar verde).

## 4. Instagram (Meta)

- [ ] A conta do Instagram precisa ser **profissional** (Criador de conteúdo ou Empresa).
- [ ] developers.facebook.com → **Criar app** → tipo *Business* → adicionar produto **Instagram** → *API com login do Instagram*.
- [ ] Permissões: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_comments`, `instagram_business_manage_insights`. Em modo de desenvolvimento funciona para a sua própria conta sem revisão da Meta (você é admin do app).
- [ ] Caminho rápido: em *Gerar tokens de acesso*, adicione sua conta, gere o token e cole em **Instagram → Conta** no painel.
- [ ] Caminho com botão (opcional): em *Configurações de login* coloque o redirect `https://orcamentos.devbossle.com.br/api/orcamentos/instagram/oauth-callback`, copie App ID e App Secret do Instagram para `META_APP_ID`/`META_APP_SECRET`.
- [ ] Depois de conectar: **Sincronizar** (biblioteca, métricas e comentários) e criar um post de teste com “Publicar agora”.

## 5. Finanças (Pluggy)

- [ ] Confirme no dashboard da Pluggy se a conta está ativa (segundo a documentação do Actual Budget, a conexão com o Meu Pluggy só funciona durante o período de teste; o botão **Conectar banco** do painel cria conexões na sua própria aplicação).
- [ ] **Finanças → Contas → Conectar banco** e autorize cada banco (ou cole o Item ID do Meu Pluggy).
- [ ] **Atualização automática → Ativar** (precisa estar no domínio de produção; em preview com proteção de acesso a Pluggy não consegue chamar).
- [ ] Na primeira atualização de um banco, procure em Vercel → Logs uma linha `pluggy webhook: item/updated …` para confirmar.

## 6. No celular

- [ ] **Android (Chrome):** abra `orcamentos.devbossle.com.br` → menu ⋮ → **Instalar app**.
- [ ] **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.
- O app abre direto em **Hoje**, em tela cheia, com atalhos para Tarefas e Finanças (toque longo no ícone, no Android).

## 7. Teste rápido (10 min, depois do deploy)

1. **Hoje**: escreva `Ligar pro João amanhã` no campo de tarefa → aparece em “Próximos 7 dias”, amanhã.
2. Tecla **N** → nova tarefa com **Repetir: Toda semana** → conclua → a próxima aparece sozinha.
3. **Clientes** → abra um cliente → registre uma nota na linha do tempo → marque “Próximo contato: Amanhã”.
4. Na mesma ficha → **Cobranças** → Gerar parcelas (50/50) → marque a entrada como recebida (Pix) → aparece no histórico.
5. **Orçamentos** → mude uma proposta para **Enviado** → em Tarefas surge “Follow-up: …” para daqui 3 dias.
6. **Ctrl + K** → busque um cliente; **?** mostra os atalhos.
7. Busca (Ctrl+K) → “Enviar resumo do dia por e-mail” → confira a caixa de entrada.
8. **Funil** → lead em “Respondeu” → **Virar cliente** → abre a ficha.

## 8. O que não deu para testar daqui

- Chamadas reais à **Meta** (publicar, métricas, comentários) e à **Pluggy** (widget, webhook): o código segue a documentação, mas sem as suas credenciais não houve teste ponta a ponta. Os nomes dos eventos do webhook da Pluggy foram confirmados pelo exemplo que você colou.
- **Envio do resumo por e-mail** (Resend): o HTML foi renderizado e conferido; o envio real depende das chaves.
- **Cron da Vercel e workflow do GitHub**: só rodam depois do merge.
- O lint ainda acusa 2 avisos antigos no `Panel.tsx` (estado alterado dentro de efeito); não quebram nada.
