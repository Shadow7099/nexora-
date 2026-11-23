# Graph Report - nexora-  (2026-11-20)

## Corpus Check
- 305 files · ~199,926 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1957 nodes · 7819 edges · 81 communities (75 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `4fe1c256`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pre-nomina/page.tsx
- audit
- db.ts
- (auth)/actions.ts
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
- social-comments.ts
- scripts
- crm.ts
- report-charts.tsx
- attendance.ts
- src/app/layout.tsx
- apple-icon.tsx
- requireActor
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
- new-employee-form.tsx
- cn
- 3. Administrador de la empresa
- Nexora: resumen académico
- Button
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
- crm-webhooks.ts
- modules.ts
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- inventory.ts
- integration-card.tsx
- app/solicitudes/page.tsx
- messages.ts
- activation.ts
- admin/actions.ts
- labor-parameters.ts
- toActionState
- messages.test.ts
- vercel.json
- 3. Administrador de la empresa
- sessions.ts
- crm-learning.ts
- crm-ai.ts
- crm-ambar.test.ts
- aprendizaje-ia/route.ts
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
- `Controles implementados` --references--> `punchFromApp()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/attendance.ts
- `Controles implementados` --references--> `punch()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/attendance.ts
- `Controles implementados` --references--> `registerOpen()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/registration.ts

## Import Cycles
- None detected.

## Communities (81 total, 6 thin omitted)

### Community 0 - "pre-nomina/page.tsx"
Cohesion: 0.21
Nodes (12): fmt, href(), isoOf(), KIND_LABEL, label(), metadata, PayrollPage(), STATUS_TONE (+4 more)

### Community 1 - "audit"
Cohesion: 0.06
Nodes (89): 4. Reglas del proyecto (no negociables), fieldErrors(), regenerateAccessCode(), setRequirePasskey(), audit(), requireCompanyAdmin(), saveBookingConfig(), setAppointmentStatus() (+81 more)

### Community 2 - "db.ts"
Cohesion: 0.10
Nodes (28): server-only, zod, db, globalForPrisma, companySettingsSchema, contractSchema, employeeSchema, isoDate (+20 more)

### Community 3 - "(auth)/actions.ts"
Cohesion: 0.07
Nodes (69): @simplewebauthn/server@14.0.3, @simplewebauthn/browser, @simplewebauthn/server, EmployeeHomePage(), metadata, changePasswordAction(), changeSchema, codeLoginAction() (+61 more)

### Community 4 - "Input"
Cohesion: 0.14
Nodes (32): submitLeadAction(), CashMovementForm(), CATEGORIES, CloseCashForm(), manualSubmit(), ReopenCashForm(), VoidCashButton(), ActivityForm() (+24 more)

### Community 5 - "mensajes/page.tsx"
Cohesion: 0.08
Nodes (77): admin(), answerGapAction(), appointmentStatusAction(), autoLearnAction(), autoReplyAction(), bookAction(), bookingConfigAction(), clearDemoAction() (+69 more)

### Community 6 - "SubmitButton"
Cohesion: 0.14
Nodes (26): AccessCodePanel(), EditEmployeeForm(), NewContractForm(), PasskeyRequirement(), StatusButton(), Values, ConsentForm(), ChangePasswordPage() (+18 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.08
Nodes (35): blockedResult(), bump(), classifyMinutes(), commercialDays(), CONCEPT_LABEL, ContractInput, cop(), emptySummary() (+27 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, dotenv@18.0.9, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0 (+23 more)

### Community 11 - "errors.ts"
Cohesion: 0.05
Nodes (55): vitest, hashPassword(), OPTIONS, employeeHistory(), PASSKEY_MISSING_MESSAGE, STALE_SESSION_HOURS, requireSuperadmin(), listCompanies() (+47 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "sedes/[id]/page.tsx"
Cohesion: 0.21
Nodes (12): hhmm(), metadata, SitePage(), dayShort, metadata, SitesPage(), metadata, PrintQrPage() (+4 more)

### Community 15 - "export.ts"
Cohesion: 0.11
Nodes (28): GET(), GET(), TYPES, GET(), ConsentPage(), items, metadata, Inicio() (+20 more)

### Community 16 - "social-comments.ts"
Cohesion: 0.12
Nodes (20): ADS, CHATS, clearDemo(), COMMENTS, DEMO_SOURCE, DemoChat, DemoMsg, loadDemo() (+12 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "crm.ts"
Cohesion: 0.10
Nodes (37): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+29 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.21
Nodes (22): delta(), metadata, qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP() (+14 more)

### Community 20 - "attendance.ts"
Cohesion: 0.12
Nodes (21): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), appPunchSchema, ConcurrentPunch, DayStatus (+13 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "requireActor"
Cohesion: 0.09
Nodes (50): class-variance-authority, lucide-react, AgendaPage(), metadata, SOURCE, TONE, metadata, NewCustomerPage() (+42 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.11
Nodes (40): Fase 7 · Dashboard y reportes ✅ (hecha), ReportTable, toHours(), AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus (+32 more)

### Community 27 - "next"
Cohesion: 0.11
Nodes (20): next, CompanyIntegrationsPage(), metadata, AdminLayout(), menuBadges(), logoutAction(), metadata, NewCompanyPage() (+12 more)

### Community 28 - "CardHeader"
Cohesion: 0.10
Nodes (49): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), CommentsTab(), EmployeePage(), iso() (+41 more)

### Community 29 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.16
Nodes (18): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+10 more)

### Community 30 - "empresas-actions.ts"
Cohesion: 0.15
Nodes (20): createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction(), superadmin() (+12 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.12
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.29
Nodes (9): @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm(), main(), publicCode() (+1 more)

### Community 36 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 37 - "server/payroll.ts"
Cohesion: 0.12
Nodes (29): Fase 6 · Pre-nómina estimada ✅ (hecha), Controles implementados, computePayrollAction(), DONE, payrollStatusAction(), addParameterVersionAction(), echo(), superadmin() (+21 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "new-employee-form.tsx"
Cohesion: 0.18
Nodes (17): Form(), NewEmployeeForm(), Sites, today(), ActivationCode(), waNumber(), ContractFields(), EmployeeFields() (+9 more)

### Community 40 - "cn"
Cohesion: 0.16
Nodes (35): CashPage(), diffBadge(), metadata, CustomerPage(), metadata, AiTab(), TemplatesTab(), COLUMN_TONE (+27 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso, 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "Button"
Cohesion: 0.16
Nodes (16): react, ActivateForm(), LoginForm(), LoginPage(), metadata, PasskeyLogin(), subscribe(), ErrorPage() (+8 more)

### Community 44 - "booking.ts"
Cohesion: 0.20
Nodes (24): ACTIVE, addDays(), availableSlots(), bookFromButton(), bookingSetup(), bookManually(), By, Conv (+16 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.20
Nodes (9): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Fase 8 · Calidad y despliegue ✅ (hecha) (+1 more)

### Community 46 - "localDate"
Cohesion: 0.14
Nodes (28): holidaysBetween(), currentOrNextShift(), cycleIndex(), isoOf(), localDate(), PatternDayInput, PatternInput, ResolvedShift (+20 more)

### Community 47 - "Manual de instalación (entorno local)"
Cohesion: 0.25
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
Cohesion: 0.27
Nodes (10): admin(), createSaleAction(), voidSaleAction(), Customer, Line, num(), Product, SaleForm() (+2 more)

### Community 55 - "crm-webhooks.ts"
Cohesion: 0.14
Nodes (28): GET(), maxDuration, POST(), reply(), ingestLead(), adFromMetaReferral(), commentFromChange(), fail() (+20 more)

### Community 56 - "modules.ts"
Cohesion: 0.44
Nodes (8): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), iso(), nextMonday(), utc()

### Community 57 - "[token]/page.tsx"
Cohesion: 0.31
Nodes (7): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage(), checkInvitation()

### Community 58 - "integrations.ts"
Cohesion: 0.16
Nodes (22): integrationById(), decryptSecret(), encryptSecret(), key(), secretsConfigured(), SecretsKeyMissing, associated(), Fetch (+14 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.09
Nodes (33): EmployeeLayout(), AuthLayout(), Cell, comparison, faqs, features, HeroVisual(), Home() (+25 more)

### Community 61 - "cash.ts"
Cohesion: 0.10
Nodes (44): saleNumber(), activeClosing(), addCashMovement(), addDays(), assertOpen(), cashDay(), checkDate(), closeCashDay() (+36 more)

### Community 62 - "chat.ts"
Cohesion: 0.10
Nodes (26): chatAction(), ChatWidget(), Msg, WELCOME, ChatLink, CONTACT, FALLBACK, Intent (+18 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "inventory.ts"
Cohesion: 0.19
Nodes (19): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+11 more)

### Community 65 - "integration-card.tsx"
Cohesion: 0.17
Nodes (18): actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), IntegrationCard(), IntegrationState, noop() (+10 more)

### Community 66 - "app/solicitudes/page.tsx"
Cohesion: 0.20
Nodes (16): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), day(), EMPLOYEE_TYPES, metadata (+8 more)

### Community 67 - "messages.ts"
Cohesion: 0.13
Nodes (16): simulateCustomer(), adData(), adsReport(), ConversationRow, Inbound, listSchema, preview(), recordEcho() (+8 more)

### Community 68 - "activation.ts"
Cohesion: 0.17
Nodes (26): assignAccessCode(), codeAad(), CodeLoginResult, getAccessCode(), hashCode(), hashLoginToken(), loginWithCode(), newCode() (+18 more)

### Community 69 - "admin/actions.ts"
Cohesion: 0.28
Nodes (13): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+5 more)

### Community 70 - "labor-parameters.ts"
Cohesion: 0.47
Nodes (4): LABOR_PARAMETERS, LaborParameterSeed, q(), rows

### Community 71 - "toActionState"
Cohesion: 0.19
Nodes (27): admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), addManualSessionAction(), admin() (+19 more)

### Community 72 - "messages.test.ts"
Cohesion: 0.17
Nodes (15): createTemplate(), listTemplates(), META_STATUS, preview(), renderTemplate(), sendTemplate(), syncTemplates(), templateSchema (+7 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

### Community 75 - "sessions.ts"
Cohesion: 0.24
Nodes (14): verifyPassword(), authenticate(), changePassword(), createSession(), getDummyHash(), hashToken(), ipThrottled(), LOCK_MINUTES (+6 more)

### Community 76 - "crm-learning.ts"
Cohesion: 0.21
Nodes (12): @anthropic-ai/sdk, applyChanges(), Cfg, Change, FIELD, heuristicLearning(), learn(), learnNow() (+4 more)

### Community 77 - "crm-ai.ts"
Cohesion: 0.21
Nodes (12): AI_TAGS, AiOutput, analyzeConversation(), askClaude(), businessContext(), configSchema, demoAnalysis(), hoursAgo() (+4 more)

### Community 78 - "crm-ambar.test.ts"
Cohesion: 0.22
Nodes (6): loadChats(), getAiConfig(), hasDemo(), getConversation(), inboxAlerts(), listConversations()

### Community 79 - "aprendizaje-ia/route.ts"
Cohesion: 0.60
Nodes (4): authorized(), GET(), maxDuration, learnAll()

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `pre-nomina/page.tsx`, `(auth)/actions.ts`, `mensajes/page.tsx`, `SubmitButton`, `Nexora: Arquitectura`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `report-charts.tsx`, `next`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `server/payroll.ts`, `cn`, `sale-form.tsx`, `Badge`, `inventory.ts`, `integration-card.tsx`, `app/solicitudes/page.tsx`, `admin/actions.ts`, `toActionState`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `audit` be split into smaller, more focused modules?**
  _Cohesion score 0.06411049268192125 - nodes in this community are weakly interconnected._
- **Why does `next` connect `next` to `pre-nomina/page.tsx`, `(auth)/actions.ts`, `mensajes/page.tsx`, `SubmitButton`, `package.json`, `dependencies`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `report-charts.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `requireActor`, `next.config.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `server/payroll.ts`, `new-employee-form.tsx`, `cn`, `Button`, `sale-form.tsx`, `crm-webhooks.ts`, `[token]/page.tsx`, `Badge`, `chat.ts`, `proxy.ts`, `inventory.ts`, `integration-card.tsx`, `app/solicitudes/page.tsx`, `admin/actions.ts`, `toActionState`, `aprendizaje-ia/route.ts`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10202020202020202 - nodes in this community are weakly interconnected._
- **Why does `requireCompanyAdmin()` connect `audit` to `db.ts`, `mensajes/page.tsx`, `errors.ts`, `sedes/[id]/page.tsx`, `export.ts`, `social-comments.ts`, `crm.ts`, `attendance.ts`, `requireActor`, `server/reports.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `server/payroll.ts`, `booking.ts`, `localDate`, `integrations.ts`, `cash.ts`, `inventory.ts`, `messages.ts`, `activation.ts`, `messages.test.ts`, `crm-learning.ts`, `crm-ai.ts`, `crm-ambar.test.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06574074074074074 - nodes in this community are weakly interconnected._
- **Should `Input` be split into smaller, more focused modules?**
  _Cohesion score 0.13953488372093023 - nodes in this community are weakly interconnected._