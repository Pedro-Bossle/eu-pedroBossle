# Graph Report - eu-pedroBossle  (2026-11-26)

## Corpus Check
- 235 files · ~192,854 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .webmanifest 2, .css 2)

## Summary
- 1553 nodes · 4236 edges · 67 communities (61 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b450a22`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- Funnel.tsx
- learning.ts
- Neon
- package.json
- deploy.yml
- Panel.tsx
- Resume.tsx
- types/orcamentos.ts
- compilerOptions
- withAuth
- ProposalPdfDocument.tsx
- Layout.tsx
- App.tsx
- downloadResumePdf.ts
- compilerOptions
- downloadProposalPdf.ts
- API do funil de prospecção — guia para os bots
- dependencies
- Contato.tsx
- Prospects.tsx
- Finance.tsx
- _lib/prospects.ts
- Lakebase Postgres
- crmToday.ts
- react
- LanguageContext.tsx
- useLanguage
- Orçamentos · Neon
- json
- Semantic Vector Search
- @vercel/node
- useLanguage
- hybrid-search.md
- vite.config.ts
- scripts
- instagram.ts
- Managing Lakebase Search with Drizzle
- Claimable Neon
- prospectFunnel.ts
- Full-Text Search with BM25 Ranking
- Setup Flow
- Troubleshooting and Neon-Specific Performance
- React + TypeScript + Vite
- ClientSheet.tsx
- tsconfig.json
- vercel.json
- function-triggers.md
- parse-env.md
- sdk.md
- Today.tsx
- Instagram.tsx
- pluggy.ts
- models.ts
- payments.ts
- panelStyles.ts
- readBody
- instagram-scheduler.yml
- requireSession
- finance/index.ts
- ModelPreview.tsx
- Pendências do seu lado — CRM Dev Bossle
- @neondatabase/serverless
- contractData.ts
- Learning.tsx
- analytics.ts

## God Nodes (most connected - your core abstractions)
1. `json()` - 127 edges
2. `withAuth()` - 97 edges
3. `requireSession()` - 89 edges
4. `readBody()` - 75 edges
5. `@vercel/node` - 66 edges
6. `react` - 51 edges
7. `Panel()` - 48 edges
8. `useLanguage()` - 31 edges
9. `money()` - 30 edges
10. `Icon()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Loki-compatible read API` --references--> `start()`  [INFERRED]
  .agents/skills/neon/references/logs-loki.md → api/_handlers/instagram/oauth.ts
- `buildProposalEmailHtml()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_lib/proposalEmailHtml.ts → src/lib/phoneMask.ts
- `handler()` --calls--> `maskCpfCnpj()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/documentMask.ts
- `handler()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/phoneMask.ts
- `handler()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_handlers/crm/convert.ts → src/lib/phoneMask.ts

## Import Cycles
- None detected.

## Communities (67 total, 6 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.07
Nodes (48): Logs: CLI, Loki, and SDK pagination, Loki-compatible read API, handler(), hashToken(), isEmail(), handler(), hashToken(), callback() (+40 more)

### Community 1 - "Funnel.tsx"
Cohesion: 0.08
Nodes (38): ageDays(), ageText(), BotTokenRow(), BotTokens(), byRecent(), channelOf(), EXITS, fmtWhen() (+30 more)

### Community 2 - "learning.ts"
Cohesion: 0.11
Nodes (36): dateOnly(), handler(), summary(), aiBlockMarkdown(), aiConfigured(), AiResult, analyze(), anonymize() (+28 more)

### Community 3 - "Neon"
Cohesion: 0.05
Nodes (36): Auth, 1. Install the Neon CLI, 2. Install the Neon MCP Server, 3. Install Neon Agent Skills, 4. Link Your Project and Get Started, Architecture: How to Use Neon, Backend Primitives, Bootstrap a New Project (+28 more)

### Community 4 - "package.json"
Cohesion: 0.10
Nodes (28): devDependencies, eslint@^10.8.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.3, globals@^17.7.0, @types/bcryptjs@^2.4.6, @types/node@^24.13.3 (+20 more)

### Community 5 - "deploy.yml"
Cohesion: 0.07
Nodes (30): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, runs-on (+22 more)

### Community 6 - "Panel.tsx"
Cohesion: 0.07
Nodes (48): MailIcon(), WhatsAppIcon(), peek(), remember(), store, itemsFromTimeline(), PRESET_SECTIONS, timelineLines() (+40 more)

### Community 7 - "Resume.tsx"
Cohesion: 0.17
Nodes (19): resume, resume, splitSkillItems(), Stack(), tx(), CertificateLink(), CompanyLinks(), CredentialList() (+11 more)

### Community 8 - "types/orcamentos.ts"
Cohesion: 0.06
Nodes (59): buildProposalEmailHtml(), escapeHtml(), isHttpUrl(), moneyBrl(), orcamentosApi, ClientProposal(), formatWhen(), Props (+51 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "withAuth"
Cohesion: 0.15
Nodes (29): CLIENT_STATUSES, handler(), handler(), handler(), handler(), SECTIONS, handler(), handler() (+21 more)

### Community 11 - "ProposalPdfDocument.tsx"
Cohesion: 0.33
Nodes (8): proposalValidityEnd(), proposalValidityStart(), BulletList(), lines(), LINK_TYPE, ProposalPdfDocument(), Props, Section()

### Community 12 - "Layout.tsx"
Cohesion: 0.14
Nodes (22): lenis, Footer(), Layout(), SectionFade, LangButton(), Nav(), NAV_LINKS, SectionLink() (+14 more)

### Community 13 - "App.tsx"
Cohesion: 0.20
Nodes (15): App(), CasesPage, ContatoPage, isOrcamentosHost(), ModelPreview, OrcamentosApp, PrivacyPage, ResumePage (+7 more)

### Community 14 - "downloadResumePdf.ts"
Cohesion: 0.23
Nodes (15): jspdf, addPageLinks(), applyPrintLayout(), BlockRange, downloadResumePdf(), hidePdfExtras(), loadImage(), measureAtomicBlocks() (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 16 - "downloadProposalPdf.ts"
Cohesion: 0.18
Nodes (15): buildProposalPdf(), contentBottomY(), downloadProposalPdf(), EMAIL_PDF_MAX_BASE64_CHARS, loadImage(), measureRanges(), nextPageEnd(), PdfBuildOptions (+7 more)

### Community 17 - "API do funil de prospecção — guia para os bots"
Cohesion: 0.10
Nodes (20): 1. Conexão, 2. O funil, 3.1 Checar duplicado — `GET /bot/leads`, 3.2 Cadastrar ou atualizar — `POST /bot/leads`, 3.3 Descartar um lead — `POST /bot/move`, 3.4 Ver o que o Pedro aprovou e como ele editou — `GET /bot/leads?stage=aprovado`, 3.5 Editar trechos de um lead — `PATCH /bot/leads`, 3. Bot Dev Bossle (`prospector`) (+12 more)

### Community 18 - "dependencies"
Cohesion: 0.08
Nodes (24): dependencies, bcryptjs@^3.0.3, cookie@^2.0.1, jose@^6.2.12, jspdf@^4.2.1, lenis@^1.3.26, modern-screenshot@^4.7.0, pluggy-connect-sdk@^2.15.0 (+16 more)

### Community 19 - "Contato.tsx"
Cohesion: 0.18
Nodes (17): HireMe(), HireMeProps, isEmail(), darkFields, DEFAULT_HIRE_STYLE_ID, fontJobs, getHireStyle(), HIRE_STYLES (+9 more)

### Community 20 - "Prospects.tsx"
Cohesion: 0.13
Nodes (33): ALIASES, buildMessage(), contactInfo(), CSV_COLUMNS, DEFAULT_CITY, downloadText(), firstProblem(), leadStatus (+25 more)

### Community 21 - "Finance.tsx"
Cohesion: 0.08
Nodes (57): isLost(), isWon(), monthShort(), Results(), ym(), Accounts(), buildInsights(), cap() (+49 more)

### Community 22 - "_lib/prospects.ts"
Cohesion: 0.16
Nodes (20): CleanProspect, clip(), count(), iso(), isoDate(), normalizeInstagram(), normalizeMapsUrl(), normalizeWebsite() (+12 more)

### Community 23 - "Lakebase Postgres"
Cohesion: 0.15
Nodes (13): Autoscaling, Branching, Connection Pooling, Gotchas, Instant Restore, IP Allow Lists, Lakebase Postgres, Lakebase Search (+5 more)

### Community 24 - "crmToday.ts"
Cohesion: 0.11
Nodes (34): handler(), handler(), iso(), Item, part(), ymd(), COUNTS, handler() (+26 more)

### Community 25 - "react"
Cohesion: 0.17
Nodes (15): react, DeferredMount(), Hero(), TRAVEL_MS, HeroBalloon(), HeroBalloonProps, HeroIcon, BlocksIcon() (+7 more)

### Community 26 - "LanguageContext.tsx"
Cohesion: 0.29
Nodes (8): dictionaries, LanguageContext, LanguageContextValue, LanguageProvider(), readStoredLocale(), en, pt, TranslationKeys

### Community 27 - "useLanguage"
Cohesion: 0.27
Nodes (9): ContactForm(), isEmail(), Props, Models(), Projects(), ProjectsCarousel(), WhyWebsite(), MODELS (+1 more)

### Community 28 - "Orçamentos · Neon"
Cohesion: 0.15
Nodes (12): 1. Conectar Neon no projeto Vercel, 2. Variáveis de ambiente, 3. Schema + RLS, 4. Bootstrap do usuário, 5. Importar JSON, 6. Domínio, 7. Instagram (menu **Instagram**), 8. Finanças (menu **Finanças**) (+4 more)

### Community 29 - "json"
Cohesion: 0.13
Nodes (29): AuthRow, fetchUser(), handler(), tooManyAttempts(), handler(), handler(), handler(), handler() (+21 more)

### Community 30 - "Semantic Vector Search"
Cohesion: 0.22
Nodes (9): Build the Index, Contents, Create the Extension, Prepare Embeddings, Query, Semantic Vector Search, Tune Search, Tune the Index (+1 more)

### Community 31 - "@vercel/node"
Cohesion: 0.13
Nodes (14): handler(), TABLES, handler(), handler(), handler(), ContactLead, handler(), mapLead() (+6 more)

### Community 32 - "useLanguage"
Cohesion: 0.11
Nodes (17): react-router, projects, ProjectSlide(), caseSlug(), projectLogos, LocalizedString, LocalizedStringList, txList() (+9 more)

### Community 33 - "hybrid-search.md"
Cohesion: 0.43
Nodes (3): Adapt the Hybrid Search, Hybrid Search, RRF Example

### Community 34 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.2.0, @vitejs/plugin-react@^6.0.4, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 35 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:migrate, dev, dev:app, lint, optimize:logos, preview

### Community 36 - "instagram.ts"
Cohesion: 0.07
Nodes (49): COMMENT_FIELDS, handler(), one(), connectIg(), containerStatus(), createContainer(), exchangeLongLived(), fetchProfile() (+41 more)

### Community 37 - "Managing Lakebase Search with Drizzle"
Cohesion: 0.29
Nodes (7): BM25 Index, Config, Extensions, Managing Lakebase Search with Drizzle, Query, Schema, Tune Per Query

### Community 38 - "Claimable Neon"
Cohesion: 0.29
Nodes (6): Claim, Claimable Neon, If neon claim is missing, Path, With REST, With the CLI

### Community 39 - "prospectFunnel.ts"
Cohesion: 0.06
Nodes (64): BotLeadBody, clip(), Db, findExisting(), handler(), LEAD_FIELDS, listStage(), Outcome (+56 more)

### Community 40 - "Full-Text Search with BM25 Ranking"
Cohesion: 0.33
Nodes (6): Full-Text Search with BM25 Ranking, Prepare and Index Text, Query and Interpret Scores, Set Parameters at Build Time or Per Query, Set the Candidate Limit, Use Prefilter Selectively

### Community 41 - "Setup Flow"
Cohesion: 0.33
Nodes (6): 1. Select the organization and project, 2. Get the connection string, 3. Pick the connection method and driver, 4. Set up the schema, Setup Flow, When to use pooled vs direct connections

### Community 42 - "Troubleshooting and Neon-Specific Performance"
Cohesion: 0.33
Nodes (6): Choose CLI or MCP, Inspect Neon Cache Behavior Per Query, Interpret Results Safely, Performance Workflow, Pick the Diagnostic, Troubleshooting and Neon-Specific Performance

### Community 43 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 44 - "ClientSheet.tsx"
Cohesion: 0.10
Nodes (43): parsePhone(), AVATAR, avatarBg(), ClientList(), initials(), ClientSheet(), I, SOURCES (+35 more)

### Community 46 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, crons, functions, api/orcamentos.ts, headers, regions, rewrites

### Community 51 - "Today.tsx"
Cohesion: 0.11
Nodes (29): Props, TYPES, WEEKDAYS, greeting(), relTime(), REPEAT_ICON, REPEAT_LABEL, TASK_KIND_ICON (+21 more)

### Community 52 - "Instagram.tsx"
Cohesion: 0.09
Nodes (42): InstagramIcon(), Account(), blankPost(), Calendar(), CalEntry, Comments(), Composer(), dayKey() (+34 more)

### Community 53 - "pluggy.ts"
Cohesion: 0.12
Nodes (23): handler(), Hook, webhookUrl(), allTransactions(), apiKey(), CATEGORY_PT, classify(), ItemSync (+15 more)

### Community 55 - "payments.ts"
Cohesion: 0.48
Nodes (6): Body, brl(), day(), handler(), iso(), mapPayment()

### Community 56 - "panelStyles.ts"
Cohesion: 0.10
Nodes (26): fmtDue(), Props, STAGE_LABEL, STAGES, Login(), Props, TrafficLights(), appRoot (+18 more)

### Community 57 - "readBody"
Cohesion: 0.11
Nodes (33): handler(), handler(), handler(), handler(), handler(), Payload, SYNC_EVENTS, handler() (+25 more)

### Community 58 - "instagram-scheduler.yml"
Cohesion: 0.12
Nodes (16): APP_URL, CRON_SECRET, jobs, publish, name, on, schedule, workflow_dispatch (+8 more)

### Community 59 - "requireSession"
Cohesion: 0.43
Nodes (6): Body, day(), handler(), iso(), mapProject(), STAGES

### Community 60 - "finance/index.ts"
Cohesion: 0.50
Nodes (7): day(), iso(), mapAccount(), mapInvestment(), mapItem(), mapTx(), n()

### Community 61 - "ModelPreview.tsx"
Cohesion: 0.29
Nodes (11): Device, DeviceSwitch(), ExternalIcon(), Model, ModelPreview(), MonitorIcon(), PhoneIcon(), Screen() (+3 more)

### Community 62 - "Pendências do seu lado — CRM Dev Bossle"
Cohesion: 0.18
Nodes (10): 1. Colocar no ar (15 min), 2. Variáveis na Vercel, 3. Agendador de posts (GitHub), 4. Instagram (Meta), 5. Finanças (Pluggy), 6. No celular, 7. Teste rápido (10 min, depois do deploy), 8. O que não deu para testar daqui (+2 more)

### Community 64 - "@neondatabase/serverless"
Cohesion: 0.13
Nodes (10): @neondatabase/serverless@^1.2.0, sharp@^0.35.5, @neondatabase/serverless, sharp, pool, sqlFiles, files, logosDir (+2 more)

### Community 65 - "contractData.ts"
Cohesion: 0.15
Nodes (18): isCnpj(), buildContractPayload(), ContractPayload, estimateExecutionDays(), lines(), moneyBrl(), numberPt(), TENS (+10 more)

### Community 66 - "Learning.tsx"
Cohesion: 0.23
Nodes (13): AI_LABEL, brDate(), cells(), CONF, Guide(), inline(), Learning(), Markdown() (+5 more)

### Community 68 - "analytics.ts"
Cohesion: 0.33
Nodes (8): daysIn(), handler(), merchantKey(), monthOf(), Row, shift(), titleCase(), todayInMonth()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `Funnel.tsx`, `package.json`, `Panel.tsx`, `Resume.tsx`, `types/orcamentos.ts`, `ProposalPdfDocument.tsx`, `Layout.tsx`, `App.tsx`, `dependencies`, `Contato.tsx`, `Prospects.tsx`, `Finance.tsx`, `LanguageContext.tsx`, `useLanguage`, `useLanguage`, `ClientSheet.tsx`, `Today.tsx`, `Instagram.tsx`, `panelStyles.ts`, `ModelPreview.tsx`, `contractData.ts`, `Learning.tsx`?**
  _High betweenness centrality (0.176) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0742447516641065 - nodes in this community are weakly interconnected._
- **Why does `@vercel/node` connect `@vercel/node` to `auth.ts`, `learning.ts`, `analytics.ts`, `instagram.ts`, `package.json`, `prospectFunnel.ts`, `withAuth`, `pluggy.ts`, `payments.ts`, `crmToday.ts`, `readBody`, `requireSession`, `json`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `Funnel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08478513356562137 - nodes in this community are weakly interconnected._
- **Why does `@neondatabase/serverless` connect `@neondatabase/serverless` to `learning.ts`, `instagram.ts`, `package.json`, `prospectFunnel.ts`, `withAuth`, `pluggy.ts`, `_lib/prospects.ts`, `crmToday.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `learning.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Neon` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._