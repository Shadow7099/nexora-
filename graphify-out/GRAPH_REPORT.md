# Graph Report - nexora-  (2026-11-19)

## Corpus Check
- 292 files · ~177,165 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1800 nodes · 7116 edges · 66 communities (61 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `407b35b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- AppError
- reportes/page.tsx
- (auth)/actions.ts
- localDate
- mensajes/actions.ts
- employees.ts
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- errors.ts
- compilerOptions
- Nexora: Arquitectura
- Card
- messages.test.ts
- scripts
- novelties.ts
- report-charts.tsx
- db.ts
- src/app/layout.tsx
- apple-icon.tsx
- requireActor
- next.config.ts
- server/reports.ts
- holidays.ts
- next
- attendance.ts
- toActionState
- guarantees.test.ts
- ref_node_crypto
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- lucide-react
- README.md
- pre-nomina/[id]/page.tsx
- 3. Administrador de la empresa
- Nexora: resumen académico
- pre-nomina/page.tsx
- Nexora: guía para continuar en un chat nuevo
- current.ts
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- SubmitButton
- plantilla-empresa.ts
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- utils.ts
- cash.ts
- chat.ts
- inventory.ts
- crm-webhooks.ts
- export.ts
- crm.ts
- crm/actions.ts
- messages.ts
- 3. Administrador de la empresa
- qr-scanner.tsx
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 139 edges
2. `requireActor()` - 128 edges
3. `requireCompanyAdmin()` - 121 edges
4. `next` - 96 edges
5. `audit()` - 95 edges
6. `Card()` - 90 edges
7. `SubmitButton()` - 88 edges
8. `toActionState()` - 84 edges
9. `lucide-react` - 81 edges
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

## Communities (66 total, 5 thin omitted)

### Community 0 - "cn"
Cohesion: 0.13
Nodes (24): EmployeeLayout(), AuthLayout(), EmployeePreview(), metadata, DesignSystemPage(), metadata, Section(), swatches (+16 more)

### Community 1 - "AppError"
Cohesion: 0.09
Nodes (57): Fase 6 · Pre-nómina estimada ✅ (hecha), fieldErrors(), newActivationCode(), audit(), requireCompanyAdmin(), updateCompanySettings(), addManualSession(), closeSessionManually() (+49 more)

### Community 2 - "reportes/page.tsx"
Cohesion: 0.15
Nodes (21): GET(), TYPES, metadata, metadata, NUMERIC, ReportPreviewPage(), Cell, Column (+13 more)

### Community 3 - "(auth)/actions.ts"
Cohesion: 0.07
Nodes (69): @simplewebauthn/browser, @simplewebauthn/server, activateAction(), changePasswordAction(), changeSchema, consentAction(), loginAction(), passkeyLoginAction() (+61 more)

### Community 4 - "localDate"
Cohesion: 0.17
Nodes (23): EmployeeHomePage(), metadata, currentOrNextShift(), cycleIndex(), isoOf(), localDate(), PatternDayInput, PatternInput (+15 more)

### Community 5 - "mensajes/actions.ts"
Cohesion: 0.24
Nodes (19): admin(), answerGapAction(), createTemplateAction(), deleteTemplateAction(), pauseAiAction(), reanalyzeAction(), refresh(), saveAiConfigAction() (+11 more)

### Community 6 - "employees.ts"
Cohesion: 0.07
Nodes (54): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), newActivationCodeAction(), passkeyExemptionAction(), resetPasswordAction() (+46 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.07
Nodes (39): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, addDays(), blockedResult(), bump(), classifyMinutes() (+31 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, jspdf@4.2.1, jspdf-autotable@5.0.9, lucide-react@1.62.0, next@16.4.6 (+18 more)

### Community 11 - "errors.ts"
Cohesion: 0.06
Nodes (72): submitLeadAction(), createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction() (+64 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "Card"
Cohesion: 0.16
Nodes (29): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), AiTab(), TemplatesTab(), AdminHome() (+21 more)

### Community 16 - "messages.test.ts"
Cohesion: 0.14
Nodes (19): loadChats(), listConversations(), createTemplate(), listTemplates(), META_STATUS, preview(), renderTemplate(), sendTemplate() (+11 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "novelties.ts"
Cohesion: 0.21
Nodes (12): zod, ADMIN_ONLY, approvedNoveltiesOn(), assertNoOverlap(), d(), isoDate, listInclude, noveltyLabel (+4 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.26
Nodes (18): delta(), qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP(), fmtDay() (+10 more)

### Community 20 - "db.ts"
Cohesion: 0.14
Nodes (19): server-only, db, globalForPrisma, AuditEntry, Tx, settingsSelect, reason, timeHHMM (+11 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "requireActor"
Cohesion: 0.13
Nodes (43): CashPage(), diffBadge(), metadata, CustomerPage(), metadata, CustomersPage(), metadata, InboxPage() (+35 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.12
Nodes (39): 6. Fases que faltan (plan detallado), Fase 7 · Dashboard y reportes ✅ (hecha), Fase 8 · Calidad y despliegue ✅ (hecha), ReportTable, toHours(), AttendanceInput, ATTENDED, dailyAttendance() (+31 more)

### Community 27 - "holidays.ts"
Cohesion: 0.40
Nodes (9): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+1 more)

### Community 28 - "next"
Cohesion: 0.11
Nodes (27): next, metadata, NewCustomerPage(), Form(), NewEmployeeForm(), Sites, today(), metadata (+19 more)

### Community 29 - "attendance.ts"
Cohesion: 0.08
Nodes (45): 4. Reglas del proyecto (no negociables), Controles implementados, distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), appPunchSchema (+37 more)

### Community 30 - "toActionState"
Cohesion: 0.10
Nodes (45): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+37 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "ref_node_crypto"
Cohesion: 0.14
Nodes (13): dotenv@18.0.9, prisma@7.10.1, @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm() (+5 more)

### Community 36 - "lucide-react"
Cohesion: 0.09
Nodes (32): lucide-react, EmployeesPage(), metadata, metadata, SetupPage(), hhmm(), metadata, SitePage() (+24 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 40 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.15
Nodes (18): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+10 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso (todas las cuentas), 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "pre-nomina/page.tsx"
Cohesion: 0.21
Nodes (14): fmt, href(), isoOf(), KIND_LABEL, label(), metadata, PayrollPage(), STATUS_TONE (+6 more)

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.25
Nodes (7): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 5. Guía técnica rápida, 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify), Nexora: guía para continuar en un chat nuevo

### Community 46 - "current.ts"
Cohesion: 0.12
Nodes (18): AdminLayout(), logoutAction(), ChangePasswordPage(), metadata, metadata, statusBadge, metadata, NewCompanyPage() (+10 more)

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

### Community 54 - "SubmitButton"
Cohesion: 0.05
Nodes (108): react, SettingsForm(), Actor, CHANNEL_ICON, Chats(), ChatsData, metadata, ORIGIN_LABEL (+100 more)

### Community 57 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 58 - "integrations.ts"
Cohesion: 0.10
Nodes (35): actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), IntegrationState, Item, companyIntegrations (+27 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "utils.ts"
Cohesion: 0.18
Nodes (17): day(), metadata, RequestsPage(), status, day(), HistoryPage(), metadata, Message() (+9 more)

### Community 61 - "cash.ts"
Cohesion: 0.06
Nodes (62): vitest, admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), admin() (+54 more)

### Community 62 - "chat.ts"
Cohesion: 0.07
Nodes (40): chatAction(), Cell, comparison, faqs, features, HeroVisual(), Home(), Mark() (+32 more)

### Community 64 - "inventory.ts"
Cohesion: 0.13
Nodes (27): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+19 more)

### Community 65 - "crm-webhooks.ts"
Cohesion: 0.16
Nodes (27): GET(), maxDuration, POST(), reply(), ingestLead(), fail(), genericLead, handleGenericLead() (+19 more)

### Community 67 - "export.ts"
Cohesion: 0.13
Nodes (20): GET(), GET(), ConsentPage(), items, metadata, LoginPage(), metadata, Inicio() (+12 more)

### Community 68 - "crm.ts"
Cohesion: 0.12
Nodes (25): ACTIVITY_LABEL, ACTIVITY_TYPES, activitySchema, addActivity(), companyUsers(), createCustomer(), createDeal(), customerFormSchema (+17 more)

### Community 71 - "crm/actions.ts"
Cohesion: 0.49
Nodes (10): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+2 more)

### Community 72 - "messages.ts"
Cohesion: 0.10
Nodes (23): AI_TAG_LABEL, AI_TAGS, AiOutput, analyzeConversation(), askClaude(), businessContext(), configSchema, getAiConfig() (+15 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

### Community 77 - "qr-scanner.tsx"
Cohesion: 0.28
Nodes (7): jsqr@1.4.0, react-dom@19.3.0, jsqr, react-dom, qrPath(), QrScanButton(), Status

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `cn`, `reportes/page.tsx`, `(auth)/actions.ts`, `localDate`, `mensajes/actions.ts`, `employees.ts`, `package.json`, `dependencies`, `errors.ts`, `Card`, `src/app/layout.tsx`, `apple-icon.tsx`, `requireActor`, `next.config.ts`, `toActionState`, `lucide-react`, `pre-nomina/[id]/page.tsx`, `pre-nomina/page.tsx`, `current.ts`, `SubmitButton`, `integrations.ts`, `utils.ts`, `cash.ts`, `chat.ts`, `inventory.ts`, `crm-webhooks.ts`, `export.ts`, `crm/actions.ts`, `qr-scanner.tsx`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.12941176470588237 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `cn`, `reportes/page.tsx`, `(auth)/actions.ts`, `localDate`, `mensajes/actions.ts`, `employees.ts`, `errors.ts`, `Nexora: Arquitectura`, `Card`, `report-charts.tsx`, `next`, `toActionState`, `lucide-react`, `pre-nomina/[id]/page.tsx`, `pre-nomina/page.tsx`, `current.ts`, `SubmitButton`, `integrations.ts`, `utils.ts`, `cash.ts`, `inventory.ts`, `export.ts`, `crm/actions.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.09044289044289044 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Nexora: Arquitectura` to `README.md`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06926406926406926 - nodes in this community are weakly interconnected._
- **Should `employees.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0744047619047619 - nodes in this community are weakly interconnected._