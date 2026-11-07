# Graph Report - nexora-  (2026-11-07)

## Corpus Check
- 201 files · ~119,083 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1197 nodes · 4390 edges · 62 communities (58 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d9d0fcf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-shell.tsx
- AppError
- SubmitButton
- attendance.ts
- localDate
- server/payroll.ts
- requireCompanyAdmin
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- sessions.ts
- compilerOptions
- Nexora: Arquitectura
- Badge
- proxy.ts
- devDependencies
- scripts
- novelties.ts
- reportes/page.tsx
- errors.ts
- src/app/layout.tsx
- apple-icon.tsx
- lucide-react
- next.config.ts
- server/reports.ts
- holidays.ts
- Card
- devices.ts
- gestion-actions.ts
- guarantees.test.ts
- seed.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- next
- platform.ts
- README.md
- unit/payroll.test.ts
- pre-nomina/[id]/page.tsx
- 3. Administrador de la empresa
- Nexora: resumen académico
- utils.ts
- requireActor
- Nexora: guía para continuar en un chat nuevo
- button.tsx
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- pattern-editor.tsx
- registration.ts
- new-employee-form.tsx
- plantilla-empresa.ts
- admin/actions.ts
- Cuestionario para activar la empresa en Nexora
- solicitudes/actions.ts
- [token]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 85 edges
2. `AppError` - 69 edges
3. `requireCompanyAdmin()` - 65 edges
4. `next` - 64 edges
5. `Card()` - 62 edges
6. `lucide-react` - 56 edges
7. `SubmitButton()` - 54 edges
8. `audit()` - 54 edges
9. `PageHeader()` - 49 edges
10. `FormAlert()` - 47 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `Controles implementados` --references--> `safeNext()`  [INFERRED]
  docs/SEGURIDAD.md → src/app/(auth)/actions.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `commercialDays()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `classifyMinutes()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts

## Import Cycles
- None detected.

## Communities (62 total, 4 thin omitted)

### Community 0 - "admin-shell.tsx"
Cohesion: 0.19
Nodes (16): EmployeeLayout(), AuthLayout(), features, Home(), ShellUser, EmployeeShell(), adminNav, CURRENT_PHASE (+8 more)

### Community 1 - "AppError"
Cohesion: 0.12
Nodes (40): fieldErrors(), audit(), updateCompanySettings(), closeSessionManually(), AppError, notFound(), cancelNovelty(), decideNovelty() (+32 more)

### Community 2 - "SubmitButton"
Cohesion: 0.15
Nodes (31): react, SettingsForm(), EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), PasswordForm(), LoginForm() (+23 more)

### Community 3 - "attendance.ts"
Cohesion: 0.06
Nodes (76): @simplewebauthn/browser, @simplewebauthn/server, EmployeeHomePage(), metadata, day(), EMPLOYEE_TYPES, metadata, MyRequestsPage() (+68 more)

### Community 4 - "localDate"
Cohesion: 0.15
Nodes (29): currentOrNextShift(), cycleIndex(), isoOf(), localDate(), OverrideInput, PatternDayInput, ResolvedShift, shiftsOn() (+21 more)

### Community 5 - "server/payroll.ts"
Cohesion: 0.13
Nodes (23): 6. Fases que faltan (plan detallado), Fase 6 · Pre-nómina estimada ✅ (hecha), Fase 8 · Calidad y despliegue ✅ (hecha), CONCEPT_LABEL, lastDayOfMonth(), NoveltyKind, periodFor(), periodFrequency() (+15 more)

### Community 6 - "requireCompanyAdmin"
Cohesion: 0.34
Nodes (13): requireCompanyAdmin(), getCompanySettings(), addContractVersion(), assertSite(), createEmployee(), d(), getEmployee(), resetEmployeePassword() (+5 more)

### Community 7 - "@playwright/test"
Cohesion: 0.12
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.13
Nodes (21): blockedResult(), bump(), classifyMinutes(), commercialDays(), ContractInput, cop(), emptySummary(), estimatePayroll() (+13 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (27): eslintConfig, engines, node, name, private, version, class-variance-authority, clsx (+19 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, dotenv, exceljs, geist, jspdf, jspdf-autotable (+17 more)

### Community 11 - "sessions.ts"
Cohesion: 0.13
Nodes (27): vitest, hashPassword(), OPTIONS, verifyPassword(), authenticate(), changePassword(), createSession(), getDummyHash() (+19 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "Badge"
Cohesion: 0.21
Nodes (14): day(), HistoryPage(), metadata, EmployeePreview(), metadata, DesignSystemPage(), metadata, Section() (+6 more)

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
Cohesion: 0.23
Nodes (11): ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap(), d(), isoDate, listInclude, listNovelties(), noveltySchema (+3 more)

### Community 19 - "reportes/page.tsx"
Cohesion: 0.10
Nodes (39): jspdf, jspdf-autotable, GET(), TYPES, delta(), metadata, qs(), ReportsPage() (+31 more)

### Community 20 - "errors.ts"
Cohesion: 0.11
Nodes (23): server-only, db, globalForPrisma, companySettingsSchema, AuditEntry, Tx, listCompanies(), settingsSelect (+15 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lucide-react"
Cohesion: 0.13
Nodes (20): lucide-react, metadata, NewEmployeePage(), EmployeesPage(), metadata, metadata, SetupPage(), metadata (+12 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.13
Nodes (35): Fase 7 · Dashboard y reportes ✅ (hecha), toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus, daysBetween() (+27 more)

### Community 27 - "holidays.ts"
Cohesion: 0.40
Nodes (9): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+1 more)

### Community 28 - "Card"
Cohesion: 0.14
Nodes (44): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+36 more)

### Community 29 - "devices.ts"
Cohesion: 0.24
Nodes (9): approveDevice(), bindDevice(), deviceLabel(), getCompanyDevice(), revokeDevice(), at(), rp, setup() (+1 more)

### Community 30 - "gestion-actions.ts"
Cohesion: 0.25
Nodes (23): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+15 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.18
Nodes (3): pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.29
Nodes (9): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), @prisma/adapter-pg (+1 more)

### Community 36 - "next"
Cohesion: 0.21
Nodes (10): next, dayShort, metadata, SitesPage(), metadata, PrintQrPage(), PrintButton(), qrSvg() (+2 more)

### Community 37 - "platform.ts"
Cohesion: 0.29
Nodes (9): requireSuperadmin(), temporaryPassword(), createCompany(), getCompanyForPlatform(), newCompanySchema, resetCompanyAdminPassword(), setCompanyStatus(), slugify() (+1 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "unit/payroll.test.ts"
Cohesion: 0.17
Nodes (12): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, EstimateInput, ParamRow, SessionInput, amount() (+4 more)

### Community 40 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.16
Nodes (17): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+9 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.14
Nodes (13): 1. Primer ingreso (todas las cuentas), 2. Empleado, 3. Administrador de la empresa, 4. Superadministrador (Nexora), Configuración inicial (una sola vez), Día a día, Historial y solicitudes, Manual de usuario (+5 more)

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "utils.ts"
Cohesion: 0.17
Nodes (21): hhmm(), metadata, SchedulesPage(), short(), fmt, href(), label(), metadata (+13 more)

### Community 44 - "requireActor"
Cohesion: 0.10
Nodes (35): AdminLayout(), computePayrollAction(), changePasswordAction(), changeSchema, consentAction(), loginAction(), logoutAction(), safeNext() (+27 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.22
Nodes (8): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Nexora: guía para continuar en un chat nuevo

### Community 46 - "button.tsx"
Cohesion: 0.18
Nodes (17): createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), superadmin(), InvitationForm() (+9 more)

### Community 47 - "Manual de instalación (entorno local)"
Cohesion: 0.25
Nodes (8): Bases de datos de prueba, Comandos útiles, Cuentas de la demo, Manual de instalación (entorno local), Pasos, Probar la marcación con QR en local, Problemas frecuentes, Requisitos

### Community 48 - "attendance.spec.ts"
Cohesion: 0.25
Nodes (3): CENTRO, FAR, PEOPLE

### Community 49 - "Instrucciones de despliegue"
Cohesion: 0.29
Nodes (7): 1. Variables de entorno (Vercel → Settings → Environment Variables), 2. Migraciones, 3. Primer despliegue en otra cuenta (desde cero), 4. Dominio propio (antes de imprimir los QR definitivos), 5. Volver a una versión anterior, 6. Respaldos, Instrucciones de despliegue

### Community 50 - "Información que se necesita de la empresa real"
Cohesion: 0.29
Nodes (7): Antes del piloto (checklist), De la empresa, Despliegue, Información que se necesita de la empresa real, Por empleado (8), Por sede (4), Revisión profesional

### Community 51 - "Plan de implementación"
Cohesion: 0.33
Nodes (6): Después del software, Fase 2: qué quedó hecho, Fase 4: qué quedó hecho, Fases 3 y 5: qué quedó hecho, Módulos en vista previa, Plan de implementación

### Community 52 - "Pruebas y resultados"
Cohesion: 0.33
Nodes (6): Cómo se ejecutan, Errores encontrados por las pruebas (y corregidos), Las 10 pruebas obligatorias del enunciado, Lo que no se puede automatizar (pendiente del usuario), Pruebas y resultados, Resumen por archivo

### Community 53 - "Revisión de seguridad (fase 8)"
Cohesion: 0.33
Nodes (6): Asesores de Supabase, Controles implementados, Dependencias (`npm audit`, 2 nov. 2026), Límites conocidos y decisiones, Pendiente fuera del código, Revisión de seguridad (fase 8)

### Community 54 - "pattern-editor.tsx"
Cohesion: 0.24
Nodes (10): addParameterVersionAction(), echo(), superadmin(), verifyParameterAction(), ParameterVersionForm(), VerifyParameterButton(), Opt, Slot (+2 more)

### Community 55 - "registration.ts"
Cohesion: 0.13
Nodes (18): zod, contractSchema, employeeSchema, isoDate, loginSchema, money, PASSWORD_MIN, passwordSchema (+10 more)

### Community 56 - "new-employee-form.tsx"
Cohesion: 0.20
Nodes (15): Form(), NewEmployeeForm(), Sites, today(), ContractFields(), EmployeeFields(), Errors, F() (+7 more)

### Community 57 - "plantilla-empresa.ts"
Cohesion: 0.13
Nodes (9): exceljs, Col, days, emp, hdr, info, qs, SI_NO (+1 more)

### Community 58 - "admin/actions.ts"
Cohesion: 0.34
Nodes (11): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+3 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "solicitudes/actions.ts"
Cohesion: 0.40
Nodes (8): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), NoveltyRequestForm(), OvertimeNote(), addOvertimeNote()

### Community 61 - "[token]/page.tsx"
Cohesion: 0.50
Nodes (4): metadata, reasons, RegisterPage(), RegisterForm()

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 400 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `admin-shell.tsx`, `attendance.ts`, `next`, `pre-nomina/[id]/page.tsx`, `utils.ts`, `Nexora: Arquitectura`, `Badge`, `solicitudes/actions.ts`, `button.tsx`, `reportes/page.tsx`, `pattern-editor.tsx`, `lucide-react`, `admin/actions.ts`, `Card`, `gestion-actions.ts`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.12270531400966184 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `admin-shell.tsx`, `attendance.ts`, `package.json`, `Badge`, `proxy.ts`, `reportes/page.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `lucide-react`, `next.config.ts`, `Card`, `gestion-actions.ts`, `pre-nomina/[id]/page.tsx`, `utils.ts`, `requireActor`, `button.tsx`, `pattern-editor.tsx`, `new-employee-form.tsx`, `admin/actions.ts`, `solicitudes/actions.ts`, `[token]/page.tsx`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `attendance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05745658835546476 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Nexora: Arquitectura` to `README.md`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `server/payroll.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._