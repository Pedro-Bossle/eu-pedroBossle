# Graph Report - eu-pedroBossle  (2026-11-26)

## Corpus Check
- 230 files · ~185,804 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .webmanifest 2, .css 2)

## Summary
- 1490 nodes · 4071 edges · 64 communities (59 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4d189e96`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- auth.ts
- Funnel.tsx
- _lib/prospects.ts
- Neon
- package.json
- deploy.yml
- Panel.tsx
- Resume.tsx
- types/orcamentos.ts
- compilerOptions
- mappers.ts
- ProposalPdfDocument.tsx
- Layout.tsx
- App.tsx
- downloadResumePdf.ts
- compilerOptions
- downloadProposalPdf.ts
- API do funil de prospecção — guia para os bots
- dependencies
- Contato.tsx
- useLanguage
- Finance.tsx
- proposalTemplate.ts
- Lakebase Postgres
- crmToday.ts
- react
- LanguageContext.tsx
- oauth.ts
- Orçamentos · Neon
- json
- Semantic Vector Search
- contactEmailHtml.ts
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
- model.ts
- Instagram.tsx
- pluggy.ts
- models.ts
- SectionFade.tsx
- panelStyles.ts
- posts.ts
- instagram-scheduler.yml
- payments.ts
- finance/index.ts
- ModelPreview.tsx
- Pendências do seu lado — CRM Dev Bossle
- botTokens.ts

## God Nodes (most connected - your core abstractions)
1. `json()` - 123 edges
2. `withAuth()` - 93 edges
3. `requireSession()` - 85 edges
4. `readBody()` - 71 edges
5. `@vercel/node` - 64 edges
6. `react` - 50 edges
7. `Panel()` - 48 edges
8. `useLanguage()` - 31 edges
9. `money()` - 30 edges
10. `Icon()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Loki-compatible read API` --references--> `start()`  [INFERRED]
  .agents/skills/neon/references/logs-loki.md → api/_handlers/instagram/oauth.ts
- `handler()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_handlers/crm/convert.ts → src/lib/phoneMask.ts
- `handler()` --calls--> `maskCpfCnpj()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/documentMask.ts
- `handler()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/phoneMask.ts
- `handler()` --calls--> `maskCpfCnpj()`  [EXTRACTED]
  api/_handlers/profile.ts → src/lib/documentMask.ts

## Import Cycles
- None detected.

## Communities (64 total, 5 thin omitted)

### Community 0 - "auth.ts"
Cohesion: 0.09
Nodes (39): handler(), hashToken(), isEmail(), AuthRow, fetchUser(), handler(), tooManyAttempts(), handler() (+31 more)

### Community 1 - "Funnel.tsx"
Cohesion: 0.05
Nodes (75): InstagramIcon(), ALIASES, buildMessage(), contactInfo(), CSV_COLUMNS, DEFAULT_CITY, downloadText(), firstProblem() (+67 more)

### Community 2 - "_lib/prospects.ts"
Cohesion: 0.16
Nodes (20): CleanProspect, clip(), count(), iso(), isoDate(), normalizeInstagram(), normalizeMapsUrl(), normalizeWebsite() (+12 more)

### Community 3 - "Neon"
Cohesion: 0.05
Nodes (36): Auth, 1. Install the Neon CLI, 2. Install the Neon MCP Server, 3. Install Neon Agent Skills, 4. Link Your Project and Get Started, Architecture: How to Use Neon, Backend Primitives, Bootstrap a New Project (+28 more)

### Community 4 - "package.json"
Cohesion: 0.10
Nodes (30): devDependencies, eslint@^10.8.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, eslint-plugin-react-refresh@^0.5.3, globals@^17.7.0, sharp@^0.35.5, @types/bcryptjs@^2.4.6 (+22 more)

### Community 5 - "deploy.yml"
Cohesion: 0.07
Nodes (30): runs-on, steps, concurrency, cancel-in-progress, group, environment, needs, runs-on (+22 more)

### Community 6 - "Panel.tsx"
Cohesion: 0.09
Nodes (36): MailIcon(), WhatsAppIcon(), remember(), itemsFromTimeline(), PRESET_SECTIONS, timelineLines(), applyProposalTemplate(), buildShareClientMessage() (+28 more)

### Community 7 - "Resume.tsx"
Cohesion: 0.17
Nodes (19): resume, resume, splitSkillItems(), Stack(), tx(), CertificateLink(), CompanyLinks(), CredentialList() (+11 more)

### Community 8 - "types/orcamentos.ts"
Cohesion: 0.07
Nodes (48): react, orcamentosApi, ClientProposal(), formatWhen(), Props, statusClass(), CommandPalette(), norm() (+40 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "mappers.ts"
Cohesion: 0.07
Nodes (48): CLIENT_STATUSES, handler(), handler(), handler(), handler(), isEmail(), stripDataUrl(), handler() (+40 more)

### Community 11 - "ProposalPdfDocument.tsx"
Cohesion: 0.33
Nodes (8): proposalValidityEnd(), proposalValidityStart(), BulletList(), lines(), LINK_TYPE, ProposalPdfDocument(), Props, Section()

### Community 12 - "Layout.tsx"
Cohesion: 0.19
Nodes (15): lenis, Footer(), Layout(), SectionFade, LangButton(), Nav(), NAV_LINKS, SectionLink() (+7 more)

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
Cohesion: 0.20
Nodes (13): buildProposalPdf(), contentBottomY(), downloadProposalPdf(), EMAIL_PDF_MAX_BASE64_CHARS, loadImage(), measureRanges(), nextPageEnd(), PdfBuildOptions (+5 more)

### Community 17 - "API do funil de prospecção — guia para os bots"
Cohesion: 0.10
Nodes (19): 1. Conexão, 2. O funil, 3.1 Checar duplicado — `GET /bot/leads`, 3.2 Cadastrar ou atualizar — `POST /bot/leads`, 3.3 Descartar um lead — `POST /bot/move`, 3.4 Ver o que o Pedro aprovou e como ele editou — `GET /bot/leads?stage=aprovado`, 3.5 Editar trechos de um lead — `PATCH /bot/leads`, 3. Bot Dev Bossle (`prospector`) (+11 more)

### Community 18 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs@^3.0.3, cookie@^2.0.1, jose@^6.2.12, jspdf@^4.2.1, lenis@^1.3.26, modern-screenshot@^4.7.0, pluggy-connect-sdk@^2.15.0 (+15 more)

### Community 19 - "Contato.tsx"
Cohesion: 0.14
Nodes (22): react-router, HireMe(), HireMeProps, isEmail(), darkFields, DEFAULT_HIRE_STYLE_ID, fontJobs, getHireStyle() (+14 more)

### Community 20 - "useLanguage"
Cohesion: 0.24
Nodes (12): DeferredMount(), Models(), Projects(), ProjectsCarousel(), WhyWebsite(), useLanguage(), HireMe, Home() (+4 more)

### Community 21 - "Finance.tsx"
Cohesion: 0.07
Nodes (59): isLost(), isWon(), monthShort(), Results(), ym(), Accounts(), buildInsights(), cap() (+51 more)

### Community 22 - "proposalTemplate.ts"
Cohesion: 0.23
Nodes (11): buildProposalTemplate(), downloadProposalTemplate(), num(), parseItems(), parseLinks(), parseProposalTemplate(), ProposalTemplateData, ProposalTemplateFile (+3 more)

### Community 23 - "Lakebase Postgres"
Cohesion: 0.15
Nodes (13): Autoscaling, Branching, Connection Pooling, Gotchas, Instant Restore, IP Allow Lists, Lakebase Postgres, Lakebase Search (+5 more)

### Community 24 - "crmToday.ts"
Cohesion: 0.10
Nodes (34): handler(), iso(), Item, part(), ymd(), Body, NEXT_DUE, daysIn() (+26 more)

### Community 25 - "react"
Cohesion: 0.27
Nodes (7): Hero(), TRAVEL_MS, HeroBalloon(), HeroBalloonProps, HeroIcon, BlocksIcon(), PlaneIcon()

### Community 26 - "LanguageContext.tsx"
Cohesion: 0.29
Nodes (8): dictionaries, LanguageContext, LanguageContextValue, LanguageProvider(), readStoredLocale(), en, pt, TranslationKeys

### Community 27 - "oauth.ts"
Cohesion: 0.14
Nodes (24): Logs: CLI, Loki, and SDK pagination, Loki-compatible read API, callback(), exchangeUnifiedCode(), graphVersion(), panelUrl(), redirectUri(), start() (+16 more)

### Community 28 - "Orçamentos · Neon"
Cohesion: 0.15
Nodes (12): 1. Conectar Neon no projeto Vercel, 2. Variáveis de ambiente, 3. Schema + RLS, 4. Bootstrap do usuário, 5. Importar JSON, 6. Domínio, 7. Instagram (menu **Instagram**), 8. Finanças (menu **Finanças**) (+4 more)

### Community 29 - "json"
Cohesion: 0.11
Nodes (41): handler(), handler(), COUNTS, handler(), handler(), handler(), TABLES, handler() (+33 more)

### Community 30 - "Semantic Vector Search"
Cohesion: 0.22
Nodes (9): Build the Index, Contents, Create the Extension, Prepare Embeddings, Query, Semantic Vector Search, Tune Search, Tune the Index (+1 more)

### Community 31 - "contactEmailHtml.ts"
Cohesion: 0.39
Nodes (8): buildContactAutoReplyHtml(), buildContactNotifyHtml(), EMAIL_THEMES, EmailTheme, escapeHtml(), metaRow(), resolveTheme(), trafficLights()

### Community 32 - "useLanguage"
Cohesion: 0.13
Nodes (12): projects, ProjectSlide(), caseSlug(), projectLogos, LocalizedString, LocalizedStringList, txList(), cases (+4 more)

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
Nodes (54): handler(), handler(), COMMENT_FIELDS, handler(), one(), connectIg(), containerStatus(), createContainer() (+46 more)

### Community 37 - "Managing Lakebase Search with Drizzle"
Cohesion: 0.29
Nodes (7): BM25 Index, Config, Extensions, Managing Lakebase Search with Drizzle, Query, Schema, Tune Per Query

### Community 38 - "Claimable Neon"
Cohesion: 0.29
Nodes (6): Claim, Claimable Neon, If neon claim is missing, Path, With REST, With the CLI

### Community 39 - "prospectFunnel.ts"
Cohesion: 0.08
Nodes (53): BotLeadBody, clip(), Db, findExisting(), handler(), LEAD_FIELDS, listStage(), Outcome (+45 more)

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
Nodes (43): react-dom, peek(), AVATAR, avatarBg(), ClientList(), initials(), ClientSheet(), I (+35 more)

### Community 46 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, headers, regions, rewrites

### Community 51 - "model.ts"
Cohesion: 0.10
Nodes (36): store, Props, TYPES, WEEKDAYS, dueLabel(), greeting(), relTime(), REPEAT_ICON (+28 more)

### Community 52 - "Instagram.tsx"
Cohesion: 0.10
Nodes (41): Account(), blankPost(), Calendar(), CalEntry, Comments(), Composer(), dayKey(), DEFAULT_QUICK (+33 more)

### Community 53 - "pluggy.ts"
Cohesion: 0.11
Nodes (28): handler(), Payload, SYNC_EVENTS, handler(), Hook, webhookUrl(), allTransactions(), apiKey() (+20 more)

### Community 54 - "models.ts"
Cohesion: 0.07
Nodes (5): ContactForm(), isEmail(), Props, ModelId, MODELS

### Community 55 - "SectionFade.tsx"
Cohesion: 0.50
Nodes (7): applySectionFade(), clamp(), clearSectionStyles(), enterAmount(), lerp(), SECTION_IDS, SectionFade()

### Community 56 - "panelStyles.ts"
Cohesion: 0.11
Nodes (25): PRIORITIES, REPEATS, Login(), Props, TrafficLights(), appRoot, btnDanger, btnGhost (+17 more)

### Community 57 - "posts.ts"
Cohesion: 0.20
Nodes (17): handler(), handler(), Body, handler(), KINDS, validUrl(), ALLOWED_TYPES, blobUploadMode() (+9 more)

### Community 58 - "instagram-scheduler.yml"
Cohesion: 0.12
Nodes (16): APP_URL, CRON_SECRET, jobs, publish, name, on, schedule, workflow_dispatch (+8 more)

### Community 59 - "payments.ts"
Cohesion: 0.21
Nodes (12): Body, brl(), day(), handler(), iso(), mapPayment(), Body, day() (+4 more)

### Community 60 - "finance/index.ts"
Cohesion: 0.36
Nodes (10): handler(), handler(), day(), iso(), mapAccount(), mapInvestment(), mapItem(), mapTx() (+2 more)

### Community 61 - "ModelPreview.tsx"
Cohesion: 0.29
Nodes (11): Device, DeviceSwitch(), ExternalIcon(), Model, ModelPreview(), MonitorIcon(), PhoneIcon(), Screen() (+3 more)

### Community 62 - "Pendências do seu lado — CRM Dev Bossle"
Cohesion: 0.18
Nodes (10): 1. Colocar no ar (15 min), 2. Variáveis na Vercel, 3. Agendador de posts (GitHub), 4. Instagram (Meta), 5. Finanças (Pluggy), 6. No celular, 7. Teste rápido (10 min, depois do deploy), 8. O que não deu para testar daqui (+2 more)

### Community 63 - "botTokens.ts"
Cohesion: 0.36
Nodes (7): handler(), BOT_SCOPES, BotScope, hashToken(), isBotScope(), newBotToken(), readBot()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `types/orcamentos.ts` to `Funnel.tsx`, `package.json`, `Panel.tsx`, `Resume.tsx`, `mappers.ts`, `ProposalPdfDocument.tsx`, `Layout.tsx`, `App.tsx`, `dependencies`, `Contato.tsx`, `useLanguage`, `Finance.tsx`, `react`, `LanguageContext.tsx`, `useLanguage`, `ClientSheet.tsx`, `model.ts`, `Instagram.tsx`, `models.ts`, `SectionFade.tsx`, `panelStyles.ts`, `ModelPreview.tsx`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09210526315789473 - nodes in this community are weakly interconnected._
- **Why does `@vercel/node` connect `json` to `auth.ts`, `instagram.ts`, `package.json`, `prospectFunnel.ts`, `oauth.ts`, `mappers.ts`, `pluggy.ts`, `crmToday.ts`, `posts.ts`, `payments.ts`, `finance/index.ts`, `botTokens.ts`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Should `Funnel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.051791629027401385 - nodes in this community are weakly interconnected._
- **Why does `json()` connect `json` to `auth.ts`, `instagram.ts`, `prospectFunnel.ts`, `oauth.ts`, `mappers.ts`, `pluggy.ts`, `crmToday.ts`, `posts.ts`, `payments.ts`, `finance/index.ts`, `botTokens.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Neon` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._