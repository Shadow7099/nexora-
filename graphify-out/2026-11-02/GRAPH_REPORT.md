# Graph Report - nexora-  (2026-11-01)

## Corpus Check
- 166 files · ~74,837 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 943 nodes · 3480 edges · 33 communities (28 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e6ce92c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireActor
- audit
- SubmitButton
- attendance.ts
- schedule.ts
- (auth)/actions.ts
- requireCompanyAdmin
- attendance.spec.ts
- server/payroll.ts
- package.json
- dependencies
- sessions.ts
- compilerOptions
- Nexora: Arquitectura
- gestion-actions.ts
- proxy.ts
- devDependencies
- scripts
- AppError
- schedules.ts
- overtime.ts
- src/app/layout.tsx
- apple-icon.tsx
- eslint.config.mjs
- next.config.ts
- corrections.ts
- Nexora: guía para continuar en un chat nuevo
- devices.ts
- qr/[id]/page.tsx
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 73 edges
2. `requireCompanyAdmin()` - 60 edges
3. `next` - 54 edges
4. `AppError` - 54 edges
5. `Card()` - 50 edges
6. `lucide-react` - 49 edges
7. `audit()` - 46 edges
8. `SubmitButton()` - 45 edges
9. `cn()` - 44 edges
10. `FormAlert()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `4. Reglas del proyecto (no negociables)` --references--> `requireCompanyAdmin()`  [INFERRED]
  docs/CONTINUAR.md → src/server/authz.ts
- `4. Reglas del proyecto (no negociables)` --references--> `requireEmployee()`  [INFERRED]
  docs/CONTINUAR.md → src/server/authz.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `listLaborParameters()`  [INFERRED]
  docs/CONTINUAR.md → src/server/payroll.ts

## Import Cycles
- None detected.

## Communities (33 total, 5 thin omitted)

### Community 0 - "requireActor"
Cohesion: 0.05
Nodes (138): class-variance-authority, lucide-react, next, AttendancePage(), metadata, statusBadge, metadata, SettingsPage() (+130 more)

### Community 1 - "audit"
Cohesion: 0.30
Nodes (13): audit(), createSite(), getSite(), locationSchema, newPublicCode(), openingRows(), rotateQr(), setSiteActive() (+5 more)

### Community 2 - "SubmitButton"
Cohesion: 0.07
Nodes (70): react, SettingsForm(), EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), Values, Form() (+62 more)

### Community 3 - "attendance.ts"
Cohesion: 0.07
Nodes (61): @simplewebauthn/browser, @simplewebauthn/server, EmployeeHomePage(), metadata, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction(), punchAction() (+53 more)

### Community 4 - "schedule.ts"
Cohesion: 0.08
Nodes (47): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), dotenv (+39 more)

### Community 5 - "(auth)/actions.ts"
Cohesion: 0.15
Nodes (18): changePasswordAction(), changeSchema, consentAction(), loginAction(), safeNext(), ConsentPage(), items, metadata (+10 more)

### Community 6 - "requireCompanyAdmin"
Cohesion: 0.30
Nodes (15): requireCompanyAdmin(), getCompanySettings(), updateCompanySettings(), addContractVersion(), assertSite(), createEmployee(), d(), getEmployee() (+7 more)

### Community 7 - "attendance.spec.ts"
Cohesion: 0.06
Nodes (9): PORT, pg, @playwright/test, client, CENTRO, FAR, PEOPLE, pages (+1 more)

### Community 8 - "server/payroll.ts"
Cohesion: 0.05
Nodes (65): Fase 6 · Pre-nómina estimada ✅ (hecha), LABOR_PARAMETERS, LaborParameterSeed, q(), rows, computePayrollAction(), addParameterVersionAction(), echo() (+57 more)

### Community 9 - "package.json"
Cohesion: 0.10
Nodes (19): engines, node, name, private, version, clsx, @node-rs/argon2, @prisma/client (+11 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, class-variance-authority, clsx, dotenv, geist, lucide-react, next, next-themes (+13 more)

### Community 11 - "sessions.ts"
Cohesion: 0.14
Nodes (22): vitest, db, hashPassword(), OPTIONS, verifyPassword(), authenticate(), changePassword(), createSession() (+14 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.05
Nodes (42): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 8. Datos personales (Ley 1581 de 2012) (+34 more)

### Community 14 - "gestion-actions.ts"
Cohesion: 0.14
Nodes (36): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+28 more)

### Community 15 - "proxy.ts"
Cohesion: 0.40
Nodes (3): config, COOKIES, PRIVATE

### Community 16 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/turbopack, tsx, @types/node (+6 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "AppError"
Cohesion: 0.16
Nodes (20): AppError, notFound(), ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap(), cancelNovelty(), d(), decideNovelty() (+12 more)

### Community 19 - "schedules.ts"
Cohesion: 0.23
Nodes (13): clearOverride(), d(), getEmployeeSchedule(), isoDate, isUuid(), overrideSchema, ownEmployee(), patternSchema (+5 more)

### Community 20 - "overtime.ts"
Cohesion: 0.15
Nodes (13): server-only, globalForPrisma, companySettingsSchema, AuditEntry, Tx, listCompanies(), settingsSelect, forbidden() (+5 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 26 - "corrections.ts"
Cohesion: 0.16
Nodes (17): zod, zonedTimeToUtc(), contractSchema, employeeSchema, fieldErrors(), isoDate, loginSchema, money (+9 more)

### Community 28 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.17
Nodes (11): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+3 more)

### Community 29 - "devices.ts"
Cohesion: 0.20
Nodes (12): employeeHistory(), STALE_SESSION_HOURS, approveDevice(), bindDevice(), deviceLabel(), getCompanyDevice(), hashDeviceToken(), revokeDevice() (+4 more)

### Community 30 - "qr/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): qrcode, metadata, PrintQrPage(), PrintButton(), publicBaseUrl(), qrSvg(), getSiteForAdmin()

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 296 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `SubmitButton`, `attendance.ts`, `(auth)/actions.ts`, `server/payroll.ts`, `Nexora: Arquitectura`, `gestion-actions.ts`, `qr/[id]/page.tsx`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireActor` be split into smaller, more focused modules?**
  _Cohesion score 0.0504608032768233 - nodes in this community are weakly interconnected._
- **Why does `next` connect `requireActor` to `SubmitButton`, `attendance.ts`, `(auth)/actions.ts`, `server/payroll.ts`, `package.json`, `gestion-actions.ts`, `proxy.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `next.config.ts`, `qr/[id]/page.tsx`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **Should `SubmitButton` be split into smaller, more focused modules?**
  _Cohesion score 0.07023564401738733 - nodes in this community are weakly interconnected._
- **Why does `3. Sesiones y autorización` connect `Nexora: Arquitectura` to `requireActor`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Should `attendance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07394366197183098 - nodes in this community are weakly interconnected._