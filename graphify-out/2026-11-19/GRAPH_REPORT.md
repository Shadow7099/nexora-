# Graph Report - nexora-  (2026-11-19)

## Corpus Check
- 285 files · ~173,095 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1762 nodes · 6937 edges · 83 communities (78 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `407b35b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- AppError
- FormAlert
- m/actions.ts
- localDate
- server/payroll.ts
- employees.ts
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- errors.ts
- compilerOptions
- Nexora: Arquitectura
- Card
- proxy.ts
- messages.test.ts
- scripts
- novelties.ts
- report-charts.tsx
- server-only
- src/app/layout.tsx
- apple-icon.tsx
- lucide-react
- next.config.ts
- server/reports.ts
- holidays.ts
- Card
- attendance.ts
- gestion-actions.ts
- guarantees.test.ts
- ref_node_crypto
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- next
- platform.ts
- README.md
- unit/payroll.test.ts
- requireActor
- 3. Administrador de la empresa
- Nexora: resumen académico
- pre-nomina/page.tsx
- getCurrentActor
- Nexora: guía para continuar en un chat nuevo
- SubmitButton
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- Select
- registration.ts
- employee-fields.tsx
- plantilla-empresa.ts
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Input
- cash.ts
- chat.ts
- sessions.ts
- inventory.ts
- crm-webhooks.ts
- mensajes/page.tsx
- export.ts
- crm.ts
- sales.ts
- requireEmployee
- crm/actions.ts
- messages.ts
- passkeys.ts
- 3. Administrador de la empresa
- ActionState
- pre-nomina/[id]/page.tsx
- qr-scanner.tsx
- geo.ts
- password-form.tsx
- sql-produccion.py
- register-form.tsx
- template-form.tsx

## God Nodes (most connected - your core abstractions)
1. `AppError` - 137 edges
2. `requireActor()` - 128 edges
3. `requireCompanyAdmin()` - 119 edges
4. `next` - 94 edges
5. `audit()` - 91 edges
6. `Card()` - 90 edges
7. `SubmitButton()` - 85 edges
8. `toActionState()` - 83 edges
9. `lucide-react` - 79 edges
10. `PageHeader()` - 79 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `Controles implementados` --references--> `safeNext()`  [INFERRED]
  docs/SEGURIDAD.md → src/app/(auth)/actions.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `commercialDays()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `periodFor()`  [INFERRED]
  docs/CONTINUAR.md → src/lib/payroll.ts

## Import Cycles
- None detected.

## Communities (83 total, 5 thin omitted)

### Community 0 - "cn"
Cohesion: 0.08
Nodes (46): EmployeeLayout(), AuthLayout(), Message(), metadata, QrPage(), Cell, comparison, faqs (+38 more)

### Community 1 - "AppError"
Cohesion: 0.13
Nodes (43): fieldErrors(), audit(), requireCompanyAdmin(), updateCompanySettings(), answerGap(), moveDeal(), AppError, forbidden() (+35 more)

### Community 2 - "FormAlert"
Cohesion: 0.12
Nodes (21): react, SettingsForm(), consentAction(), loginAction(), safeNext(), ConsentForm(), LoginForm(), ErrorPage() (+13 more)

### Community 3 - "m/actions.ts"
Cohesion: 0.20
Nodes (24): @simplewebauthn/browser, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction(), punchAction(), PunchActionResult, punchPasskeyOptionsAction(), registerPasskeyAction() (+16 more)

### Community 4 - "localDate"
Cohesion: 0.13
Nodes (31): currentOrNextShift(), cycleIndex(), isoOf(), localDate(), OverrideInput, PatternDayInput, PatternInput, ResolvedShift (+23 more)

### Community 5 - "server/payroll.ts"
Cohesion: 0.11
Nodes (29): Fase 6 · Pre-nómina estimada ✅ (hecha), computePayrollAction(), DONE, payrollStatusAction(), addParameterVersionAction(), echo(), superadmin(), verifyParameterAction() (+21 more)

### Community 6 - "employees.ts"
Cohesion: 0.20
Nodes (23): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), resetPasswordAction(), revokeDeviceAction() (+15 more)

### Community 7 - "@playwright/test"
Cohesion: 0.06
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.11
Nodes (25): addDays(), blockedResult(), bump(), classifyMinutes(), commercialDays(), CONCEPT_LABEL, ContractInput, cop() (+17 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.3, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (27): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, jspdf@4.2.1, jspdf-autotable@5.0.9, lucide-react@1.62.0, next@16.4.3 (+19 more)

### Community 11 - "errors.ts"
Cohesion: 0.09
Nodes (29): vitest, db, globalForPrisma, hashPassword(), OPTIONS, SetupStep, NOW, setup() (+21 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "Card"
Cohesion: 0.13
Nodes (40): CustomerPage(), metadata, AiTab(), TemplatesTab(), COLUMN_TONE, CrmPage(), metadata, Form() (+32 more)

### Community 15 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 16 - "messages.test.ts"
Cohesion: 0.08
Nodes (48): admin(), answerGapAction(), createTemplateAction(), deleteTemplateAction(), pauseAiAction(), reanalyzeAction(), refresh(), saveAiConfigAction() (+40 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "novelties.ts"
Cohesion: 0.16
Nodes (18): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap() (+10 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.26
Nodes (18): delta(), qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP(), fmtDay() (+10 more)

### Community 20 - "server-only"
Cohesion: 0.15
Nodes (13): server-only, companySettingsSchema, AuditEntry, Tx, getCompanySettings(), listCompanies(), settingsSelect, LEAD_EMPLOYEES (+5 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lucide-react"
Cohesion: 0.09
Nodes (45): lucide-react, CashPage(), diffBadge(), metadata, CustomersPage(), metadata, InboxPage(), EmployeesPage() (+37 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.13
Nodes (37): Fase 7 · Dashboard y reportes ✅ (hecha), ReportTable, toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus (+29 more)

### Community 27 - "holidays.ts"
Cohesion: 0.40
Nodes (9): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+1 more)

### Community 28 - "Card"
Cohesion: 0.12
Nodes (37): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+29 more)

### Community 29 - "attendance.ts"
Cohesion: 0.10
Nodes (35): Controles implementados, appPunchSchema, ConcurrentPunch, DayStatus, employeeDeviceContext(), logAttempt(), MIN_SECONDS_BETWEEN_PUNCHES, openSession() (+27 more)

### Community 30 - "gestion-actions.ts"
Cohesion: 0.30
Nodes (20): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+12 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "ref_node_crypto"
Cohesion: 0.14
Nodes (13): dotenv@18.0.9, prisma@7.10.1, @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm() (+5 more)

### Community 36 - "next"
Cohesion: 0.21
Nodes (10): next, dayShort, metadata, SitesPage(), metadata, PrintQrPage(), PrintButton(), qrSvg() (+2 more)

### Community 37 - "platform.ts"
Cohesion: 0.18
Nodes (20): createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction(), superadmin() (+12 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "unit/payroll.test.ts"
Cohesion: 0.17
Nodes (12): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, EstimateInput, ParamRow, SessionInput, amount() (+4 more)

### Community 40 - "requireActor"
Cohesion: 0.09
Nodes (37): metadata, NewCustomerPage(), metadata, NewProductPage(), AdminLayout(), metadata, ParametersPage(), metadata (+29 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso (todas las cuentas), 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "pre-nomina/page.tsx"
Cohesion: 0.20
Nodes (14): fmt, href(), isoOf(), KIND_LABEL, label(), metadata, PayrollPage(), STATUS_TONE (+6 more)

### Community 44 - "getCurrentActor"
Cohesion: 0.23
Nodes (10): ConsentPage(), items, metadata, LoginPage(), metadata, Inicio(), getCurrentActor, getSessionToken() (+2 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.18
Nodes (10): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+2 more)

### Community 46 - "SubmitButton"
Cohesion: 0.13
Nodes (23): EditEmployeeForm(), NewContractForm(), ResetPasswordButton(), StatusButton(), Values, ContractFields(), EmployeeFields(), F() (+15 more)

### Community 47 - "Manual de instalación (entorno local)"
Cohesion: 0.25
Nodes (8): Bases de datos de prueba, Comandos útiles, Cuentas de la demo, Manual de instalación (entorno local), Pasos, Probar la marcación con QR en local, Problemas frecuentes, Requisitos

### Community 48 - "attendance.spec.ts"
Cohesion: 0.18
Nodes (8): qrcode@1.5.4, qrcode, addVirtualAuthenticator(), bindThisPhone(), CENTRO, FAR, PEOPLE, withAuthenticator

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
Cohesion: 0.40
Nodes (5): Asesores de Supabase, Dependencias (`npm audit`, 2 nov. 2026), Límites conocidos y decisiones, Pendiente fuera del código, Revisión de seguridad (fase 8)

### Community 54 - "Select"
Cohesion: 0.16
Nodes (22): ActivityForm(), CustomerForm(), DealForm(), DealStageSelect(), manualSubmit(), STAGES, MovementForm(), ParameterVersionForm() (+14 more)

### Community 55 - "registration.ts"
Cohesion: 0.18
Nodes (17): RegisterPage(), checkInvitation(), emailTaken(), hashToken(), invitationSchema, InvitationState, isUniqueViolation(), listInvitations() (+9 more)

### Community 56 - "employee-fields.tsx"
Cohesion: 0.33
Nodes (7): Errors, Values, contractTypeLabel, documentTypeLabel, payFrequencyLabel, roleLabel, salaryTypeLabel

### Community 57 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 58 - "integrations.ts"
Cohesion: 0.09
Nodes (40): CompanyIntegrationsPage(), metadata, actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), IntegrationCard() (+32 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Input"
Cohesion: 0.19
Nodes (16): CashMovementForm(), CATEGORIES, CloseCashForm(), manualSubmit(), ReopenCashForm(), VoidCashButton(), CloseSessionForm(), ManualSessionForm() (+8 more)

### Community 61 - "cash.ts"
Cohesion: 0.16
Nodes (30): admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), activeClosing(), addCashMovement() (+22 more)

### Community 62 - "chat.ts"
Cohesion: 0.11
Nodes (24): chatAction(), ChatLink, CONTACT, FALLBACK, Intent, INTENTS, KNOWLEDGE_TEXT, LOGIN (+16 more)

### Community 63 - "sessions.ts"
Cohesion: 0.11
Nodes (25): zod, changeSchema, verifyPassword(), contractSchema, employeeSchema, isoDate, loginSchema, money (+17 more)

### Community 64 - "inventory.ts"
Cohesion: 0.15
Nodes (23): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+15 more)

### Community 65 - "crm-webhooks.ts"
Cohesion: 0.18
Nodes (24): GET(), maxDuration, POST(), reply(), ingestLead(), fail(), genericLead, handleGenericLead() (+16 more)

### Community 66 - "mensajes/page.tsx"
Cohesion: 0.16
Nodes (23): Actor, CHANNEL_ICON, Chats(), ChatsData, metadata, ORIGIN_LABEL, STATUS_ICON, Tab (+15 more)

### Community 67 - "export.ts"
Cohesion: 0.15
Nodes (20): GET(), GET(), TYPES, GET(), ColumnKind, csvEscape(), reportFileName(), toCsv() (+12 more)

### Community 68 - "crm.ts"
Cohesion: 0.11
Nodes (18): ACTIVITY_LABEL, ACTIVITY_TYPES, activitySchema, companyUsers(), customerFormSchema, dealSchema, DOC_TYPES, getCustomer() (+10 more)

### Community 69 - "sales.ts"
Cohesion: 0.16
Nodes (20): computeLine(), peso(), saleNumber(), companyToday(), METHODS, CONSUMIDOR_FINAL, createSale(), customerSchema (+12 more)

### Community 70 - "requireEmployee"
Cohesion: 0.15
Nodes (18): day(), EMPLOYEE_TYPES, metadata, MyRequestsPage(), status, CancelNovelty(), employeeHistory(), employeeToday() (+10 more)

### Community 71 - "crm/actions.ts"
Cohesion: 0.29
Nodes (17): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+9 more)

### Community 72 - "messages.ts"
Cohesion: 0.16
Nodes (13): OPEN_STAGES, Channel, CHANNEL_LABEL, ConversationRow, Inbound, listSchema, preview(), recordEcho() (+5 more)

### Community 73 - "passkeys.ts"
Cohesion: 0.31
Nodes (12): relinkableBinding(), activeBinding(), passkeyAuthenticationOptions(), passkeyRegistrationOptions(), passkeysForBinding(), registerPasskey(), relinkOptions(), relinkWithPasskey() (+4 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

### Community 75 - "ActionState"
Cohesion: 0.27
Nodes (9): admin(), createSaleAction(), voidSaleAction(), registerAction(), submitLeadAction(), getClientIp(), setSessionCookie(), ActionState (+1 more)

### Community 76 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.29
Nodes (9): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), formatParamValue(), PARAMETER_INFO (+1 more)

### Community 77 - "qr-scanner.tsx"
Cohesion: 0.28
Nodes (7): jsqr@1.4.0, react-dom@19.3.0, jsqr, react-dom, qrPath(), QrScanButton(), Status

### Community 78 - "geo.ts"
Cohesion: 0.33
Nodes (6): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), site

### Community 79 - "password-form.tsx"
Cohesion: 0.53
Nodes (4): changePasswordAction(), ChangePasswordPage(), metadata, PasswordForm()

### Community 81 - "register-form.tsx"
Cohesion: 0.60
Nodes (3): metadata, OpenRegisterPage(), RegisterForm()

### Community 82 - "template-form.tsx"
Cohesion: 0.60
Nodes (4): TemplateForm(), TemplateList(), TemplateRow, ToggleActive()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `cn`, `m/actions.ts`, `server/payroll.ts`, `employees.ts`, `package.json`, `dependencies`, `Card`, `proxy.ts`, `messages.test.ts`, `novelties.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `lucide-react`, `next.config.ts`, `Card`, `gestion-actions.ts`, `platform.ts`, `requireActor`, `pre-nomina/page.tsx`, `getCurrentActor`, `SubmitButton`, `integrations.ts`, `cash.ts`, `sessions.ts`, `inventory.ts`, `crm-webhooks.ts`, `mensajes/page.tsx`, `export.ts`, `requireEmployee`, `crm/actions.ts`, `ActionState`, `pre-nomina/[id]/page.tsx`, `qr-scanner.tsx`, `password-form.tsx`, `register-form.tsx`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.0768361581920904 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `cn`, `FormAlert`, `m/actions.ts`, `server/payroll.ts`, `employees.ts`, `Nexora: Arquitectura`, `Card`, `messages.test.ts`, `novelties.ts`, `report-charts.tsx`, `lucide-react`, `Card`, `gestion-actions.ts`, `next`, `platform.ts`, `pre-nomina/page.tsx`, `getCurrentActor`, `integrations.ts`, `cash.ts`, `sessions.ts`, `inventory.ts`, `mensajes/page.tsx`, `requireEmployee`, `crm/actions.ts`, `ActionState`, `pre-nomina/[id]/page.tsx`, `password-form.tsx`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.1323671497584541 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `m/actions.ts`, `localDate`, `server/payroll.ts`, `employees.ts`, `errors.ts`, `Card`, `messages.test.ts`, `novelties.ts`, `server-only`, `lucide-react`, `server/reports.ts`, `Card`, `attendance.ts`, `next`, `platform.ts`, `registration.ts`, `integrations.ts`, `cash.ts`, `chat.ts`, `inventory.ts`, `crm-webhooks.ts`, `mensajes/page.tsx`, `export.ts`, `crm.ts`, `sales.ts`, `crm/actions.ts`, `messages.ts`, `passkeys.ts`, `ActionState`, `pre-nomina/[id]/page.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `FormAlert` be split into smaller, more focused modules?**
  _Cohesion score 0.12258064516129032 - nodes in this community are weakly interconnected._
- **Should `localDate` be split into smaller, more focused modules?**
  _Cohesion score 0.1273532668881506 - nodes in this community are weakly interconnected._