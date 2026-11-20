# Graph Report - nexora-  (2026-11-20)

## Corpus Check
- 298 files · ~190,059 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1874 nodes · 7452 edges · 75 communities (69 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `a2169cec`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-shell.tsx
- AppError
- db.ts
- (auth)/actions.ts
- Input
- inbox.tsx
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
- lucide-react
- next.config.ts
- server/reports.ts
- novelties.ts
- CardHeader
- pre-nomina/[id]/page.tsx
- toActionState
- guarantees.test.ts
- seed.ts
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- plantilla-empresa.ts
- mensajes/page.tsx
- README.md
- react
- requireActor
- 3. Administrador de la empresa
- Nexora: resumen académico
- Select
- messages.ts
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
- lib/reports.ts
- modules.ts
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- errors.ts
- Button
- app/solicitudes/page.tsx
- geo.ts
- crm.ts
- autorizacion/page.tsx
- dotenv
- AppError
- 3. Administrador de la empresa
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 145 edges
2. `requireCompanyAdmin()` - 136 edges
3. `requireActor()` - 128 edges
4. `audit()` - 103 edges
5. `next` - 95 edges
6. `Card()` - 92 edges
7. `SubmitButton()` - 90 edges
8. `toActionState()` - 88 edges
9. `notFound()` - 85 edges
10. `lucide-react` - 81 edges

## Surprising Connections (you probably didn't know these)
- `3. Sesiones y autorización` --references--> `requireActor()`  [INFERRED]
  docs/ARQUITECTURA.md → src/server/current.ts
- `5. Guía técnica rápida` --references--> `relinkWithPasskey()`  [INFERRED]
  docs/CONTINUAR.md → src/server/passkeys.ts
- `Controles implementados` --references--> `safeNext()`  [INFERRED]
  docs/SEGURIDAD.md → src/app/(auth)/actions.ts
- `Controles implementados` --references--> `setPayrollStatus()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/payroll.ts
- `Controles implementados` --references--> `registerOpen()`  [INFERRED]
  docs/SEGURIDAD.md → src/server/registration.ts

## Import Cycles
- None detected.

## Communities (75 total, 6 thin omitted)

### Community 0 - "admin-shell.tsx"
Cohesion: 0.11
Nodes (25): EmployeesPage(), metadata, fmt, href(), isoOf(), KIND_LABEL, label(), metadata (+17 more)

### Community 1 - "AppError"
Cohesion: 0.07
Nodes (50): zod, zonedTimeToUtc(), contractSchema, employeeSchema, fieldErrors(), isoDate, money, passwordSchema (+42 more)

### Community 2 - "db.ts"
Cohesion: 0.10
Nodes (40): server-only, globalForPrisma, companySettingsSchema, assignAccessCode(), codeAad(), CodeLoginResult, getAccessCode(), hashCode() (+32 more)

### Community 3 - "(auth)/actions.ts"
Cohesion: 0.08
Nodes (58): @simplewebauthn/browser, EmployeeHomePage(), metadata, changePasswordAction(), changeSchema, codeLoginAction(), consentAction(), loginAction() (+50 more)

### Community 4 - "Input"
Cohesion: 0.19
Nodes (18): SettingsForm(), ActivateForm(), ChangePasswordPage(), metadata, PasswordForm(), LoginForm(), LoginPage(), metadata (+10 more)

### Community 5 - "inbox.tsx"
Cohesion: 0.15
Nodes (43): admin(), answerGapAction(), autoReplyAction(), clearDemoAction(), createTemplateAction(), deleteTemplateAction(), ignoreCommentAction(), loadDemoAction() (+35 more)

### Community 6 - "SubmitButton"
Cohesion: 0.15
Nodes (24): TemplateForm(), TemplateSender(), InvitationForm(), RevokeInvitationButton(), LeadStatusButtons(), NEXT, One(), ClearOverride() (+16 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.07
Nodes (38): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, blockedResult(), bump(), classifyMinutes(), commercialDays() (+30 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0, lucide-react@1.62.0 (+23 more)

### Community 11 - "errors.ts"
Cohesion: 0.08
Nodes (47): hashPassword(), OPTIONS, verifyPassword(), requireSuperadmin(), temporaryPassword(), createCompany(), getCompanyForPlatform(), newCompanySchema (+39 more)

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
Cohesion: 0.13
Nodes (21): GET(), TYPES, GET(), Inicio(), ColumnKind, csvEscape(), reportFileName(), ReportTable (+13 more)

### Community 16 - "social-comments.ts"
Cohesion: 0.09
Nodes (21): ADS, CHATS, clearDemo(), COMMENTS, DEMO_SOURCE, DemoChat, DemoMsg, loadDemo() (+13 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "crm.ts"
Cohesion: 0.11
Nodes (36): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+28 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.26
Nodes (18): delta(), qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP(), fmtDay() (+10 more)

### Community 20 - "attendance.ts"
Cohesion: 0.10
Nodes (39): Controles implementados, @simplewebauthn/server, appPunchSchema, ConcurrentPunch, DayStatus, employeeDeviceContext(), employeeHistory(), logAttempt() (+31 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lucide-react"
Cohesion: 0.10
Nodes (50): class-variance-authority, lucide-react, CashPage(), diffBadge(), metadata, CustomerPage(), metadata, CustomersPage() (+42 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.23
Nodes (21): Fase 7 · Dashboard y reportes ✅ (hecha), toHours(), daysBetween(), monthlyPunctuality(), previousRange(), summarize(), reasonLabel, attendanceRows() (+13 more)

### Community 27 - "novelties.ts"
Cohesion: 0.21
Nodes (12): ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap(), d(), isoDate, listInclude, listNovelties(), noveltyLabel (+4 more)

### Community 28 - "CardHeader"
Cohesion: 0.12
Nodes (44): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+36 more)

### Community 29 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.19
Nodes (16): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, PlatformParametersPage() (+8 more)

### Community 30 - "toActionState"
Cohesion: 0.06
Nodes (72): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+64 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "seed.ts"
Cohesion: 0.43
Nodes (5): d(), db, hm(), main(), publicCode()

### Community 36 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 37 - "mensajes/page.tsx"
Cohesion: 0.12
Nodes (24): Actor, AdsTab(), CHANNEL_ICON, ChatsData, cop(), InboxPage(), loadChats(), metadata (+16 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "react"
Cohesion: 0.10
Nodes (30): react, AccessCodePanel(), EditEmployeeForm(), NewContractForm(), PasskeyRequirement(), StatusButton(), Values, Form() (+22 more)

### Community 40 - "requireActor"
Cohesion: 0.08
Nodes (39): next, metadata, NewCustomerPage(), AiTab(), metadata, NewProductPage(), AdminLayout(), menuBadges() (+31 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso, 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "Select"
Cohesion: 0.14
Nodes (20): submitLeadAction(), ActivityForm(), CustomerForm(), DealForm(), DealStageSelect(), manualSubmit(), STAGES, MovementForm() (+12 more)

### Community 44 - "messages.ts"
Cohesion: 0.11
Nodes (22): AI_TAG_LABEL, AI_TAGS, AiOutput, analyzeConversation(), askClaude(), businessContext(), configSchema, demoAnalysis() (+14 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.18
Nodes (10): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+2 more)

### Community 46 - "localDate"
Cohesion: 0.22
Nodes (13): prng(), seedAttendance(), currentOrNextShift(), cycleIndex(), isoOf(), localDate(), PatternDayInput, PatternInput (+5 more)

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

### Community 54 - "sale-form.tsx"
Cohesion: 0.24
Nodes (11): admin(), createSaleAction(), voidSaleAction(), Customer, Line, num(), Product, SaleForm() (+3 more)

### Community 55 - "lib/reports.ts"
Cohesion: 0.17
Nodes (17): AttendanceInput, ATTENDED, dailyAttendance(), DayRow, DayRowStatus, dayStatusLabel, groupBy(), hoursBySite() (+9 more)

### Community 56 - "modules.ts"
Cohesion: 0.22
Nodes (15): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+7 more)

### Community 57 - "[token]/page.tsx"
Cohesion: 0.33
Nodes (6): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage()

### Community 58 - "integrations.ts"
Cohesion: 0.08
Nodes (44): CompanyIntegrationsPage(), metadata, actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), IntegrationCard() (+36 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.15
Nodes (24): EmployeeLayout(), AuthLayout(), EmployeePreview(), metadata, DesignSystemPage(), metadata, Section(), swatches (+16 more)

### Community 61 - "cash.ts"
Cohesion: 0.10
Nodes (43): saleNumber(), activeClosing(), addCashMovement(), addDays(), assertOpen(), cashDay(), checkDate(), closeCashDay() (+35 more)

### Community 62 - "chat.ts"
Cohesion: 0.07
Nodes (40): chatAction(), Cell, comparison, faqs, features, HeroVisual(), Home(), Mark() (+32 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "errors.ts"
Cohesion: 0.07
Nodes (37): vitest, db, createProduct(), duplicateSku(), getOwnProduct(), getProduct(), listSchema, MOVEMENT_LABEL (+29 more)

### Community 65 - "Button"
Cohesion: 0.26
Nodes (9): ErrorPage(), DAYS, SiteForm(), Values, TemplateForm(), TemplateList(), TemplateRow, ToggleActive() (+1 more)

### Community 66 - "app/solicitudes/page.tsx"
Cohesion: 0.36
Nodes (8): day(), EMPLOYEE_TYPES, metadata, MyRequestsPage(), status, CancelNovelty(), NoveltyRequestForm(), OvertimeNote()

### Community 67 - "geo.ts"
Cohesion: 0.33
Nodes (6): distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), site

### Community 68 - "crm.ts"
Cohesion: 0.13
Nodes (31): GET(), maxDuration, POST(), reply(), adFromMetaReferral(), commentFromChange(), fail(), genericLead (+23 more)

### Community 69 - "autorizacion/page.tsx"
Cohesion: 0.36
Nodes (6): ConsentForm(), ConsentPage(), items, metadata, CONSENT_POLICY_VERSION, homeFor()

### Community 70 - "dotenv"
Cohesion: 0.40
Nodes (4): dotenv@18.0.9, prisma@7.10.1, dotenv, prisma

### Community 72 - "AppError"
Cohesion: 0.07
Nodes (68): Fase 6 · Pre-nómina estimada ✅ (hecha), GET(), regenerateAccessCode(), setRequirePasskey(), audit(), requireCompanyAdmin(), updateCompanySettings(), answerGap() (+60 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

## Knowledge Gaps
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `requireActor` to `admin-shell.tsx`, `(auth)/actions.ts`, `Input`, `inbox.tsx`, `package.json`, `dependencies`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `lucide-react`, `next.config.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `toActionState`, `mensajes/page.tsx`, `react`, `sale-form.tsx`, `[token]/page.tsx`, `integrations.ts`, `Badge`, `chat.ts`, `proxy.ts`, `app/solicitudes/page.tsx`, `crm.ts`, `autorizacion/page.tsx`, `AppError`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `admin-shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11083743842364532 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `admin-shell.tsx`, `(auth)/actions.ts`, `Input`, `inbox.tsx`, `Nexora: Arquitectura`, `sedes/[id]/page.tsx`, `export.ts`, `crm.ts`, `report-charts.tsx`, `lucide-react`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `toActionState`, `mensajes/page.tsx`, `sale-form.tsx`, `integrations.ts`, `Badge`, `app/solicitudes/page.tsx`, `autorizacion/page.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.0726775956284153 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Nexora: Arquitectura` to `README.md`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0957372466806429 - nodes in this community are weakly interconnected._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08013640238704177 - nodes in this community are weakly interconnected._