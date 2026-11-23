# Graph Report - nexora-  (2026-11-23)

## Corpus Check
- 316 files · ~209,597 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 2024 nodes · 8100 edges · 79 communities (72 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `ad49ebb6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lucide-react
- audit
- AppError
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
- Input
- scripts
- crm.ts
- inbox.tsx
- geo.ts
- src/app/layout.tsx
- apple-icon.tsx
- requireActor
- next.config.ts
- server/reports.ts
- empresas/[id]/page.tsx
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
- Card
- 3. Administrador de la empresa
- Nexora: resumen académico
- Button
- requireCompanyAdmin
- Nexora: guía para continuar en un chat nuevo
- card.tsx
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- terminal.tsx
- Revisión de seguridad (fase 8)
- sales.ts
- pos.ts
- run
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- inventory.ts
- integration-card.tsx
- solicitudes/actions.ts
- caja/actions.ts
- attendance.ts
- admin/actions.ts
- pattern-editor.tsx
- toActionState
- messages.test.ts
- vercel.json
- 3. Administrador de la empresa
- autorizacion/page.tsx
- aprendizaje-ia/route.ts
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 158 edges
2. `requireCompanyAdmin()` - 156 edges
3. `requireActor()` - 136 edges
4. `audit()` - 115 edges
5. `next` - 101 edges
6. `toActionState()` - 97 edges
7. `Card()` - 96 edges
8. `notFound()` - 95 edges
9. `SubmitButton()` - 94 edges
10. `lucide-react` - 86 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `4. Reglas del proyecto (no negociables)` --references--> `requireCompanyAdmin()`  [INFERRED]
  docs/CONTINUAR.md → src/server/authz.ts
- `Controles implementados` --references--> `registerOpen()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/registration.ts
- `Fase 6 · Pre-nómina estimada ✅ (hecha)` --references--> `listLaborParameters()`  [INFERRED]
  docs/CONTINUAR.md → src/server/payroll.ts

## Import Cycles
- None detected.

## Communities (79 total, 7 thin omitted)

### Community 0 - "lucide-react"
Cohesion: 0.12
Nodes (29): lucide-react, metadata, EmployeesPage(), metadata, metadata, NUMERIC, ReportPreviewPage(), metadata (+21 more)

### Community 1 - "audit"
Cohesion: 0.09
Nodes (41): audit(), ADMIN_ONLY, assertNoOverlap(), d(), decideNovelty(), isoDate, listInclude, listNovelties() (+33 more)

### Community 2 - "AppError"
Cohesion: 0.12
Nodes (30): zod, companySettingsSchema, contractSchema, employeeSchema, isoDate, loginSchema, money, PASSWORD_MIN (+22 more)

### Community 3 - "(auth)/actions.ts"
Cohesion: 0.08
Nodes (56): @simplewebauthn/browser, EmployeeHomePage(), metadata, changePasswordAction(), changeSchema, codeLoginAction(), consentAction(), loginAction() (+48 more)

### Community 4 - "Input"
Cohesion: 0.14
Nodes (21): submitLeadAction(), addParameterVersionAction(), echo(), superadmin(), verifyParameterAction(), ActivityForm(), CustomerForm(), DealForm() (+13 more)

### Community 5 - "mensajes/page.tsx"
Cohesion: 0.08
Nodes (34): Actor, AdsTab(), AiData, CHANNEL_ICON, Chats(), ChatsData, cop(), loadAi() (+26 more)

### Community 6 - "SubmitButton"
Cohesion: 0.15
Nodes (26): AccessCodePanel(), EditEmployeeForm(), NewContractForm(), PasskeyRequirement(), StatusButton(), Values, day(), MyRequestsPage() (+18 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.06
Nodes (51): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, addDays(), colombianHolidays(), easterSunday(), Holiday (+43 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0, lucide-react@1.62.0 (+21 more)

### Community 11 - "errors.ts"
Cohesion: 0.06
Nodes (65): vitest, hashPassword(), OPTIONS, verifyPassword(), fieldErrors(), requireSuperadmin(), temporaryPassword(), forbidden() (+57 more)

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
Cohesion: 0.13
Nodes (23): GET(), GET(), TYPES, GET(), Inicio(), ColumnKind, csvEscape(), reportFileName() (+15 more)

### Community 16 - "Input"
Cohesion: 0.13
Nodes (26): SettingsForm(), ActivateForm(), ChangePasswordPage(), metadata, PasswordForm(), LoginForm(), CashMovementForm(), CATEGORIES (+18 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "crm.ts"
Cohesion: 0.06
Nodes (61): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+53 more)

### Community 19 - "inbox.tsx"
Cohesion: 0.18
Nodes (32): admin(), answerGapAction(), appointmentStatusAction(), autoReplyAction(), bookAction(), bookingConfigAction(), clearDemoAction(), createTemplateAction() (+24 more)

### Community 20 - "geo.ts"
Cohesion: 0.33
Nodes (6): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), site

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "requireActor"
Cohesion: 0.09
Nodes (40): next, AgendaPage(), metadata, SOURCE, TONE, metadata, NewCustomerPage(), CustomersPage() (+32 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.06
Nodes (72): Fase 7 · Dashboard y reportes ✅ (hecha), delta(), metadata, qs(), ReportsPage(), AXIS, ChartCard(), CostChart() (+64 more)

### Community 27 - "empresas/[id]/page.tsx"
Cohesion: 0.15
Nodes (15): AdminLayout(), menuBadges(), logoutAction(), metadata, PlatformCompanyPage(), statusBadge, metadata, NewCompanyPage() (+7 more)

### Community 28 - "CardHeader"
Cohesion: 0.11
Nodes (31): class-variance-authority, AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso() (+23 more)

### Community 29 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.15
Nodes (19): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+11 more)

### Community 30 - "empresas-actions.ts"
Cohesion: 0.15
Nodes (21): react, createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction() (+13 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.12
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.18
Nodes (13): dotenv@18.0.9, prisma@7.10.1, @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm() (+5 more)

### Community 36 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 37 - "server/payroll.ts"
Cohesion: 0.08
Nodes (51): Fase 6 · Pre-nómina estimada ✅ (hecha), server-only, db, globalForPrisma, localDate(), zonedTimeToUtc(), addManualSession(), closeSessionManually() (+43 more)

### Community 38 - "README.md"
Cohesion: 0.21
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "new-employee-form.tsx"
Cohesion: 0.26
Nodes (11): ContractFields(), EmployeeFields(), Errors, F(), S(), Values, contractTypeLabel, documentTypeLabel (+3 more)

### Community 40 - "Card"
Cohesion: 0.13
Nodes (43): CashPage(), diffBadge(), CustomerPage(), metadata, AiTab(), CommentsTab(), InboxPage(), TemplatesTab() (+35 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso, 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "Button"
Cohesion: 0.15
Nodes (24): admin(), checkoutAction(), createFamilyAction(), hideCategoryAction(), loadYarnShopAction(), refresh(), saveCategoryAction(), ErrorPage() (+16 more)

### Community 44 - "requireCompanyAdmin"
Cohesion: 0.04
Nodes (109): @anthropic-ai/sdk, loadChats(), setRequirePasskey(), requireCompanyAdmin(), ACTIVE, addDays(), availableSlots(), bookFromButton() (+101 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.20
Nodes (9): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Fase 8 · Calidad y despliegue ✅ (hecha) (+1 more)

### Community 46 - "card.tsx"
Cohesion: 0.15
Nodes (22): Form(), NewEmployeeForm(), Sites, today(), metadata, NewEmployeePage(), EmployeeSchedulePage(), fmtDate() (+14 more)

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
Cohesion: 0.14
Nodes (12): Después del software, Fase 2: qué quedó hecho, Fase 4: qué quedó hecho, Fases 3 y 5: qué quedó hecho, Módulos en vista previa, Plan de implementación, Cómo se ejecutan, Errores encontrados por las pruebas (y corregidos) (+4 more)

### Community 52 - "terminal.tsx"
Cohesion: 0.24
Nodes (16): Accessories(), Box(), CategoryArt(), Crochet(), Embroidery(), Needles(), shade(), YarnBall() (+8 more)

### Community 53 - "Revisión de seguridad (fase 8)"
Cohesion: 0.40
Nodes (5): Asesores de Supabase, Dependencias (`npm audit`, 2 nov. 2026), Límites conocidos y decisiones, Pendiente fuera del código, Revisión de seguridad (fase 8)

### Community 54 - "sales.ts"
Cohesion: 0.14
Nodes (23): admin(), createSaleAction(), voidSaleAction(), computeLine(), peso(), saleNumber(), companyToday(), Method (+15 more)

### Community 55 - "pos.ts"
Cohesion: 0.15
Nodes (11): METHODS, ALL, categorySchema, checkoutSchema, code(), COLORS, familySchema, hex (+3 more)

### Community 56 - "run"
Cohesion: 0.39
Nodes (12): autoLearnAction(), run(), AppointmentActions(), AutoReplyToggle(), BookingPanel(), ChatAiToggle(), CommentCard(), DemoControls() (+4 more)

### Community 57 - "[token]/page.tsx"
Cohesion: 0.33
Nodes (6): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage()

### Community 58 - "integrations.ts"
Cohesion: 0.14
Nodes (23): actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), integrationById(), decryptSecret(), encryptSecret() (+15 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.13
Nodes (22): EmployeeLayout(), AuthLayout(), EmployeePreview(), metadata, DesignSystemPage(), metadata, Section(), swatches (+14 more)

### Community 61 - "cash.ts"
Cohesion: 0.19
Nodes (22): activeClosing(), addCashMovement(), addDays(), assertOpen(), cashDay(), checkDate(), closeCashDay(), closeSchema (+14 more)

### Community 62 - "chat.ts"
Cohesion: 0.06
Nodes (41): chatAction(), Cell, comparison, faqs, features, HeroVisual(), Home(), Mark() (+33 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "inventory.ts"
Cohesion: 0.13
Nodes (27): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+19 more)

### Community 65 - "integration-card.tsx"
Cohesion: 0.20
Nodes (12): IntegrationCard(), IntegrationState, noop(), STATUS, WEBHOOK, when(), Item, companyIntegrations (+4 more)

### Community 66 - "solicitudes/actions.ts"
Cohesion: 0.60
Nodes (5): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction()

### Community 67 - "caja/actions.ts"
Cohesion: 0.40
Nodes (9): admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), lockDay(), reopenCashDay() (+1 more)

### Community 68 - "attendance.ts"
Cohesion: 0.06
Nodes (71): 4. Reglas del proyecto (no negociables), Controles implementados, assignAccessCode(), codeAad(), CodeLoginResult, getAccessCode(), hashCode(), hashLoginToken() (+63 more)

### Community 69 - "admin/actions.ts"
Cohesion: 0.33
Nodes (12): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+4 more)

### Community 70 - "pattern-editor.tsx"
Cohesion: 0.38
Nodes (6): setPatternAction(), Opt, PatternEditor(), save(), Slot, WEEK

### Community 71 - "toActionState"
Cohesion: 0.24
Nodes (22): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+14 more)

### Community 72 - "messages.test.ts"
Cohesion: 0.09
Nodes (23): AuditEntry, Tx, setConversationAiPaused(), Fetch, TESTERS, TestResult, sendReply(), createTemplate() (+15 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.15
Nodes (13): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+5 more)

### Community 75 - "autorizacion/page.tsx"
Cohesion: 0.38
Nodes (5): ConsentForm(), ConsentPage(), items, metadata, CONSENT_POLICY_VERSION

### Community 79 - "aprendizaje-ia/route.ts"
Cohesion: 0.60
Nodes (4): authorized(), GET(), maxDuration, learnAll()

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `lucide-react`, `(auth)/actions.ts`, `Input`, `mensajes/page.tsx`, `SubmitButton`, `Nexora: Arquitectura`, `sedes/[id]/page.tsx`, `export.ts`, `Input`, `crm.ts`, `inbox.tsx`, `server/reports.ts`, `empresas/[id]/page.tsx`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `Card`, `Button`, `card.tsx`, `sales.ts`, `integrations.ts`, `Badge`, `inventory.ts`, `solicitudes/actions.ts`, `caja/actions.ts`, `admin/actions.ts`, `toActionState`, `autorizacion/page.tsx`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.11846689895470383 - nodes in this community are weakly interconnected._
- **Why does `next` connect `requireActor` to `lucide-react`, `(auth)/actions.ts`, `Input`, `mensajes/page.tsx`, `package.json`, `dependencies`, `sedes/[id]/page.tsx`, `export.ts`, `Input`, `crm.ts`, `inbox.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `next.config.ts`, `server/reports.ts`, `empresas/[id]/page.tsx`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `empresas-actions.ts`, `Card`, `Button`, `card.tsx`, `terminal.tsx`, `sales.ts`, `[token]/page.tsx`, `integrations.ts`, `Badge`, `chat.ts`, `proxy.ts`, `inventory.ts`, `solicitudes/actions.ts`, `caja/actions.ts`, `admin/actions.ts`, `toActionState`, `autorizacion/page.tsx`, `aprendizaje-ia/route.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `audit` be split into smaller, more focused modules?**
  _Cohesion score 0.08843537414965986 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `lucide-react`, `audit`, `(auth)/actions.ts`, `mensajes/page.tsx`, `errors.ts`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `server/reports.ts`, `empresas/[id]/page.tsx`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `server/payroll.ts`, `Card`, `requireCompanyAdmin`, `card.tsx`, `sales.ts`, `pos.ts`, `integrations.ts`, `cash.ts`, `chat.ts`, `inventory.ts`, `caja/actions.ts`, `attendance.ts`, `messages.test.ts`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08208955223880597 - nodes in this community are weakly interconnected._