# Graph Report - eu-pedroBossle  (2026-10-30)

## Corpus Check
- 141 files · ~85,567 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .css 2, .ico 1)

## Summary
- 840 nodes · 1941 edges · 51 communities (43 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b88c5ce4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- json
- Funnel.tsx
- prospectFunnel.ts
- Neon
- package.json
- deploy.yml
- Panel.tsx
- Resume.tsx
- types/orcamentos.ts
- compilerOptions
- mappers.ts
- ClientProposal.tsx
- Layout.tsx
- Home.tsx
- downloadResumePdf.ts
- compilerOptions
- downloadProposalPdf.ts
- API do funil de prospecção — guia para os bots
- dependencies
- react
- Cases.tsx
- HireMe.tsx
- proposalTemplate.ts
- Lakebase Postgres
- optimize-logos.mjs
- Hero.tsx
- LanguageContext.tsx
- sharePassword.ts
- Orçamentos · Neon
- projectLogos.ts
- Semantic Vector Search
- contactEmailHtml.ts
- useLanguage
- hybrid-search.md
- vite.config.ts
- scripts
- SectionFade.tsx
- Managing Lakebase Search with Drizzle
- Claimable Neon
- ContractDocument.tsx
- Full-Text Search with BM25 Ranking
- Setup Flow
- Troubleshooting and Neon-Specific Performance
- React + TypeScript + Vite
- Logs: CLI, Loki, and SDK pagination
- tsconfig.json
- vercel.json
- function-triggers.md
- parse-env.md
- sdk.md

## God Nodes (most connected - your core abstractions)
1. `json()` - 62 edges
2. `withAuth()` - 38 edges
3. `readBody()` - 37 edges
4. `@vercel/node` - 33 edges
5. `requireSession()` - 31 edges
6. `react` - 28 edges
7. `Panel()` - 27 edges
8. `withDb()` - 22 edges
9. `useLanguage()` - 22 edges
10. `maskPhoneBr()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `handler()` --calls--> `maskCpfCnpj()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/documentMask.ts
- `handler()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_handlers/clients/index.ts → src/lib/phoneMask.ts
- `mapClient()` --calls--> `maskCpfCnpj()`  [EXTRACTED]
  api/_lib/mappers.ts → src/lib/documentMask.ts
- `mapClient()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_lib/mappers.ts → src/lib/phoneMask.ts
- `buildProposalEmailHtml()` --calls--> `maskPhoneBr()`  [EXTRACTED]
  api/_lib/proposalEmailHtml.ts → src/lib/phoneMask.ts

## Import Cycles
- None detected.

## Communities (51 total, 8 thin omitted)

### Community 0 - "json"
Cohesion: 0.07
Nodes (84): handler(), hashToken(), isEmail(), AuthRow, fetchUser(), handler(), tooManyAttempts(), handler() (+76 more)

### Community 1 - "Funnel.tsx"
Cohesion: 0.06
Nodes (66): WhatsAppIcon(), ALIASES, buildMessage(), contactInfo(), CSV_COLUMNS, DEFAULT_CITY, downloadText(), firstProblem() (+58 more)

### Community 2 - "prospectFunnel.ts"
Cohesion: 0.07
Nodes (39): BotLeadBody, clip(), findExisting(), Actor, ACTOR_LABEL, ALL_STAGES, ALLOWED_CITIES, BOT_TRANSITIONS (+31 more)

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
Cohesion: 0.12
Nodes (25): MailIcon(), itemsFromTimeline(), PRESET_SECTIONS, timelineLines(), buildShareClientMessage(), whatsappPhoneE164(), whatsappShareUrl(), digitsOnly() (+17 more)

### Community 7 - "Resume.tsx"
Cohesion: 0.15
Nodes (20): resume, InstagramIcon(), resume, splitSkillItems(), Stack(), tx(), CertificateLink(), CompanyLinks() (+12 more)

### Community 8 - "types/orcamentos.ts"
Cohesion: 0.19
Nodes (16): buildProposalEmailHtml(), escapeHtml(), isHttpUrl(), moneyBrl(), BotToken, ContactLead, OrcamentoClient, OrcamentoComment (+8 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "mappers.ts"
Cohesion: 0.23
Nodes (15): handler(), isoOrNull(), mapProfile(), PRESET_SECTIONS, documentDigits(), isCnpj(), maskCpfCnpj(), buildContractPayload() (+7 more)

### Community 11 - "ClientProposal.tsx"
Cohesion: 0.20
Nodes (15): proposalValidityEnd(), proposalValidityStart(), ClientProposal(), formatWhen(), Props, statusClass(), downloadProposalPdf(), proposalPdfFilename() (+7 more)

### Community 12 - "Layout.tsx"
Cohesion: 0.20
Nodes (14): lenis, Footer(), Layout(), SectionFade, LangButton(), Nav(), NAV_LINKS, SectionLink() (+6 more)

### Community 13 - "Home.tsx"
Cohesion: 0.20
Nodes (12): App(), isOrcamentosHost(), OrcamentosApp, ResumePage, DeferredMount(), WhyWebsite(), Cases, HireMe (+4 more)

### Community 14 - "downloadResumePdf.ts"
Cohesion: 0.21
Nodes (16): jspdf@^4.2.1, jspdf, addPageLinks(), applyPrintLayout(), BlockRange, downloadResumePdf(), hidePdfExtras(), loadImage() (+8 more)

### Community 15 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 16 - "downloadProposalPdf.ts"
Cohesion: 0.19
Nodes (13): buildProposalPdf(), contentBottomY(), EMAIL_PDF_MAX_BASE64_CHARS, loadImage(), measureRanges(), nextPageEnd(), PdfBuildOptions, proposalPdfBase64() (+5 more)

### Community 17 - "API do funil de prospecção — guia para os bots"
Cohesion: 0.13
Nodes (14): 1. Conexão, 2. O funil, 3.1 Checar duplicado — `GET /bot/leads`, 3.2 Cadastrar ou atualizar — `POST /bot/leads`, 3.3 Descartar um lead — `POST /bot/move`, 3. Bot Dev Bossle (`prospector`), 4.1 Fila de envio — `GET /bot/queue`, 4.2 Registrar o que aconteceu — `POST /bot/move` (+6 more)

### Community 18 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, bcryptjs@^3.0.3, cookie@^2.0.1, jose@^6.2.12, lenis@^1.3.26, modern-screenshot@^4.7.0, react@^19.2.8, react-router@^8.4.0 (+7 more)

### Community 19 - "react"
Cohesion: 0.27
Nodes (12): react, react-router, orcamentosApi, Login(), Props, TrafficLights(), OrcamentosApp(), publicTokenFromPath() (+4 more)

### Community 20 - "Cases.tsx"
Cohesion: 0.23
Nodes (11): react-dom@^19.2.8, react-dom, CaseBody(), Cases(), prefersDesktopLayout(), projects, Locale, LocalizedString (+3 more)

### Community 21 - "HireMe.tsx"
Cohesion: 0.22
Nodes (11): HireMe(), isEmail(), darkFields, DEFAULT_HIRE_STYLE_ID, ensureHireFont(), getHireStyle(), HIRE_STYLES, HireStyle (+3 more)

### Community 22 - "proposalTemplate.ts"
Cohesion: 0.21
Nodes (12): applyProposalTemplate(), buildProposalTemplate(), downloadProposalTemplate(), num(), parseItems(), parseLinks(), parseProposalTemplate(), ProposalTemplateData (+4 more)

### Community 23 - "Lakebase Postgres"
Cohesion: 0.15
Nodes (13): Autoscaling, Branching, Connection Pooling, Gotchas, Instant Restore, IP Allow Lists, Lakebase Postgres, Lakebase Search (+5 more)

### Community 24 - "optimize-logos.mjs"
Cohesion: 0.18
Nodes (6): pool, sqlFiles, files, logosDir, map, root

### Community 25 - "Hero.tsx"
Cohesion: 0.27
Nodes (7): Hero(), TRAVEL_MS, HeroBalloon(), HeroBalloonProps, HeroIcon, BlocksIcon(), PlaneIcon()

### Community 26 - "LanguageContext.tsx"
Cohesion: 0.29
Nodes (8): dictionaries, LanguageContext, LanguageContextValue, LanguageProvider(), readStoredLocale(), en, pt, TranslationKeys

### Community 27 - "sharePassword.ts"
Cohesion: 0.40
Nodes (7): buildPasswordResetEmailHtml(), escapeHtml(), passwordResetUrl(), ALLOWED_HOSTS, appPathPrefix(), resolvePublicBaseUrl(), publicProposalUrl()

### Community 28 - "Orçamentos · Neon"
Cohesion: 0.20
Nodes (9): 1. Conectar Neon no projeto Vercel, 2. Variáveis de ambiente, 3. Schema + RLS, 4. Bootstrap do usuário, 5. Importar JSON, 6. Domínio, E-mail (Resend), Orçamentos · Neon (+1 more)

### Community 30 - "Semantic Vector Search"
Cohesion: 0.22
Nodes (9): Build the Index, Contents, Create the Extension, Prepare Embeddings, Query, Semantic Vector Search, Tune Search, Tune the Index (+1 more)

### Community 31 - "contactEmailHtml.ts"
Cohesion: 0.39
Nodes (8): buildContactAutoReplyHtml(), buildContactNotifyHtml(), EMAIL_THEMES, EmailTheme, escapeHtml(), metaRow(), resolveTheme(), trafficLights()

### Community 32 - "useLanguage"
Cohesion: 0.44
Nodes (6): Projects(), projects, ProjectsCarousel(), ProjectSlide(), useLanguage(), txList()

### Community 33 - "hybrid-search.md"
Cohesion: 0.43
Nodes (3): Adapt the Hybrid Search, Hybrid Search, RRF Example

### Community 34 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.2.0, @vitejs/plugin-react@^6.0.4, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 35 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, db:migrate, dev, dev:app, lint, optimize:logos, preview

### Community 36 - "SectionFade.tsx"
Cohesion: 0.50
Nodes (7): applySectionFade(), clamp(), clearSectionStyles(), enterAmount(), lerp(), SECTION_IDS, SectionFade()

### Community 37 - "Managing Lakebase Search with Drizzle"
Cohesion: 0.29
Nodes (7): BM25 Index, Config, Extensions, Managing Lakebase Search with Drizzle, Query, Schema, Tune Per Query

### Community 38 - "Claimable Neon"
Cohesion: 0.29
Nodes (6): Claim, Claimable Neon, If neon claim is missing, Path, With REST, With the CLI

### Community 39 - "ContractDocument.tsx"
Cohesion: 0.48
Nodes (6): ContractPayload, Clause(), ContractDocument(), moneyBrlInline(), paymentLines(), Row()

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

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `useLanguage`, `Funnel.tsx`, `package.json`, `SectionFade.tsx`, `Panel.tsx`, `ContractDocument.tsx`, `Resume.tsx`, `ClientProposal.tsx`, `Layout.tsx`, `Home.tsx`, `dependencies`, `Cases.tsx`, `HireMe.tsx`, `Hero.tsx`, `LanguageContext.tsx`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.06814794743259721 - nodes in this community are weakly interconnected._
- **Why does `@vercel/node` connect `json` to `prospectFunnel.ts`, `mappers.ts`, `package.json`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `Funnel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0647887323943662 - nodes in this community are weakly interconnected._
- **Why does `json()` connect `json` to `prospectFunnel.ts`, `mappers.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `prospectFunnel.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07087486157253599 - nodes in this community are weakly interconnected._
- **Should `Neon` be split into smaller, more focused modules?**
  _Cohesion score 0.05263157894736842 - nodes in this community are weakly interconnected._