# Graph Report - nexora  (2026-11-04)

## Corpus Check
- 189 files · ~93,239 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1136 nodes · 4140 edges · 55 communities (51 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8300644d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- AppError
- gestion-actions.ts
- attendance.ts
- schedule.ts
- server/payroll.ts
- employees.ts
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- sessions.ts
- compilerOptions
- Nexora: Arquitectura
- cn
- proxy.ts
- devDependencies
- scripts
- novelties.ts
- server/reports.ts
- errors.ts
- src/app/layout.tsx
- apple-icon.tsx
- Card
- next.config.ts
- localDate
- holidays.ts
- PageHeader
- phase35.test.ts
- requireActor
- guarantees.test.ts
- seed.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- next
- platform.ts
- README.md
- unit/payroll.test.ts
- CardHeader
- 3. Administrador de la empresa
- Nexora: resumen académico
- utils.ts
- (auth)/actions.ts
- Nexora: guía para continuar en un chat nuevo
- pre-nomina/page.tsx
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- plataforma/actions.ts

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
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `4. Reglas del proyecto (no negociables)` --references--> `requireCompanyAdmin()`  [INFERRED]
  docs/CONTINUAR.md → src/server/authz.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `addLaborParameterVersion()`  [INFERRED]
  docs/CONTINUAR.md → src/server/payroll.ts
- `Controles implementados` --references--> `authenticate()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/sessions.ts

## Import Cycles
- None detected.

## Communities (55 total, 4 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.17
Nodes (17): lucide-react, EmployeeLayout(), AuthLayout(), features, Home(), ShellUser, EmployeeShell(), adminNav (+9 more)

### Community 1 - "AppError"
Cohesion: 0.14
Nodes (41): fieldErrors(), audit(), requireCompanyAdmin(), updateCompanySettings(), closeSessionManually(), approveDevice(), getCompanyDevice(), revokeDevice() (+33 more)

### Community 2 - "gestion-actions.ts"
Cohesion: 0.05
Nodes (109): react, addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction() (+101 more)

### Community 3 - "attendance.ts"
Cohesion: 0.07
Nodes (66): @simplewebauthn/browser, EmployeeHomePage(), metadata, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction(), punchAction(), PunchActionResult (+58 more)

### Community 4 - "schedule.ts"
Cohesion: 0.24
Nodes (12): currentOrNextShift(), cycleIndex(), isoOf(), PatternDayInput, ResolvedShift, shiftsOn(), toDay(), tzOffset() (+4 more)

### Community 5 - "server/payroll.ts"
Cohesion: 0.15
Nodes (17): computePayrollAction(), CONCEPT_LABEL, NoveltyKind, periodFrequency(), Warning, computePayroll(), CONCEPT_ORDER, day() (+9 more)

### Community 6 - "employees.ts"
Cohesion: 0.16
Nodes (19): companySettingsSchema, contractSchema, employeeSchema, isoDate, loginSchema, money, PASSWORD_MIN, passwordSchema (+11 more)

### Community 7 - "@playwright/test"
Cohesion: 0.09
Nodes (4): PORT, exceljs, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.11
Nodes (26): 6. Fases que faltan (plan detallado), Fase 6 · Pre-nómina estimada ✅ (hecha), Fase 8 · Calidad y despliegue ✅ (hecha), blockedResult(), bump(), classifyMinutes(), commercialDays(), ContractInput (+18 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (26): eslintConfig, engines, node, name, private, version, class-variance-authority, clsx (+18 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, dotenv, exceljs, geist, jspdf, jspdf-autotable (+17 more)

### Community 11 - "sessions.ts"
Cohesion: 0.18
Nodes (18): verifyPassword(), authenticate(), changePassword(), createSession(), getDummyHash(), hashIp(), hashToken(), IP_WINDOW_MINUTES (+10 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "cn"
Cohesion: 0.22
Nodes (14): metadata, statusBadge, EmployeePreview(), metadata, DesignSystemPage(), metadata, Section(), swatches (+6 more)

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
Cohesion: 0.18
Nodes (18): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap() (+10 more)

### Community 19 - "server/reports.ts"
Cohesion: 0.06
Nodes (81): Fase 7 · Dashboard y reportes ✅ (hecha), jspdf, jspdf-autotable, GET(), TYPES, delta(), metadata, qs() (+73 more)

### Community 20 - "errors.ts"
Cohesion: 0.13
Nodes (22): server-only, zod, db, globalForPrisma, AuditEntry, Tx, settingsSelect, addManualSession() (+14 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "Card"
Cohesion: 0.16
Nodes (20): metadata, NewEmployeePage(), EmployeesPage(), metadata, day(), metadata, RequestsPage(), status (+12 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "localDate"
Cohesion: 0.29
Nodes (14): localDate(), attendanceDay(), addDays(), attendanceSummary(), employeeActivity(), mondayOf(), requestsSummary(), weekSchedule() (+6 more)

### Community 27 - "holidays.ts"
Cohesion: 0.40
Nodes (9): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+1 more)

### Community 28 - "PageHeader"
Cohesion: 0.20
Nodes (24): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+16 more)

### Community 29 - "phase35.test.ts"
Cohesion: 0.13
Nodes (16): vitest, bindDevice(), deviceLabel(), listOvertime(), at(), rp, setup(), t0 (+8 more)

### Community 30 - "requireActor"
Cohesion: 0.23
Nodes (13): AdminLayout(), logoutAction(), metadata, NewCompanyPage(), metadata, PlatformPage(), statusBadge, AdminShell() (+5 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.18
Nodes (3): pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.24
Nodes (10): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), dotenv (+2 more)

### Community 36 - "next"
Cohesion: 0.16
Nodes (16): next, hhmm(), metadata, SitePage(), dayShort, metadata, SitesPage(), metadata (+8 more)

### Community 37 - "platform.ts"
Cohesion: 0.17
Nodes (17): resetAdminPasswordAction(), setCompanyStatusAction(), superadmin(), hashPassword(), OPTIONS, requireSuperadmin(), listCompanies(), temporaryPassword() (+9 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "unit/payroll.test.ts"
Cohesion: 0.17
Nodes (12): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, EstimateInput, ParamRow, SessionInput, amount() (+4 more)

### Community 40 - "CardHeader"
Cohesion: 0.17
Nodes (19): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+11 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.14
Nodes (13): 1. Primer ingreso (todas las cuentas), 2. Empleado, 3. Administrador de la empresa, 4. Superadministrador (Nexora), Configuración inicial (una sola vez), Día a día, Historial y solicitudes, Manual de usuario (+5 more)

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "utils.ts"
Cohesion: 0.27
Nodes (12): hhmm(), metadata, SchedulesPage(), short(), AdminHome(), metadata, Avatar(), auditActionLabel (+4 more)

### Community 44 - "(auth)/actions.ts"
Cohesion: 0.16
Nodes (17): changePasswordAction(), changeSchema, consentAction(), loginAction(), safeNext(), ConsentPage(), items, metadata (+9 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.22
Nodes (8): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Nexora: guía para continuar en un chat nuevo

### Community 46 - "pre-nomina/page.tsx"
Cohesion: 0.33
Nodes (7): fmt, href(), label(), metadata, PayrollPage(), addDays(), formatCOP()

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

### Community 54 - "plataforma/actions.ts"
Cohesion: 0.60
Nodes (5): addParameterVersionAction(), echo(), superadmin(), verifyParameterAction(), verifyLaborParameter()

## Knowledge Gaps
- **10 isolated node(s):** `@prisma/client`, `tailwindcss`, `@tailwindcss/turbopack`, `tsx`, `@types/node` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 370 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `lucide-react`, `gestion-actions.ts`, `attendance.ts`, `server/payroll.ts`, `package.json`, `cn`, `proxy.ts`, `novelties.ts`, `server/reports.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `Card`, `next.config.ts`, `PageHeader`, `requireActor`, `platform.ts`, `CardHeader`, `utils.ts`, `(auth)/actions.ts`, `pre-nomina/page.tsx`, `plataforma/actions.ts`?**
  _High betweenness centrality (0.138) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `tailwindcss`, `@tailwindcss/turbopack` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.13742071881606766 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `lucide-react`, `gestion-actions.ts`, `attendance.ts`, `next`, `server/payroll.ts`, `platform.ts`, `CardHeader`, `utils.ts`, `(auth)/actions.ts`, `Nexora: Arquitectura`, `pre-nomina/page.tsx`, `cn`, `novelties.ts`, `server/reports.ts`, `plataforma/actions.ts`, `Card`, `PageHeader`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Should `gestion-actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05088331746535491 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Nexora: Arquitectura` to `README.md`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `attendance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06859806859806859 - nodes in this community are weakly interconnected._