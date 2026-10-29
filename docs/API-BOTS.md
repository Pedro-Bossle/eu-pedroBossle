# API do funil de prospecção — guia para os bots

Dois bots trabalham no mesmo funil de leads da Dev Bossle:

| Bot | Papel (`role`) | O que faz |
|---|---|---|
| **Dev Bossle** | `prospector` | Pesquisa negócios, dá nota, cadastra o lead e o manda para aprovação. |
| **WhatsApp** | `executor` | Envia as mensagens que o Pedro aprovou e registra o que acontece depois. |

O **Pedro** é o único que aprova mensagens e follow-ups, pelo painel. Nenhum bot faz isso.

---

## 1. Conexão

- **Base URL:** `https://orcamentos.devbossle.com.br/api/orcamentos`
- **Autenticação:** todo pedido leva `Authorization: Bearer dbb_…` (o token do seu bot).
- **Corpo:** JSON, com `Content-Type: application/json`.
- **Limite:** 120 pedidos por minuto por IP. Acima disso a resposta é `429` com o cabeçalho `Retry-After` (segundos).
- **Token:** é secreto. Não o escreva em mensagens, logs, commits ou respostas ao usuário. Se vazar, avise o Pedro para revogar e criar outro.

Cada token tem um papel fixo. Usar a rota do outro bot devolve `403`.

| Rota | `prospector` | `executor` |
|---|---|---|
| `GET /bot/leads` | sim | não |
| `POST /bot/leads` | sim | não |
| `GET /bot/queue` | não | sim |
| `POST /bot/move` | sim | sim |

---

## 2. O funil

Etapas, na ordem:

`encontrado` → `aguardando` → `aprovado` → `enviado` → `followup` → `respondeu` → `proposta` → `resultado`

Saídas (o lead para de andar, mas fica registrado para não ser pesquisado de novo):
`descartado`, `banco_b`, `revisar`, `nao_contatar`, `sem_resposta`, `invalido`.

### Quem pode mover o quê

| Papel | De | Para |
|---|---|---|
| `prospector` | `encontrado` | `aguardando`, `descartado`, `banco_b`, `revisar` |
| `prospector` | `aguardando` | `descartado`, `banco_b`, `revisar` |
| `executor` | `aprovado` | `enviado`, `invalido` |
| `executor` | `enviado` | `followup`, `respondeu`, `nao_contatar`, `invalido` |
| `executor` | `followup` | `respondeu`, `nao_contatar`, `sem_resposta`, `invalido` |

Qualquer outra transição devolve `409`. Em especial:

- `aguardando` → `aprovado` é **só do Pedro**. Nenhum bot aprova.
- `enviado` → `followup` só funciona depois que o Pedro aprovou o texto do follow-up (senão `409`).
- Toda **saída** exige o motivo no campo `note`.

---

## 3. Bot Dev Bossle (`prospector`)

### 3.1 Checar duplicado — `GET /bot/leads`

Faça isto **antes** de pesquisar um negócio.

Query: `name`, `city`, `whatsapp` (todos opcionais; o mais útil é nome + cidade). O WhatsApp é comparado sem formatação e sem o `55`.

```
GET /bot/leads?name=Mecânica%20Zanella&city=Caxias%20do%20Sul
```

Resposta `200`:

```json
{ "exists": true, "stage": "descartado" }
```

Se `exists` for `true`, **não pesquise nem cadastre de novo**, qualquer que seja a etapa.

### 3.2 Cadastrar ou atualizar — `POST /bot/leads`

Cria o lead; se já existir (mesmo nome + cidade, ou mesmo WhatsApp), atualiza. Só é possível atualizar leads que ainda estão em `encontrado` ou `aguardando`; em qualquer outra etapa a resposta é `409` com `{"error":"duplicado","id":"…","stage":"…"}`.

Campos:

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `name` | texto (200) | sim | Nome do negócio. |
| `city` | texto (120) | sim | Só **Caxias do Sul**, **Farroupilha** ou **São Marcos**; outra cidade devolve `400`. |
| `stage` | texto | não | `encontrado` (padrão), `aguardando`, `descartado`, `banco_b` ou `revisar`. |
| `note` | texto (500) | se `stage` for `descartado`, `banco_b` ou `revisar` | Motivo. |
| `niche` | texto (120) | não | Ex.: "oficina mecânica". |
| `address`, `neighborhood` | texto | não | |
| `website` | texto | não | Perfil de Instagram/Facebook/Linktree/WhatsApp **não conta** como site e é descartado. Vazio = sem site. |
| `whatsapp`, `phone` | texto (40) | não | Número com DDD. |
| `email` | texto | não | |
| `instagram` | texto | não | `@perfil` ou URL do perfil. |
| `problems` | texto (2000) | não | Problemas do site, separados por `;`. |
| `pitch` | texto (2000) | não | Argumento de venda. |
| `message` | texto (2000) | para `aguardando` | Mensagem pronta para o WhatsApp. |
| `mapsUrl` | texto | não | Só links do Google Maps são aceitos. |
| `score` | número 0–100 | para `aguardando` | Nota do lead. |
| `scoreBreakdown` | lista | não | `[{ "label": "Sem site", "points": 30, "max": 30 }]` (até 12 itens). |
| `phoneSources` | lista de textos | para `aguardando` | Fontes do telefone, ex.: `["Google Maps", "Site oficial"]` (até 6). |
| `siteCheck` | texto (500) | para `aguardando` | Descrição das 3 checagens de site. |
| `activity` | texto (500) | não | Sinais de que o negócio está ativo. |
| `detail` | texto (300) | não | Observação curta. |
| `projectType` | `"landing"` ou `"sistema"` | não | Padrão `landing`. |

**Regras para `stage: "aguardando"`** (o servidor recusa com `400` se qualquer uma falhar):

1. O lead **não pode ter site**.
2. `phoneSources` com **pelo menos 2** fontes oficiais.
3. `siteCheck` preenchido.
4. `score` de **70 ou mais** (lead A).
5. `message` pronta.

Quem não cumpre as regras acima não vai para aprovação: cadastre em `encontrado`, ou saia do funil com `descartado` / `banco_b` / `revisar` e um `note`.

Exemplo:

```bash
curl -X POST "$BASE/bot/leads" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "Mecânica Zanella",
    "niche": "oficina mecânica",
    "city": "Caxias do Sul",
    "neighborhood": "Centro",
    "whatsapp": "(54) 99999-0000",
    "phoneSources": ["Google Maps", "Instagram oficial"],
    "siteCheck": "Sem site no Google, sem domínio próprio no Instagram, sem resultado em buscas por nome.",
    "score": 82,
    "scoreBreakdown": [{"label":"Sem site","points":40,"max":40}],
    "message": "Oi, tudo bem? Procurei a Mecânica Zanella na internet e não encontrei um site de vocês...",
    "stage": "aguardando"
  }'
```

Resposta: `201` (criado) ou `200` (atualizado), com `{ "lead": { … } }`.

### 3.3 Descartar um lead — `POST /bot/move`

Veja a seção 5. Ex.: `{"id":"…","to":"banco_b","note":"Nota 55, abaixo do corte"}`.

---

## 4. Bot WhatsApp (`executor`)

### 4.1 Fila de envio — `GET /bot/queue`

Devolve o que pode ser enviado **agora**. Consulte periodicamente (por exemplo a cada poucos minutos); não existe push.

Fora da janela de envio (**seg–sex, 9h–11h30 e 14h–17h30, horário de Brasília**):

```json
{ "window": false, "info": "Fora da janela de envio (seg–sex, 9h–11h30 e 14h–17h30)", "send": [], "followups": [] }
```

Dentro da janela:

```json
{
  "window": true,
  "remaining": 12,
  "send": [
    { "id": "uuid", "name": "Mecânica Zanella", "whatsapp": "(54) 99999-0000", "message": "texto aprovado" }
  ],
  "followups": [
    { "id": "uuid", "name": "Auto Center X", "whatsapp": "(54) 98888-0000", "message": "texto do follow-up aprovado" }
  ]
}
```

- `send`: leads **aprovados** pelo Pedro, prontos para a **primeira mensagem**. Respeita o limite de **15 primeiros contatos por dia**; `remaining` é quanto ainda cabe hoje.
- `followups`: leads já `enviado` cujo follow-up o Pedro aprovou.
- Envie **exatamente** o texto de `message`, sem alterar. É o que o Pedro aprovou.
- Não envie nada que não esteja nesta fila.

### 4.2 Registrar o que aconteceu — `POST /bot/move`

| Situação | Corpo |
|---|---|
| Primeira mensagem enviada | `{"id":"…","to":"enviado"}` |
| Follow-up enviado | `{"id":"…","to":"followup"}` |
| O lead respondeu | `{"id":"…","to":"respondeu","replyText":"texto da resposta"}` |
| Pediu para não ser contatado | `{"id":"…","to":"nao_contatar","note":"motivo"}` |
| Número inválido / não existe no WhatsApp | `{"id":"…","to":"invalido","note":"motivo"}` |
| Sem resposta após o follow-up | `{"id":"…","to":"sem_resposta","note":"motivo"}` |

Registre **logo depois** de cada envio. Se o registro falhar, o lead continua na fila e pode ser enviado em duplicidade: repita o registro até dar certo antes de pegar o próximo item.

---

## 5. Mover de etapa — `POST /bot/move`

Disponível para os dois papéis, respeitando a tabela da seção 2.

Corpo:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `id` | sim | UUID do lead. |
| `to` | sim | Etapa de destino. |
| `note` | para saídas | Motivo (até 500 caracteres). |
| `replyText` | não | Só com `to: "respondeu"`: texto da resposta do lead (até 2000). |

Resposta `200`: `{ "lead": { … } }`.

---

## 6. Erros

Todos devolvem `{ "error": "mensagem" }`.

| Código | Quando |
|---|---|
| `400` | Dado inválido ou regra do funil quebrada (cidade fora da área, lead com site em `aguardando`, motivo faltando). A mensagem diz o quê. |
| `401` | Token ausente, errado ou revogado. Pare e avise o Pedro. |
| `403` | O token é do papel errado para a rota, ou o prospector tentou uma etapa que não pode registrar. |
| `404` | Lead não encontrado. |
| `405` | Método HTTP errado. |
| `409` | Transição não permitida, follow-up ainda não aprovado, ou lead duplicado em etapa que o bot não pode editar. |
| `429` | Limite de pedidos. Espere `Retry-After` segundos. |
| `500` | Falha do servidor. Tente de novo depois de alguns segundos, no máximo 3 vezes. |

Não repita automaticamente um `4xx` sem mudar o pedido: ele vai falhar de novo.

---

## 7. Regras de conduta

**Dev Bossle**
- Consulte `GET /bot/leads` antes de pesquisar. Lead que já existe, em qualquer etapa, não se repete.
- Só cidades atendidas: Caxias do Sul, Farroupilha e São Marcos.
- Só lead A (nota 70+), sem site e com telefone confirmado em 2 fontes vai para `aguardando`.
- Sempre registre o motivo ao descartar, mandar para o Banco B ou para revisão.

**WhatsApp**
- Envie só o que veio de `/bot/queue`, com o texto exato.
- Respeite a janela de envio e o limite diário; a fila já os aplica, não tente contorná-los.
- Se alguém pedir para não ser contatado, registre `nao_contatar` e nunca mais envie.
- Registre cada envio e cada resposta no funil.
