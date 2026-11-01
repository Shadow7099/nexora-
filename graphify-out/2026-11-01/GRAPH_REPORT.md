# Graph Report - nexora-  (2026-11-01)

## Corpus Check
- 165 files · ~73,864 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 935 nodes · 3427 edges · 36 communities (31 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df468b60`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireActor
- requireCompanyAdmin
- gestion-actions.ts
- m/actions.ts
- modules.ts
- current.ts
- employees.ts
- attendance.spec.ts
- lib/payroll.ts
- package.json
- dependencies
- sessions.ts
- compilerOptions
- Nexora: Arquitectura
- attendance.ts
- proxy.ts
- devDependencies
- scripts
- novelties.ts
- server/payroll.ts
- errors.ts
- src/app/layout.tsx
- apple-icon.tsx
- eslint.config.mjs
- next.config.ts
- schedule.ts
- db.ts
- Nexora: guía para continuar en un chat nuevo
- devices.ts
- qr/[id]/page.tsx
- geo.ts
- labor-parameters.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 73 edges
2. `requireCompanyAdmin()` - 60 edges
3. `next` - 53 edges
4. `AppError` - 53 edges
5. `Card()` - 50 edges
6. `lucide-react` - 48 edges
7. `SubmitButton()` - 45 edges
8. `audit()` - 45 edges
9. `cn()` - 44 edges
10. `FormAlert()` - 41 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `commercialDays()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `periodFor()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `classifyMinutes()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `estimatePayroll()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts

## Import Cycles
- None detected.

## Communities (36 total, 5 thin omitted)

### Community 0 - "requireActor"
Cohesion: 0.05
Nodes (131): class-variance-authority, lucide-react, next, AttendancePage(), metadata, statusBadge, metadata, SettingsPage() (+123 more)

### Community 1 - "requireCompanyAdmin"
Cohesion: 0.13
Nodes (42): fieldErrors(), audit(), requireCompanyAdmin(), updateCompanySettings(), addManualSession(), closeSessionManually(), toMin(), AppError (+34 more)

### Community 2 - "gestion-actions.ts"
Cohesion: 0.05
Nodes (100): react, SettingsForm(), EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), Values, addManualSessionAction() (+92 more)

### Community 3 - "m/actions.ts"
Cohesion: 0.09
Nodes (50): @simplewebauthn/browser, EmployeeHomePage(), metadata, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction(), punchAction(), PunchActionResult (+42 more)

### Community 4 - "modules.ts"
Cohesion: 0.22
Nodes (15): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+7 more)

### Community 5 - "current.ts"
Cohesion: 0.14
Nodes (22): changePasswordAction(), changeSchema, consentAction(), loginAction(), logoutAction(), safeNext(), ConsentPage(), items (+14 more)

### Community 6 - "employees.ts"
Cohesion: 0.23
Nodes (21): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+13 more)

### Community 7 - "attendance.spec.ts"
Cohesion: 0.06
Nodes (9): PORT, pg, @playwright/test, client, CENTRO, FAR, PEOPLE, pages (+1 more)

### Community 8 - "lib/payroll.ts"
Cohesion: 0.09
Nodes (34): addDays(), blockedResult(), bump(), classifyMinutes(), commercialDays(), ContractInput, cop(), emptySummary() (+26 more)

### Community 9 - "package.json"
Cohesion: 0.09
Nodes (22): engines, node, name, private, version, clsx, dotenv, @node-rs/argon2 (+14 more)

### Community 10 - "dependencies"
Cohesion: 0.10
Nodes (21): dependencies, class-variance-authority, clsx, dotenv, geist, lucide-react, next, next-themes (+13 more)

### Community 11 - "sessions.ts"
Cohesion: 0.15
Nodes (22): vitest, db, hashPassword(), OPTIONS, verifyPassword(), authenticate(), changePassword(), createSession() (+14 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.05
Nodes (42): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 8. Datos personales (Ley 1581 de 2012) (+34 more)

### Community 14 - "attendance.ts"
Cohesion: 0.15
Nodes (24): localDate(), OverrideInput, attendanceDay(), DayStatus, employeeHistory(), employeeToday(), MIN_SECONDS_BETWEEN_PUNCHES, PunchResult (+16 more)

### Community 15 - "proxy.ts"
Cohesion: 0.40
Nodes (3): config, COOKIES, PRIVATE

### Community 16 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/turbopack, tsx, @types/node (+6 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "novelties.ts"
Cohesion: 0.13
Nodes (19): zod, companySettingsSchema, contractSchema, employeeSchema, isoDate, loginSchema, money, PASSWORD_MIN (+11 more)

### Community 19 - "server/payroll.ts"
Cohesion: 0.18
Nodes (19): Fase 6 · Pre-nómina estimada ✅ (hecha), CONCEPT_LABEL, NoveltyKind, periodFrequency(), Warning, addLaborParameterVersion(), computePayroll(), CONCEPT_ORDER (+11 more)

### Community 20 - "errors.ts"
Cohesion: 0.18
Nodes (12): server-only, AuditEntry, Tx, requireSuperadmin(), getCompanySettings(), listCompanies(), settingsSelect, listSessionsToReview() (+4 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 26 - "schedule.ts"
Cohesion: 0.25
Nodes (12): currentOrNextShift(), cycleIndex(), isoOf(), PatternDayInput, PatternInput, ResolvedShift, shiftsOn(), toDay() (+4 more)

### Community 27 - "db.ts"
Cohesion: 0.24
Nodes (9): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), @prisma/adapter-pg (+1 more)

### Community 28 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.17
Nodes (11): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+3 more)

### Community 29 - "devices.ts"
Cohesion: 0.24
Nodes (8): STALE_SESSION_HOURS, approveDevice(), getCompanyDevice(), revokeDevice(), at(), rp, setup(), t0

### Community 30 - "qr/[id]/page.tsx"
Cohesion: 0.33
Nodes (7): qrcode, metadata, PrintQrPage(), PrintButton(), publicBaseUrl(), qrSvg(), getSiteForAdmin()

### Community 31 - "geo.ts"
Cohesion: 0.33
Nodes (6): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), site

### Community 32 - "labor-parameters.ts"
Cohesion: 0.47
Nodes (4): LABOR_PARAMETERS, LaborParameterSeed, q(), rows

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 297 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `gestion-actions.ts`, `m/actions.ts`, `current.ts`, `employees.ts`, `Nexora: Arquitectura`, `qr/[id]/page.tsx`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireActor` be split into smaller, more focused modules?**
  _Cohesion score 0.053094504365690805 - nodes in this community are weakly interconnected._
- **Why does `next` connect `requireActor` to `gestion-actions.ts`, `m/actions.ts`, `current.ts`, `employees.ts`, `package.json`, `proxy.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `next.config.ts`, `qr/[id]/page.tsx`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Should `requireCompanyAdmin` be split into smaller, more focused modules?**
  _Cohesion score 0.1347517730496454 - nodes in this community are weakly interconnected._
- **Why does `3. Sesiones y autorización` connect `Nexora: Arquitectura` to `requireActor`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `gestion-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05228838582677165 - nodes in this community are weakly interconnected._