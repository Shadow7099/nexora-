# Graph Report - nexora-  (2026-11-02)

## Corpus Check
- 184 files · ~87,507 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1082 nodes · 4079 edges · 46 communities (41 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c75703c4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- notFound
- SubmitButton
- m/actions.ts
- schedule.ts
- server/reports.ts
- AppError
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
- reportes/page.tsx
- phase35.test.ts
- src/app/layout.tsx
- apple-icon.tsx
- cn
- next.config.ts
- devices.ts
- modules.ts
- empleados/[id]/page.tsx
- attendance.test.ts
- requireActor
- attendance.spec.ts
- db.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- next
- errors.ts
- attendance.ts
- (auth)/actions.ts
- utils.ts
- platform.test.ts
- admin/actions.ts
- horarios/[id]/page.tsx
- autorizacion/page.tsx
- guarantees.test.ts

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 81 edges
2. `AppError` - 64 edges
3. `requireCompanyAdmin()` - 63 edges
4. `next` - 60 edges
5. `Card()` - 58 edges
6. `lucide-react` - 53 edges
7. `audit()` - 50 edges
8. `SubmitButton()` - 49 edges
9. `PageHeader()` - 45 edges
10. `cn()` - 44 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `4. Reglas del proyecto (no negociables)` --references--> `requireCompanyAdmin()`  [INFERRED]
  docs/CONTINUAR.md → src/server/authz.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `listLaborParameters()`  [INFERRED]
  docs/CONTINUAR.md → src/server/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `computePayroll()`  [INFERRED]
  docs/CONTINUAR.md → src/server/payroll.ts

## Import Cycles
- None detected.

## Communities (46 total, 5 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.13
Nodes (22): lucide-react, EmployeeLayout(), AuthLayout(), features, Home(), DesignSystemPage(), metadata, Section() (+14 more)

### Community 1 - "notFound"
Cohesion: 0.22
Nodes (16): notFound(), clearOverride(), d(), getEmployeeSchedule(), isoDate, isUuid(), overrideSchema, ownEmployee() (+8 more)

### Community 2 - "SubmitButton"
Cohesion: 0.07
Nodes (68): react, SettingsForm(), EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), Values, Form() (+60 more)

### Community 3 - "m/actions.ts"
Cohesion: 0.07
Nodes (64): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+56 more)

### Community 4 - "schedule.ts"
Cohesion: 0.25
Nodes (11): currentOrNextShift(), cycleIndex(), isoOf(), OverrideInput, PatternDayInput, PatternInput, ResolvedShift, shiftsOn() (+3 more)

### Community 5 - "server/reports.ts"
Cohesion: 0.15
Nodes (33): Fase 7 · Dashboard y reportes ✅ (hecha), toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus, daysBetween() (+25 more)

### Community 6 - "AppError"
Cohesion: 0.26
Nodes (21): fieldErrors(), audit(), requireCompanyAdmin(), getCompanySettings(), listCompanies(), settingsSelect, updateCompanySettings(), addContractVersion() (+13 more)

### Community 7 - "@playwright/test"
Cohesion: 0.09
Nodes (4): PORT, exceljs, @playwright/test, pages

### Community 8 - "server/payroll.ts"
Cohesion: 0.06
Nodes (59): Fase 6 · Pre-nómina estimada ✅ (hecha), LABOR_PARAMETERS, LaborParameterSeed, q(), rows, addParameterVersionAction(), echo(), superadmin() (+51 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (27): eslintConfig, engines, node, name, private, version, class-variance-authority, clsx (+19 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, dotenv, exceljs, geist, jspdf, jspdf-autotable (+17 more)

### Community 11 - "sessions.ts"
Cohesion: 0.20
Nodes (14): authenticate(), createSession(), hashIp(), hashToken(), IP_WINDOW_MINUTES, ipThrottled(), LOCK_MINUTES, LoginResult (+6 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.05
Nodes (42): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 8. Datos personales (Ley 1581 de 2012) (+34 more)

### Community 14 - "gestion-actions.ts"
Cohesion: 0.30
Nodes (20): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+12 more)

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
Cohesion: 0.12
Nodes (26): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), day(), EMPLOYEE_TYPES, metadata (+18 more)

### Community 19 - "reportes/page.tsx"
Cohesion: 0.10
Nodes (44): GET(), TYPES, delta(), metadata, qs(), ReportsPage(), metadata, NUMERIC (+36 more)

### Community 20 - "phase35.test.ts"
Cohesion: 0.15
Nodes (26): server-only, db, localDate(), zonedTimeToUtc(), attendanceDay(), addManualSession(), closeSessionManually(), reason (+18 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "cn"
Cohesion: 0.15
Nodes (24): EmployeesPage(), metadata, fmt, href(), label(), metadata, PayrollPage(), day() (+16 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "devices.ts"
Cohesion: 0.13
Nodes (20): zod, AuditEntry, Tx, approveDevice(), getCompanyDevice(), revokeDevice(), forbidden(), Actor (+12 more)

### Community 27 - "modules.ts"
Cohesion: 0.22
Nodes (15): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+7 more)

### Community 28 - "empleados/[id]/page.tsx"
Cohesion: 0.24
Nodes (21): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+13 more)

### Community 29 - "attendance.test.ts"
Cohesion: 0.14
Nodes (15): vitest, employeeHistory(), STALE_SESSION_HOURS, bindDevice(), deviceLabel(), at(), rp, setup() (+7 more)

### Community 30 - "requireActor"
Cohesion: 0.12
Nodes (34): metadata, NewEmployeePage(), AdminLayout(), metadata, ParametersPage(), metadata, NewSitePage(), logoutAction() (+26 more)

### Community 31 - "attendance.spec.ts"
Cohesion: 0.14
Nodes (5): pg, CENTRO, FAR, PEOPLE, TEST_DATABASE_URL

### Community 32 - "db.ts"
Cohesion: 0.19
Nodes (11): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), dotenv (+3 more)

### Community 36 - "next"
Cohesion: 0.16
Nodes (15): next, hhmm(), metadata, SitePage(), dayShort, metadata, SitesPage(), metadata (+7 more)

### Community 37 - "errors.ts"
Cohesion: 0.17
Nodes (17): computePayrollAction(), createCompanyAction(), echo(), resetAdminPasswordAction(), setCompanyStatusAction(), superadmin(), requireSuperadmin(), temporaryPassword() (+9 more)

### Community 38 - "attendance.ts"
Cohesion: 0.13
Nodes (17): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), DayStatus, employeeToday(), logAttempt() (+9 more)

### Community 39 - "(auth)/actions.ts"
Cohesion: 0.16
Nodes (17): changePasswordAction(), changeSchema, consentAction(), loginAction(), safeNext(), companySettingsSchema, contractSchema, employeeSchema (+9 more)

### Community 40 - "utils.ts"
Cohesion: 0.23
Nodes (12): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), day(), HistoryPage() (+4 more)

### Community 41 - "platform.test.ts"
Cohesion: 0.23
Nodes (9): @node-rs/argon2, hashPassword(), OPTIONS, verifyPassword(), getDummyHash(), superadmin(), newEmployeeInput(), PASSWORD (+1 more)

### Community 42 - "admin/actions.ts"
Cohesion: 0.40
Nodes (10): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+2 more)

### Community 43 - "horarios/[id]/page.tsx"
Cohesion: 0.35
Nodes (9): EmployeeSchedulePage(), fmtDate(), metadata, hhmm(), metadata, SchedulesPage(), short(), minutesToClock() (+1 more)

### Community 44 - "autorizacion/page.tsx"
Cohesion: 0.27
Nodes (8): ConsentPage(), items, metadata, LoginPage(), metadata, getCurrentActor, CONSENT_POLICY_VERSION, homeFor()

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 332 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `lucide-react`, `SubmitButton`, `m/actions.ts`, `server/payroll.ts`, `package.json`, `gestion-actions.ts`, `proxy.ts`, `novelties.ts`, `reportes/page.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `cn`, `next.config.ts`, `empleados/[id]/page.tsx`, `requireActor`, `errors.ts`, `(auth)/actions.ts`, `utils.ts`, `admin/actions.ts`, `horarios/[id]/page.tsx`, `autorizacion/page.tsx`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.13368983957219252 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `lucide-react`, `SubmitButton`, `m/actions.ts`, `next`, `errors.ts`, `(auth)/actions.ts`, `utils.ts`, `server/payroll.ts`, `admin/actions.ts`, `horarios/[id]/page.tsx`, `autorizacion/page.tsx`, `Nexora: Arquitectura`, `gestion-actions.ts`, `novelties.ts`, `reportes/page.tsx`, `cn`, `empleados/[id]/page.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `SubmitButton` be split into smaller, more focused modules?**
  _Cohesion score 0.07458247540608556 - nodes in this community are weakly interconnected._
- **Why does `3. Sesiones y autorización` connect `Nexora: Arquitectura` to `requireActor`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `m/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06923361717882266 - nodes in this community are weakly interconnected._