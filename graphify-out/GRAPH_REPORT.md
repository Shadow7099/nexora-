# Graph Report - nexora-  (2026-11-20)

## Corpus Check
- 305 files · ~199,734 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1956 nodes · 7817 edges · 76 communities (70 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `85c5fbb1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pre-nomina/page.tsx
- audit
- db.ts
- m/actions.ts
- Input
- mensajes/page.tsx
- SubmitButton
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- errors.ts
- compilerOptions
- Nexora: Arquitectura
- sedes/[id]/page.tsx
- export.ts
- messages.ts
- scripts
- crm.ts
- report-charts.tsx
- attendance.ts
- src/app/layout.tsx
- apple-icon.tsx
- cn
- next.config.ts
- server/reports.ts
- next
- CardHeader
- pre-nomina/[id]/page.tsx
- empresas-actions.ts
- guarantees.test.ts
- seed.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- plantilla-empresa.ts
- server/payroll.ts
- README.md
- react
- requireActor
- 3. Administrador de la empresa
- Nexora: resumen académico
- Select
- booking.ts
- Nexora: guía para continuar en un chat nuevo
- localDate
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- sale-form.tsx
- (auth)/actions.ts
- modules.ts
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- inventory.ts
- app/app/page.tsx
- app/solicitudes/page.tsx
- geo.ts
- attendance.test.ts
- reportes/page.tsx
- unit/payroll.test.ts
- cash-forms.tsx
- AppError
- vercel.json
- 3. Administrador de la empresa
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 152 edges
2. `requireCompanyAdmin()` - 149 edges
3. `requireActor()` - 130 edges
4. `audit()` - 111 edges
5. `next` - 97 edges
6. `Card()` - 94 edges
7. `SubmitButton()` - 92 edges
8. `notFound()` - 92 edges
9. `toActionState()` - 91 edges
10. `lucide-react` - 82 edges

## Surprising Connections (you probably didn't know these)
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `Controles implementados` --references--> `safeNext()`  [INFERRED]
  docs/SEGURIDAD.md → src/app/(auth)/actions.ts
- `Controles implementados` --references--> `setPayrollStatus()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/payroll.ts
- `Controles implementados` --references--> `registerOpen()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/registration.ts

## Import Cycles
- None detected.

## Communities (76 total, 6 thin omitted)

### Community 0 - "pre-nomina/page.tsx"
Cohesion: 0.23
Nodes (11): fmt, href(), isoOf(), KIND_LABEL, label(), metadata, PayrollPage(), STATUS_TONE (+3 more)

### Community 1 - "audit"
Cohesion: 0.06
Nodes (76): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+68 more)

### Community 2 - "db.ts"
Cohesion: 0.08
Nodes (46): server-only, zod, db, globalForPrisma, companySettingsSchema, contractSchema, employeeSchema, isoDate (+38 more)

### Community 3 - "m/actions.ts"
Cohesion: 0.20
Nodes (23): @simplewebauthn/browser@14.0.0, @simplewebauthn/browser, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction(), punchAction(), PunchActionResult, punchPasskeyOptionsAction() (+15 more)

### Community 4 - "Input"
Cohesion: 0.18
Nodes (20): react, SettingsForm(), ActivateForm(), ChangePasswordPage(), metadata, PasswordForm(), LoginForm(), submitLeadAction() (+12 more)

### Community 5 - "mensajes/page.tsx"
Cohesion: 0.06
Nodes (103): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+95 more)

### Community 6 - "SubmitButton"
Cohesion: 0.17
Nodes (20): ConsentForm(), RevokeInvitationButton(), ClearOverride(), Opt, OverrideForm(), VerifyParameterButton(), ComputePayrollButton(), PayrollStatusControls() (+12 more)

### Community 7 - "@playwright/test"
Cohesion: 0.04
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.12
Nodes (22): blockedResult(), bump(), classifyMinutes(), commercialDays(), ContractInput, cop(), emptySummary(), estimatePayroll() (+14 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.06
Nodes (32): dependencies, class-variance-authority@0.7.1, clsx@2.1.1, dotenv@18.0.9, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0, lucide-react@1.62.0 (+24 more)

### Community 11 - "errors.ts"
Cohesion: 0.06
Nodes (65): vitest, hashPassword(), OPTIONS, verifyPassword(), requireSuperadmin(), forbidden(), LEAD_EMPLOYEES, leadSchema (+57 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "sedes/[id]/page.tsx"
Cohesion: 0.26
Nodes (9): dayShort, metadata, SitesPage(), metadata, PrintQrPage(), PrintButton(), qrSvg(), listSites() (+1 more)

### Community 15 - "export.ts"
Cohesion: 0.10
Nodes (29): GET(), GET(), TYPES, GET(), ConsentPage(), items, metadata, LoginPage() (+21 more)

### Community 16 - "messages.ts"
Cohesion: 0.05
Nodes (52): AI_TAG_LABEL, AI_TAGS, AiOutput, analyzeConversation(), askClaude(), businessContext(), configSchema, demoAnalysis() (+44 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "crm.ts"
Cohesion: 0.06
Nodes (67): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+59 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.33
Nodes (15): AXIS, ChartCard(), CostChart(), fmtCOP(), fmtDay(), fmtMonth(), fmtNum(), fmtShortCOP() (+7 more)

### Community 20 - "attendance.ts"
Cohesion: 0.13
Nodes (29): Controles implementados, appPunchSchema, ConcurrentPunch, DayStatus, employeeDeviceContext(), logAttempt(), MIN_SECONDS_BETWEEN_PUNCHES, openSession() (+21 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "cn"
Cohesion: 0.17
Nodes (29): CashPage(), diffBadge(), metadata, AgendaPage(), metadata, SOURCE, TONE, CustomersPage() (+21 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.12
Nodes (38): Fase 7 · Dashboard y reportes ✅ (hecha), ReportTable, toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus (+30 more)

### Community 27 - "next"
Cohesion: 0.09
Nodes (29): class-variance-authority, next, Form(), NewEmployeeForm(), Sites, today(), metadata, NewEmployeePage() (+21 more)

### Community 28 - "CardHeader"
Cohesion: 0.15
Nodes (27): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeeSchedulePage(), fmtDate(), metadata (+19 more)

### Community 29 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.16
Nodes (17): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+9 more)

### Community 30 - "empresas-actions.ts"
Cohesion: 0.17
Nodes (18): createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction(), superadmin() (+10 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.43
Nodes (5): d(), db, hm(), main(), publicCode()

### Community 36 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 37 - "server/payroll.ts"
Cohesion: 0.09
Nodes (29): 6. Fases que faltan (plan detallado), Fase 6 · Pre-nómina estimada ✅ (hecha), Fase 8 · Calidad y despliegue ✅ (hecha), computePayrollAction(), DONE, payrollStatusAction(), addParameterVersionAction(), echo() (+21 more)

### Community 38 - "README.md"
Cohesion: 0.19
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "react"
Cohesion: 0.14
Nodes (25): AccessCodePanel(), EditEmployeeForm(), NewContractForm(), PasskeyRequirement(), StatusButton(), Values, EmployeePage(), iso() (+17 more)

### Community 40 - "requireActor"
Cohesion: 0.10
Nodes (54): CustomerPage(), metadata, metadata, NewCustomerPage(), metadata, n(), ProductPage(), metadata (+46 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso, 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "Select"
Cohesion: 0.14
Nodes (19): ActivityForm(), CustomerForm(), DealForm(), DealStageSelect(), manualSubmit(), STAGES, Opt, PatternEditor() (+11 more)

### Community 44 - "booking.ts"
Cohesion: 0.08
Nodes (43): authorized(), GET(), maxDuration, ACTIVE, addDays(), APPOINTMENT_STATUS_LABEL, availableSlots(), bookFromButton() (+35 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.22
Nodes (8): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Nexora: guía para continuar en un chat nuevo

### Community 46 - "localDate"
Cohesion: 0.14
Nodes (26): prng(), seedAttendance(), currentOrNextShift(), cycleIndex(), isoOf(), localDate(), OverrideInput, PatternDayInput (+18 more)

### Community 47 - "Manual de instalación (entorno local)"
Cohesion: 0.22
Nodes (8): Bases de datos de prueba, Comandos útiles, Cuentas de la demo, Manual de instalación (entorno local), Pasos, Probar la marcación con QR en local, Problemas frecuentes, Requisitos

### Community 48 - "attendance.spec.ts"
Cohesion: 0.18
Nodes (8): qrcode@1.5.4, qrcode, addVirtualAuthenticator(), bindThisPhone(), CENTRO, FAR, PEOPLE, withAuthenticator

### Community 49 - "Instrucciones de despliegue"
Cohesion: 0.25
Nodes (8): 1. Variables de entorno (Vercel → Settings → Environment Variables), 2. Migraciones, 3. Primer despliegue en otra cuenta (desde cero), 4. Dominio propio (antes de imprimir los QR definitivos), 5. Volver a una versión anterior, 6. Respaldos, Aprendizaje diario de la IA (Vercel Cron), Instrucciones de despliegue

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
Cohesion: 0.40
Nodes (5): Asesores de Supabase, Dependencias (`npm audit`, 2 nov. 2026), Límites conocidos y decisiones, Pendiente fuera del código, Revisión de seguridad (fase 8)

### Community 54 - "sale-form.tsx"
Cohesion: 0.24
Nodes (11): admin(), createSaleAction(), voidSaleAction(), Customer, Line, num(), Product, SaleForm() (+3 more)

### Community 55 - "(auth)/actions.ts"
Cohesion: 0.20
Nodes (20): @simplewebauthn/server, changePasswordAction(), changeSchema, codeLoginAction(), consentAction(), loginAction(), passkeyLoginAction(), passkeyLoginOptionsAction() (+12 more)

### Community 56 - "modules.ts"
Cohesion: 0.40
Nodes (9): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+1 more)

### Community 57 - "[token]/page.tsx"
Cohesion: 0.32
Nodes (6): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage()

### Community 58 - "integrations.ts"
Cohesion: 0.09
Nodes (43): CompanyIntegrationsPage(), metadata, actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), IntegrationCard() (+35 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.14
Nodes (20): lucide-react, EmployeeLayout(), AuthLayout(), DesignSystemPage(), metadata, Section(), swatches, ShellUser (+12 more)

### Community 61 - "cash.ts"
Cohesion: 0.10
Nodes (43): saleNumber(), activeClosing(), addCashMovement(), addDays(), assertOpen(), cashDay(), checkDate(), closeCashDay() (+35 more)

### Community 62 - "chat.ts"
Cohesion: 0.06
Nodes (42): @anthropic-ai/sdk@1.8.0, @anthropic-ai/sdk, chatAction(), Cell, comparison, faqs, features, HeroVisual() (+34 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "inventory.ts"
Cohesion: 0.13
Nodes (26): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+18 more)

### Community 65 - "app/app/page.tsx"
Cohesion: 0.18
Nodes (17): EmployeeHomePage(), metadata, Message(), metadata, QrPage(), EmployeePreview(), metadata, PunchButton() (+9 more)

### Community 66 - "app/solicitudes/page.tsx"
Cohesion: 0.29
Nodes (9): day(), EMPLOYEE_TYPES, metadata, MyRequestsPage(), status, CancelNovelty(), myNovelties(), noveltyLabel (+1 more)

### Community 67 - "geo.ts"
Cohesion: 0.33
Nodes (6): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), site

### Community 68 - "attendance.test.ts"
Cohesion: 0.16
Nodes (17): loginWithCode(), passkeyLogin(), recordFailure(), throttled(), employeeHistory(), PASSKEY_MISSING_MESSAGE, STALE_SESSION_HOURS, addRelinkedWindow() (+9 more)

### Community 69 - "reportes/page.tsx"
Cohesion: 0.20
Nodes (15): delta(), metadata, qs(), ReportsPage(), metadata, NUMERIC, ReportPreviewPage(), Label() (+7 more)

### Community 70 - "unit/payroll.test.ts"
Cohesion: 0.17
Nodes (12): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, EstimateInput, ParamRow, SessionInput, amount() (+4 more)

### Community 71 - "cash-forms.tsx"
Cohesion: 0.32
Nodes (12): admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), CashMovementForm(), CATEGORIES (+4 more)

### Community 72 - "AppError"
Cohesion: 0.09
Nodes (44): requireCompanyAdmin(), saveBookingConfig(), setAppointmentStatus(), answerGap(), saveAiConfig(), setConversationAiPaused(), recordVersion(), revertToVersion() (+36 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `pre-nomina/page.tsx`, `audit`, `m/actions.ts`, `Input`, `mensajes/page.tsx`, `package.json`, `dependencies`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `cn`, `next.config.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `server/payroll.ts`, `react`, `requireActor`, `booking.ts`, `sale-form.tsx`, `(auth)/actions.ts`, `[token]/page.tsx`, `integrations.ts`, `Badge`, `chat.ts`, `proxy.ts`, `inventory.ts`, `app/app/page.tsx`, `app/solicitudes/page.tsx`, `reportes/page.tsx`, `cash-forms.tsx`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `audit` be split into smaller, more focused modules?**
  _Cohesion score 0.06335204490777867 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `pre-nomina/page.tsx`, `audit`, `m/actions.ts`, `Input`, `mensajes/page.tsx`, `Nexora: Arquitectura`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `cn`, `next`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `server/payroll.ts`, `react`, `sale-form.tsx`, `(auth)/actions.ts`, `integrations.ts`, `Badge`, `inventory.ts`, `app/app/page.tsx`, `app/solicitudes/page.tsx`, `reportes/page.tsx`, `cash-forms.tsx`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07925407925407925 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `audit`, `db.ts`, `m/actions.ts`, `mensajes/page.tsx`, `errors.ts`, `sedes/[id]/page.tsx`, `export.ts`, `messages.ts`, `crm.ts`, `attendance.ts`, `server/reports.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `server/payroll.ts`, `react`, `requireActor`, `booking.ts`, `integrations.ts`, `cash.ts`, `chat.ts`, `inventory.ts`, `attendance.test.ts`, `reportes/page.tsx`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `mensajes/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06133197417601087 - nodes in this community are weakly interconnected._
- **Should `@playwright/test` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._