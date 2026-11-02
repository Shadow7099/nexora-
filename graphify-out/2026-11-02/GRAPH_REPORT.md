# Graph Report - nexora-  (2026-11-02)

## Corpus Check
- 176 files · ~84,170 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1040 nodes · 3871 edges · 38 communities (33 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c405290e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- requireActor
- requireCompanyAdmin
- SubmitButton
- attendance.ts
- localDate
- server/reports.ts
- employees.ts
- @playwright/test
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
- novelties.ts
- [tipo]/page.tsx
- overtime.ts
- src/app/layout.tsx
- apple-icon.tsx
- lib/payroll.ts
- next.config.ts
- reportes/page.tsx
- modules.ts
- unit/payroll.test.ts
- devices.ts
- plataforma/parametros/page.tsx
- guarantees.test.ts
- seed.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- attendance.spec.ts
- periodFor

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 75 edges
2. `requireCompanyAdmin()` - 63 edges
3. `AppError` - 59 edges
4. `next` - 56 edges
5. `Card()` - 54 edges
6. `lucide-react` - 51 edges
7. `audit()` - 46 edges
8. `SubmitButton()` - 45 edges
9. `cn()` - 44 edges
10. `PageHeader()` - 41 edges

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

## Communities (38 total, 5 thin omitted)

### Community 0 - "requireActor"
Cohesion: 0.05
Nodes (133): class-variance-authority, lucide-react, next, qrcode, AttendancePage(), metadata, statusBadge, metadata (+125 more)

### Community 1 - "requireCompanyAdmin"
Cohesion: 0.13
Nodes (43): fieldErrors(), audit(), requireCompanyAdmin(), updateCompanySettings(), addManualSession(), closeSessionManually(), toMin(), AppError (+35 more)

### Community 2 - "SubmitButton"
Cohesion: 0.05
Nodes (89): react, SettingsForm(), EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), Values, computePayrollAction() (+81 more)

### Community 3 - "attendance.ts"
Cohesion: 0.06
Nodes (75): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+67 more)

### Community 4 - "localDate"
Cohesion: 0.22
Nodes (19): currentOrNextShift(), cycleIndex(), isoOf(), localDate(), PatternDayInput, PatternInput, ResolvedShift, shiftsOn() (+11 more)

### Community 5 - "server/reports.ts"
Cohesion: 0.14
Nodes (34): Fase 7 · Dashboard y reportes ✅ (hecha), toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus, daysBetween() (+26 more)

### Community 6 - "employees.ts"
Cohesion: 0.19
Nodes (23): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+15 more)

### Community 7 - "@playwright/test"
Cohesion: 0.11
Nodes (4): PORT, exceljs, @playwright/test, pages

### Community 8 - "server/payroll.ts"
Cohesion: 0.15
Nodes (23): Fase 6 · Pre-nómina estimada ✅ (hecha), addParameterVersionAction(), echo(), superadmin(), verifyParameterAction(), CONCEPT_LABEL, NoveltyKind, periodFrequency() (+15 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (25): eslintConfig, engines, node, name, private, version, clsx, dotenv (+17 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, dotenv, exceljs, geist, jspdf, jspdf-autotable (+17 more)

### Community 11 - "sessions.ts"
Cohesion: 0.12
Nodes (25): vitest, hashPassword(), OPTIONS, verifyPassword(), authenticate(), changePassword(), createSession(), getDummyHash() (+17 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.05
Nodes (42): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 8. Datos personales (Ley 1581 de 2012) (+34 more)

### Community 14 - "gestion-actions.ts"
Cohesion: 0.32
Nodes (19): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+11 more)

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
Cohesion: 0.19
Nodes (16): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap() (+8 more)

### Community 19 - "[tipo]/page.tsx"
Cohesion: 0.15
Nodes (25): jspdf, jspdf-autotable, GET(), TYPES, metadata, NUMERIC, ReportPreviewPage(), Cell (+17 more)

### Community 20 - "overtime.ts"
Cohesion: 0.10
Nodes (27): server-only, zod, db, globalForPrisma, companySettingsSchema, contractSchema, employeeSchema, isoDate (+19 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lib/payroll.ts"
Cohesion: 0.14
Nodes (19): addDays(), blockedResult(), bump(), classifyMinutes(), ContractInput, cop(), emptySummary(), estimatePayroll() (+11 more)

### Community 26 - "reportes/page.tsx"
Cohesion: 0.23
Nodes (21): delta(), metadata, qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP() (+13 more)

### Community 27 - "modules.ts"
Cohesion: 0.19
Nodes (17): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+9 more)

### Community 28 - "unit/payroll.test.ts"
Cohesion: 0.17
Nodes (12): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, EstimateInput, ParamRow, SessionInput, amount() (+4 more)

### Community 29 - "devices.ts"
Cohesion: 0.26
Nodes (7): approveDevice(), getCompanyDevice(), revokeDevice(), at(), rp, setup(), t0

### Community 30 - "plataforma/parametros/page.tsx"
Cohesion: 0.26
Nodes (10): metadata, ParametersPage(), metadata, date(), fmt, ParameterTable(), Row, formatParamValue() (+2 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.18
Nodes (3): pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.33
Nodes (8): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), @prisma/adapter-pg

### Community 36 - "attendance.spec.ts"
Cohesion: 0.25
Nodes (3): CENTRO, FAR, PEOPLE

### Community 37 - "periodFor"
Cohesion: 0.40
Nodes (6): commercialDays(), fmtDate(), lastDayOfMonth(), periodFor(), ymd(), defaultPeriod()

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 319 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `requireActor` to `SubmitButton`, `attendance.ts`, `employees.ts`, `server/payroll.ts`, `package.json`, `gestion-actions.ts`, `proxy.ts`, `novelties.ts`, `[tipo]/page.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `next.config.ts`, `reportes/page.tsx`, `plataforma/parametros/page.tsx`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireActor` be split into smaller, more focused modules?**
  _Cohesion score 0.0514021497628055 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `SubmitButton`, `attendance.ts`, `employees.ts`, `server/payroll.ts`, `Nexora: Arquitectura`, `gestion-actions.ts`, `novelties.ts`, `[tipo]/page.tsx`, `reportes/page.tsx`, `plataforma/parametros/page.tsx`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Should `requireCompanyAdmin` be split into smaller, more focused modules?**
  _Cohesion score 0.13095238095238096 - nodes in this community are weakly interconnected._
- **Why does `3. Sesiones y autorización` connect `Nexora: Arquitectura` to `requireActor`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `SubmitButton` be split into smaller, more focused modules?**
  _Cohesion score 0.052023988005997 - nodes in this community are weakly interconnected._