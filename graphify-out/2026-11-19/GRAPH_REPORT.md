# Graph Report - nexora-  (2026-11-19)

## Corpus Check
- 293 files · ~179,236 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 1802 nodes · 7140 edges · 70 communities (65 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.89)
- Token cost: 80,000 input · 11,788 output

## Graph Freshness
- Built from commit: `c910ae05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- AppError
- sessions.ts
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
- devices.ts
- admin/solicitudes/page.tsx
- scripts
- employees.ts
- report-charts.tsx
- errors.ts
- src/app/layout.tsx
- apple-icon.tsx
- lucide-react
- next.config.ts
- server/reports.ts
- holidays.ts
- horarios/[id]/page.tsx
- attendance.ts
- toActionState
- guarantees.test.ts
- ref_node_crypto
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- sedes/page.tsx
- mensajes/page.tsx
- README.md
- phase35.test.ts
- requireActor
- 3. Administrador de la empresa
- Nexora: resumen académico
- integration-card.tsx
- solicitudes/actions.ts
- Nexora: guía para continuar en un chat nuevo
- empresas-actions.ts
- Manual de instalación (entorno local)
- attendance.spec.ts
- Instrucciones de despliegue
- Información que se necesita de la empresa real
- Plan de implementación
- Pruebas y resultados
- Revisión de seguridad (fase 8)
- SubmitButton
- integrations-list.tsx
- pre-nomina/actions.ts
- [token]/page.tsx
- integrations.ts
- Cuestionario para activar la empresa en Nexora
- Badge
- cash.ts
- chat.ts
- proxy.ts
- inventory.ts
- crm.ts
- crm/actions.ts
- messages.test.ts
- 3. Administrador de la empresa
- sql-produccion.py

## God Nodes (most connected - your core abstractions)
1. `AppError` - 139 edges
2. `requireActor()` - 128 edges
3. `requireCompanyAdmin()` - 123 edges
4. `audit()` - 96 edges
5. `next` - 95 edges
6. `Card()` - 90 edges
7. `SubmitButton()` - 89 edges
8. `toActionState()` - 85 edges
9. `lucide-react` - 81 edges
10. `PageHeader()` - 79 edges

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

## Communities (70 total, 5 thin omitted)

### Community 0 - "cn"
Cohesion: 0.21
Nodes (14): EmployeeLayout(), AuthLayout(), ShellUser, EmployeeShell(), adminNav, CURRENT_PHASE, employeeNav, isActive() (+6 more)

### Community 1 - "AppError"
Cohesion: 0.09
Nodes (67): fieldErrors(), regenerateAccessCode(), setRequirePasskey(), audit(), requireCompanyAdmin(), reopenCashDay(), voidCashMovement(), updateCompanySettings() (+59 more)

### Community 2 - "sessions.ts"
Cohesion: 0.12
Nodes (33): verifyPassword(), assignAccessCode(), codeAad(), CodeLoginResult, getAccessCode(), hashCode(), hashLoginToken(), loginWithCode() (+25 more)

### Community 3 - "(auth)/actions.ts"
Cohesion: 0.08
Nodes (53): @simplewebauthn/browser, EmployeeHomePage(), metadata, changePasswordAction(), changeSchema, codeLoginAction(), consentAction(), loginAction() (+45 more)

### Community 4 - "localDate"
Cohesion: 0.14
Nodes (30): currentOrNextShift(), cycleIndex(), isoOf(), localDate(), OverrideInput, PatternDayInput, PatternInput, ResolvedShift (+22 more)

### Community 5 - "mensajes/actions.ts"
Cohesion: 0.17
Nodes (29): admin(), answerGapAction(), createTemplateAction(), deleteTemplateAction(), pauseAiAction(), reanalyzeAction(), refresh(), saveAiConfigAction() (+21 more)

### Community 6 - "employees.ts"
Cohesion: 0.10
Nodes (40): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), passkeyExemptionAction(), regenerateAccessCodeAction(), requirePasskeyAction() (+32 more)

### Community 7 - "@playwright/test"
Cohesion: 0.05
Nodes (3): PORT, @playwright/test, pages

### Community 8 - "lib/payroll.ts"
Cohesion: 0.05
Nodes (62): Fase 6 · Pre-nómina estimada ✅ (hecha), LABOR_PARAMETERS, LaborParameterSeed, q(), rows, addParameterVersionAction(), echo(), superadmin() (+54 more)

### Community 9 - "package.json"
Cohesion: 0.08
Nodes (31): eslintConfig, devDependencies, eslint@^9, eslint-config-next@16.4.6, @playwright/test@1.64.1, tailwindcss@^4, @tailwindcss/turbopack@^4, tsx@4.23.15 (+23 more)

### Community 10 - "dependencies"
Cohesion: 0.06
Nodes (31): dependencies, @anthropic-ai/sdk@1.8.0, class-variance-authority@0.7.1, clsx@2.1.1, exceljs@4.4.0, jspdf@4.2.1, jspdf-autotable@5.0.9, jsqr@1.4.0 (+23 more)

### Community 11 - "errors.ts"
Cohesion: 0.07
Nodes (44): vitest, hashPassword(), OPTIONS, requireSuperadmin(), temporaryPassword(), listLeads(), MAX_LEADS_PER_IP_PER_HOUR, submitLead() (+36 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Nexora: Arquitectura"
Cohesion: 0.11
Nodes (18): 1. Decisiones principales, 2. Vista general, 3. Sesiones y autorización, 4. Multiempresa (aislamiento de datos), 5. Modelo de datos, 6. Seguridad de la marcación con QR, 7. Pre-nómina (fase 6), 7b. Tablero y reportes (fase 7) (+10 more)

### Community 14 - "Card"
Cohesion: 0.13
Nodes (40): AttendancePage(), metadata, statusBadge, metadata, SettingsPage(), CustomerPage(), metadata, metadata (+32 more)

### Community 15 - "devices.ts"
Cohesion: 0.14
Nodes (25): employeeHistory(), PASSKEY_MISSING_MESSAGE, STALE_SESSION_HOURS, requireEmployee(), addRelinkedWindow(), bindDevice(), findBinding(), hashDeviceToken() (+17 more)

### Community 16 - "admin/solicitudes/page.tsx"
Cohesion: 0.19
Nodes (16): Form(), NewEmployeeForm(), Sites, today(), metadata, NewEmployeePage(), day(), metadata (+8 more)

### Community 17 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "employees.ts"
Cohesion: 0.15
Nodes (21): zod, companySettingsSchema, contractSchema, employeeSchema, isoDate, loginSchema, money, PASSWORD_MIN (+13 more)

### Community 19 - "report-charts.tsx"
Cohesion: 0.24
Nodes (20): delta(), metadata, qs(), ReportsPage(), AXIS, ChartCard(), CostChart(), fmtCOP() (+12 more)

### Community 20 - "errors.ts"
Cohesion: 0.10
Nodes (29): server-only, db, globalForPrisma, AuditEntry, Tx, settingsSelect, reason, timeHHMM (+21 more)

### Community 21 - "src/app/layout.tsx"
Cohesion: 0.22
Nodes (8): geist@1.8.2, next-themes@0.4.6, geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "apple-icon.tsx"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "lucide-react"
Cohesion: 0.10
Nodes (47): lucide-react, CashPage(), diffBadge(), metadata, CustomersPage(), metadata, InboxPage(), COLUMN_TONE (+39 more)

### Community 24 - "next.config.ts"
Cohesion: 0.50
Nodes (3): csp, nextConfig, securityHeaders

### Community 26 - "server/reports.ts"
Cohesion: 0.05
Nodes (76): Fase 7 · Dashboard y reportes ✅ (hecha), exceljs, Col, days, emp, hdr, info, qs (+68 more)

### Community 27 - "holidays.ts"
Cohesion: 0.22
Nodes (15): addDays(), colombianHolidays(), easterSunday(), Holiday, holidayOn(), holidaysBetween(), iso(), nextMonday() (+7 more)

### Community 28 - "horarios/[id]/page.tsx"
Cohesion: 0.17
Nodes (16): EmployeesPage(), metadata, EmployeeSchedulePage(), fmtDate(), metadata, hhmm(), metadata, SchedulesPage() (+8 more)

### Community 29 - "attendance.ts"
Cohesion: 0.13
Nodes (24): Controles implementados, distanceMeters(), evaluateLocation(), GeoInput, GeoVerdict, rad(), appPunchSchema, ConcurrentPunch (+16 more)

### Community 30 - "toActionState"
Cohesion: 0.21
Nodes (25): addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction(), decideOvertimeAction(), echo() (+17 more)

### Community 31 - "guarantees.test.ts"
Cohesion: 0.16
Nodes (4): pg@8.23.1, pg, client, TEST_DATABASE_URL

### Community 32 - "ref_node_crypto"
Cohesion: 0.18
Nodes (13): dotenv@18.0.9, prisma@7.10.1, @prisma/adapter-pg@7.10.1, prng(), seedAttendance(), d(), db, hm() (+5 more)

### Community 36 - "sedes/page.tsx"
Cohesion: 0.26
Nodes (9): dayShort, metadata, SitesPage(), metadata, PrintQrPage(), PrintButton(), publicBaseUrl(), qrSvg() (+1 more)

### Community 37 - "mensajes/page.tsx"
Cohesion: 0.19
Nodes (13): Actor, CHANNEL_ICON, Chats(), ChatsData, metadata, ORIGIN_LABEL, STATUS_ICON, Tab (+5 more)

### Community 38 - "README.md"
Cohesion: 0.18
Nodes (8): Datos de demostración, Documentación, Estructura, Instalación local, Nexora, Pruebas, Requisitos, Rutas

### Community 39 - "phase35.test.ts"
Cohesion: 0.20
Nodes (10): day(), EMPLOYEE_TYPES, metadata, MyRequestsPage(), status, CancelNovelty(), myNovelties(), noveltyLabel (+2 more)

### Community 40 - "requireActor"
Cohesion: 0.09
Nodes (36): next, CompanyIntegrationsPage(), metadata, AdminLayout(), metadata, ParametersPage(), logoutAction(), metadata (+28 more)

### Community 41 - "3. Administrador de la empresa"
Cohesion: 0.22
Nodes (8): 0. Registrar un negocio nuevo, 1. Primer ingreso (todas las cuentas), 2. Empleado, 4. Superadministrador (Nexora), Historial y solicitudes, Manual de usuario, Marcar entrada y salida, Mensajes al marcar

### Community 42 - "Nexora: resumen académico"
Cohesion: 0.15
Nodes (12): 1. Problema empresarial, 2. Solución propuesta, 3. Público objetivo, 4. Propuesta de valor, 5. Modelo de ingresos, 6. Viabilidad económica preliminar, 7. Próximos pasos, Análisis económico (+4 more)

### Community 43 - "integration-card.tsx"
Cohesion: 0.22
Nodes (9): IntegrationCard(), noop(), STATUS, WEBHOOK, when(), Opt, Slot, WEEK (+1 more)

### Community 44 - "solicitudes/actions.ts"
Cohesion: 0.40
Nodes (8): cancelNoveltyAction(), echo(), employee(), overtimeNoteAction(), requestNoveltyAction(), NoveltyRequestForm(), OvertimeNote(), addOvertimeNote()

### Community 45 - "Nexora: guía para continuar en un chat nuevo"
Cohesion: 0.18
Nodes (10): 1. Prompt para el chat nuevo, 2. Estado actual, 3. Infraestructura, 4. Reglas del proyecto (no negociables), 5. Guía técnica rápida, 6. Fases que faltan (plan detallado), 7. Antes del piloto de 30 días (depende del usuario), 8. Mapa del código (graphify) (+2 more)

### Community 46 - "empresas-actions.ts"
Cohesion: 0.15
Nodes (20): ResetPasswordButton(), createCompanyAction(), createInvitationAction(), echo(), resetAdminPasswordAction(), revokeInvitationAction(), setCompanyStatusAction(), setLeadStatusAction() (+12 more)

### Community 47 - "Manual de instalación (entorno local)"
Cohesion: 0.25
Nodes (8): Bases de datos de prueba, Comandos útiles, Cuentas de la demo, Manual de instalación (entorno local), Pasos, Probar la marcación con QR en local, Problemas frecuentes, Requisitos

### Community 48 - "attendance.spec.ts"
Cohesion: 0.12
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
Cohesion: 0.11
Nodes (54): react, SettingsForm(), ActivateForm(), ConsentForm(), ChangePasswordPage(), metadata, PasswordForm(), LoginForm() (+46 more)

### Community 55 - "integrations-list.tsx"
Cohesion: 0.22
Nodes (8): IntegrationState, Item, companyIntegrations, integrationById(), IntegrationField, IntegrationProvider, INTEGRATIONS, platformIntegrations

### Community 56 - "pre-nomina/actions.ts"
Cohesion: 0.32
Nodes (6): computePayrollAction(), DONE, payrollStatusAction(), ComputePayrollButton(), PayrollStatusControls(), PayrollAction

### Community 57 - "[token]/page.tsx"
Cohesion: 0.32
Nodes (6): metadata, OpenRegisterPage(), RegisterForm(), metadata, reasons, RegisterPage()

### Community 58 - "integrations.ts"
Cohesion: 0.13
Nodes (28): actorFor(), pathFor(), removeIntegrationAction(), saveIntegrationAction(), testIntegrationAction(), decryptSecret(), encryptSecret(), key() (+20 more)

### Community 59 - "Cuestionario para activar la empresa en Nexora"
Cohesion: 0.20
Nodes (9): A. Empresa, B. Sedes (una fila por sede en la hoja «Sedes»), C. Empleados (una fila por empleado en la hoja «Empleados»), Cuestionario para activar la empresa en Nexora, D. Horarios (hojas «Turnos» y «Horarios»), E. Reglas de la empresa, F. Pre-nómina y revisión profesional, G. Dominio y despliegue (+1 more)

### Community 60 - "Badge"
Cohesion: 0.11
Nodes (29): d(), EstimatePage(), fmt, KIND_TITLE, metadata, sumRec(), day(), HistoryPage() (+21 more)

### Community 61 - "cash.ts"
Cohesion: 0.08
Nodes (52): admin(), cashMovementAction(), closeCashAction(), echo(), reopenCashAction(), voidCashAction(), admin(), createSaleAction() (+44 more)

### Community 62 - "chat.ts"
Cohesion: 0.07
Nodes (40): chatAction(), Cell, comparison, faqs, features, HeroVisual(), Home(), Mark() (+32 more)

### Community 63 - "proxy.ts"
Cohesion: 0.36
Nodes (5): canonicalRedirect(), config, COOKIES, PRIVATE, proxy()

### Community 64 - "inventory.ts"
Cohesion: 0.13
Nodes (27): admin(), createProductAction(), echo(), movementAction(), setProductActiveAction(), updateProductAction(), createProduct(), duplicateSku() (+19 more)

### Community 68 - "crm.ts"
Cohesion: 0.07
Nodes (52): GET(), maxDuration, POST(), reply(), ACTIVITY_LABEL, ACTIVITY_TYPES, activitySchema, addActivity() (+44 more)

### Community 71 - "crm/actions.ts"
Cohesion: 0.49
Nodes (10): addActivityAction(), admin(), completeTaskAction(), createCustomerAction(), createDealAction(), echo(), moveDealAction(), refresh() (+2 more)

### Community 72 - "messages.test.ts"
Cohesion: 0.10
Nodes (21): @anthropic-ai/sdk, loadChats(), AI_TAG_LABEL, AI_TAGS, AiOutput, analyzeConversation(), askClaude(), businessContext() (+13 more)

### Community 74 - "3. Administrador de la empresa"
Cohesion: 0.17
Nodes (12): 3. Administrador de la empresa, Caja, Configuración inicial (una sola vez), CRM, Día a día, Integraciones, Inventario, Mensajes (WhatsApp, Messenger e Instagram) (+4 more)

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `requireActor()` connect `requireActor` to `cn`, `(auth)/actions.ts`, `mensajes/actions.ts`, `employees.ts`, `lib/payroll.ts`, `Nexora: Arquitectura`, `Card`, `admin/solicitudes/page.tsx`, `report-charts.tsx`, `lucide-react`, `server/reports.ts`, `horarios/[id]/page.tsx`, `toActionState`, `sedes/page.tsx`, `mensajes/page.tsx`, `phase35.test.ts`, `solicitudes/actions.ts`, `empresas-actions.ts`, `SubmitButton`, `pre-nomina/actions.ts`, `integrations.ts`, `Badge`, `cash.ts`, `inventory.ts`, `crm/actions.ts`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `AppError` be split into smaller, more focused modules?**
  _Cohesion score 0.08568075117370892 - nodes in this community are weakly interconnected._
- **Why does `next` connect `requireActor` to `cn`, `(auth)/actions.ts`, `mensajes/actions.ts`, `employees.ts`, `lib/payroll.ts`, `package.json`, `dependencies`, `Card`, `admin/solicitudes/page.tsx`, `report-charts.tsx`, `src/app/layout.tsx`, `apple-icon.tsx`, `lucide-react`, `next.config.ts`, `server/reports.ts`, `horarios/[id]/page.tsx`, `toActionState`, `sedes/page.tsx`, `mensajes/page.tsx`, `phase35.test.ts`, `solicitudes/actions.ts`, `empresas-actions.ts`, `SubmitButton`, `pre-nomina/actions.ts`, `[token]/page.tsx`, `integrations.ts`, `Badge`, `cash.ts`, `chat.ts`, `proxy.ts`, `inventory.ts`, `crm.ts`, `crm/actions.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `sessions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11561561561561562 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Nexora: Arquitectura` to `README.md`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Should `(auth)/actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07972027972027972 - nodes in this community are weakly interconnected._
- **Should `localDate` be split into smaller, more focused modules?**
  _Cohesion score 0.14082503556187767 - nodes in this community are weakly interconnected._