# Graph Report - nexora-  (2026-11-19)

## Corpus Check
- 293 files · ~179,557 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1800 nodes · 7130 edges · 70 communities (65 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `3e856ca7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-shell.tsx
- AppError
- audit
- attendance.ts
- (auth)/actions.ts
- lucide-react
- SubmitButton
- @playwright/test
- lib/payroll.ts
- package.json
- dependencies
- errors.ts
- compilerOptions
- Nexora: Arquitectura
- requireActor
- export.ts
- new-employee-form.tsx
- scripts
- AppError
- report-charts.tsx
- errors.ts
- src/app/layout.tsx
- apple-icon.tsx
- lucide-react
- next.config.ts
- server/reports.ts
- server/payroll.ts
- CardHeader
- pre-nomina/[id]/page.tsx
- toActionState
- guarantees.test.ts
- ref_node_crypto
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
- employee-fields.tsx
- Nexora: guía para continuar en un chat nuevo
- empresas-actions.ts
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- Input
- integrations-list.tsx
- lead-form.tsx
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- inventory.ts
- template-form.tsx
- crm.ts
- notFound
- 3. Administrador de la empresa
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 139 edges
2. `requireActor()` - 128 edges
3. `requireCompanyAdmin()` - 122 edges
4. `audit()` - 95 edges
5. `next` - 95 edges
6. `Card()` - 90 edges
7. `SubmitButton()` - 88 edges
8. `toActionState()` - 84 edges
9. `lucide-react` - 81 edges
10. `PageHeader()` - 79 edges

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

## Communities (70 total, 5 thin omitted)

### Community 0 - "admin-shell.tsx"
Cohesion: 0.10
Nodes (26): EmployeesPage(), metadata, fmt, href(), isoOf(), KIND_LABEL, label(), metadata (+18 more)

### Community 1 - "AppError"
Cohesion: 0.07
Nodes (54): fieldErrors(), requireCompanyAdmin(), getCompanySettings(), addManualSession(), closeSessionManually(), toMin(), ADMIN_ONLY, assertNoOverlap() (+46 more)

### Community 2 - "audit"
Cohesion: 0.14
Nodes (29): CodeLoginResult, hashCode(), hashLoginToken(), loginWithCode(), normalizeCode(), passkeyLogin(), passkeyLoginOptions(), PasskeyLoginResult (+21 more)

### Community 3 - "attendance.ts"
Cohesion: 0.05
Nodes (79): Controles implementados, @simplewebauthn/browser, @simplewebauthn/server, EmployeeHomePage(), metadata, passkeyLoginAction(), bindDeviceAction(), employee() (+71 more)

### Community 4 - "(auth)/actions.ts"
Cohesion: 0.11
Nodes (27): changePasswordAction(), changeSchema, codeLoginAction(), consentAction(), loginAction(), passkeyLoginOptionsAction(), safeNext(), ActivateForm() (+19 more)

### Community 5 - "lucide-react"
Cohesion: 0.12
Nodes (23): lucide-react, metadata, delta(), metadata, qs(), ReportsPage(), metadata, NUMERIC (+15 more)

### Community 6 - "SubmitButton"
Cohesion: 0.13
Nodes (30): AccessCodePanel(), EditEmployeeForm(), NewContractForm(), PasskeyRequirement(), StatusButton(), Values, day(), MyRequestsPage() (+22 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.07
Nodes (41): LABOR_PARAMETERS, LaborParameterSeed, q(), rows, addDays(), blockedResult(), bump(), classifyMinutes() (+33 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0, lucide-react@1.62.0 (+18 more)

### Community 11 - "errors.ts"
Cohesion: 0.08
Nodes (40): vitest, db, globalForPrisma, hashPassword(), OPTIONS, verifyPassword(), temporaryPassword(), SetupStep (+32 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "requireActor"
Cohesion: 0.13
Nodes (32): metadata, NewCustomerPage(), AiTab(), InboxPage(), TemplatesTab(), NewEmployeePage(), metadata, n() (+24 more)

### Community 15 - "export.ts"
Cohesion: 0.14
Nodes (21): GET(), GET(), TYPES, GET(), Inicio(), ColumnKind, csvEscape(), reportFileName() (+13 more)

### Community 16 - "new-employee-form.tsx"
Cohesion: 0.43
Nodes (6): Form(), NewEmployeeForm(), Sites, today(), ActivationCode(), waNumber()

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "AppError"
Cohesion: 0.17
Nodes (24): assignAccessCode(), codeAad(), getAccessCode(), newCode(), regenerateAccessCode(), updateCompanySettings(), addActivity(), createCustomer() (+16 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.27
Nodes (17): recharts@3.10.1, recharts, AXIS, ChartCard(), CostChart(), fmtCOP(), fmtDay(), fmtMonth() (+9 more)

### Community 20 - "errors.ts"
Cohesion: 0.08
Nodes (43): server-only, zod, registerAction(), companySettingsSchema, contractSchema, employeeSchema, isoDate, money (+35 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lucide-react"
Cohesion: 0.14
Nodes (33): class-variance-authority, CashPage(), diffBadge(), metadata, CustomerPage(), metadata, CustomersPage(), metadata (+25 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.06
Nodes (77): Fase 7 · Dashboard y reportes ✅ (hecha), addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso() (+69 more)

### Community 27 - "server/payroll.ts"
Cohesion: 0.17
Nodes (18): Fase 6 · Pre-nómina estimada ✅ (hecha), addLaborParameterVersion(), CONCEPT_ORDER, day(), getPayrollEstimate(), iso(), isoDate, KIND_ORDER (+10 more)

### Community 28 - "CardHeader"
Cohesion: 0.12
Nodes (41): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), EmployeePage(), iso(), metadata (+33 more)

### Community 29 - "pre-nomina/[id]/page.tsx"
Cohesion: 0.16
Nodes (18): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), metadata, ParametersPage() (+10 more)

### Community 30 - "toActionState"
Cohesion: 0.06
Nodes (85): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+77 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "ref_node_crypto"
Cohesion: 0.18
Nodes (13): dotenv@18.0.9, prisma@7.10.1, @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm() (+5 more)

### Community 36 - "plantilla-empresa.ts"
Cohesion: 0.12
Nodes (10): exceljs@4.4.0, exceljs, Col, days, emp, hdr, info, qs (+2 more)

### Community 37 - "mensajes/page.tsx"
Cohesion: 0.13
Nodes (27): Actor, CHANNEL_ICON, Chats(), ChatsData, metadata, ORIGIN_LABEL, STATUS_ICON, Tab (+19 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "react"
Cohesion: 0.36
Nodes (7): react, CompanyStatusButtons(), NewCompanyForm(), ResetAdminPassword(), STATUS_ACTIONS, StatusButton(), TempPassword()

### Community 40 - "requireActor"
Cohesion: 0.09
Nodes (24): next, CompanyIntegrationsPage(), metadata, AdminLayout(), EMPLOYEE_TYPES, metadata, status, logoutAction() (+16 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso, 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "Select"
Cohesion: 0.15
Nodes (19): ActivityForm(), CustomerForm(), DealForm(), DealStageSelect(), manualSubmit(), STAGES, MovementForm(), ParameterVersionForm() (+11 more)

### Community 44 - "employee-fields.tsx"
Cohesion: 0.33
Nodes (7): Errors, Values, contractTypeLabel, documentTypeLabel, payFrequencyLabel, roleLabel, salaryTypeLabel

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.18
Nodes (10): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+2 more)

### Community 46 - "empresas-actions.ts"
Cohesion: 0.18
Nodes (16): metadata, PrintQrPage(), createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction() (+8 more)

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

### Community 54 - "Input"
Cohesion: 0.18
Nodes (20): SettingsForm(), CashMovementForm(), CATEGORIES, CloseCashForm(), manualSubmit(), ReopenCashForm(), VoidCashButton(), InvitationForm() (+12 more)

### Community 55 - "integrations-list.tsx"
Cohesion: 0.20
Nodes (12): IntegrationCard(), IntegrationState, noop(), STATUS, WEBHOOK, when(), Item, companyIntegrations (+4 more)

### Community 56 - "lead-form.tsx"
Cohesion: 0.70
Nodes (3): submitLeadAction(), LeadForm(), getClientIp()

### Community 57 - "[token]/page.tsx"
Cohesion: 0.33
Nodes (6): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage()

### Community 58 - "integrations.ts"
Cohesion: 0.15
Nodes (22): integrationById(), decryptSecret(), encryptSecret(), key(), secretsConfigured(), SecretsKeyMissing, associated(), Fetch (+14 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.16
Nodes (21): EmployeeLayout(), AuthLayout(), Message(), metadata, QrPage(), EmployeePreview(), metadata, DesignSystemPage() (+13 more)

### Community 61 - "cash.ts"
Cohesion: 0.09
Nodes (47): computeLine(), peso(), saleNumber(), activeClosing(), addCashMovement(), addDays(), assertOpen(), cashDay() (+39 more)

### Community 62 - "chat.ts"
Cohesion: 0.07
Nodes (40): chatAction(), Cell, comparison, faqs, features, HeroVisual(), Home(), Mark() (+32 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "inventory.ts"
Cohesion: 0.14
Nodes (26): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+18 more)

### Community 65 - "template-form.tsx"
Cohesion: 0.60
Nodes (4): TemplateForm(), TemplateList(), TemplateRow, ToggleActive()

### Community 68 - "crm.ts"
Cohesion: 0.08
Nodes (46): GET(), maxDuration, POST(), reply(), ACTIVITY_LABEL, ACTIVITY_TYPES, activitySchema, companyUsers() (+38 more)

### Community 72 - "notFound"
Cohesion: 0.07
Nodes (46): @anthropic-ai/sdk, loadChats(), AI_TAGS, AiOutput, analyzeConversation(), answerGap(), askClaude(), businessContext() (+38 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `requireActor` to `admin-shell.tsx`, `attendance.ts`, `(auth)/actions.ts`, `lucide-react`, `package.json`, `dependencies`, `requireActor`, `export.ts`, `new-employee-form.tsx`, `errors.ts`, `src/app/layout.tsx`, `apple-icon.tsx`, `lucide-react`, `next.config.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `toActionState`, `mensajes/page.tsx`, `react`, `empresas-actions.ts`, `[token]/page.tsx`, `Badge`, `chat.ts`, `proxy.ts`, `inventory.ts`, `crm.ts`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Should `admin-shell.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10080645161290322 - nodes in this community are weakly interconnected._
- **Why does `requireActor()` connect `requireActor` to `admin-shell.tsx`, `inventory.ts`, `attendance.ts`, `(auth)/actions.ts`, `mensajes/page.tsx`, `lucide-react`, `SubmitButton`, `requireActor`, `Nexora: Arquitectura`, `Badge`, `empresas-actions.ts`, `export.ts`, `lucide-react`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `toActionState`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.07475678443420379 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `AppError`, `audit`, `attendance.ts`, `lucide-react`, `errors.ts`, `requireActor`, `export.ts`, `errors.ts`, `lucide-react`, `server/reports.ts`, `server/payroll.ts`, `CardHeader`, `pre-nomina/[id]/page.tsx`, `toActionState`, `mensajes/page.tsx`, `requireActor`, `empresas-actions.ts`, `integrations.ts`, `cash.ts`, `chat.ts`, `inventory.ts`, `crm.ts`, `notFound`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `audit` be split into smaller, more focused modules?**
  _Cohesion score 0.1443850267379679 - nodes in this community are weakly interconnected._
- **Should `attendance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05218365061590145 - nodes in this community are weakly interconnected._