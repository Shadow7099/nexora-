# Graph Report - nexora-  (2026-11-01)

## Corpus Check
- 145 files · ~58,570 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: .example 1, (none) 1, .toml 1)

## Summary
- 883 nodes · 3190 edges · 26 communities (24 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.84)
- Token cost: 80,000 input · 11,788 output

## Community Hubs (Navigation)
- Páginas del panel admin
- Núcleo servidor y datos
- Acciones de gestión laboral
- Marcación QR del empleado
- Datos semilla demo
- Autenticación y sesiones
- Empleados y dispositivos
- Pruebas BD y e2e
- Seguridad de la marcación
- Configuración del paquete
- Dependencias de ejecución
- Aislamiento multiempresa y migraciones
- Configuración TypeScript
- Reglas laborales colombianas
- Esquema Prisma
- Rutas y estructura
- Dependencias de desarrollo
- Scripts npm
- Fases 1-3 y horarios
- Stack y decisiones técnicas
- Gestión laboral fase 5
- Layout raíz y tema
- Iconos de la app
- Configuración ESLint
- Configuración Next.js

## God Nodes (most connected - your core abstractions)
1. `requireActor()` - 62 edges
2. `requireCompanyAdmin()` - 55 edges
3. `next` - 48 edges
4. `AppError` - 47 edges
5. `Card()` - 44 edges
6. `lucide-react` - 43 edges
7. `audit()` - 41 edges
8. `SubmitButton()` - 40 edges
9. `cn()` - 40 edges
10. `FormAlert()` - 37 edges

## Surprising Connections (you probably didn't know these)
- `onPunch()` --indirect_call--> `publicCode()`  [INFERRED]
  src/components/employee/punch-panel.tsx → prisma/seed.ts
- `Nexora: Arquitectura` --references--> `Nexora (SaaS asistencia y pre-nómina)`  [EXTRACTED]
  docs/ARQUITECTURA.md → README.md
- `prisma/schema.prisma` --references--> `employee_contract`  [EXTRACTED]
  README.md → docs/ARQUITECTURA.md
- `Prisma 7 (adaptador pg)` --conceptually_related_to--> `prisma/schema.prisma`  [INFERRED]
  docs/ARQUITECTURA.md → README.md
- `20261029010000_fix_function_search_path` --conceptually_related_to--> `prisma/migrations`  [INFERRED]
  docs/DESPLIEGUE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Capas de verificación de la marcación QR** — concept_qr_public_code, concept_device_binding, concept_passkeys_webauthn, concept_geolocation_check, concept_idempotency_key, concept_table_attendance_attempt [EXTRACTED 1.00]
- **Capas de aislamiento multiempresa** — concept_dal, concept_composite_foreign_keys, tests_db_tenancy_test, concept_rls_closed_public_api [EXTRACTED 1.00]
- **Pre-nómina reproducible con parámetros legales versionados** — concept_table_labor_parameter, concept_versioned_labor_parameters, concept_parameter_snapshot, concept_missing_parameter_warning, concept_ley_2466_2025, concept_decreto_0159_2026 [INFERRED 0.85]

## Communities (26 total, 2 thin omitted)

### Community 0 - "Páginas del panel admin"
Cohesion: 0.06
Nodes (109): class-variance-authority, lucide-react, next, AttendancePage(), metadata, statusBadge, metadata, SettingsPage() (+101 more)

### Community 1 - "Núcleo servidor y datos"
Cohesion: 0.05
Nodes (110): server-only, zod, db, globalForPrisma, zonedTimeToUtc(), companySettingsSchema, contractSchema, employeeSchema (+102 more)

### Community 2 - "Acciones de gestión laboral"
Cohesion: 0.08
Nodes (72): react, SettingsForm(), addManualSessionAction(), admin(), clearOverrideAction(), closeSessionAction(), createSiteAction(), decideNoveltyAction() (+64 more)

### Community 3 - "Marcación QR del empleado"
Cohesion: 0.06
Nodes (62): @simplewebauthn/browser, @simplewebauthn/server, EmployeeLayout(), EmployeeHomePage(), metadata, bindDeviceAction(), employee(), passkeyRegistrationOptionsAction() (+54 more)

### Community 4 - "Datos semilla demo"
Cohesion: 0.08
Nodes (44): prng(), seedAttendance(), d(), db, hm(), main(), publicCode(), @prisma/adapter-pg (+36 more)

### Community 5 - "Autenticación y sesiones"
Cohesion: 0.09
Nodes (43): requireActor, src/server/actions.ts (Server Actions), src/server/, changePasswordAction(), changeSchema, consentAction(), loginAction(), logoutAction() (+35 more)

### Community 6 - "Empleados y dispositivos"
Cohesion: 0.11
Nodes (33): addContractAction(), admin(), approveDeviceAction(), createEmployeeAction(), echo(), resetPasswordAction(), revokeDeviceAction(), setStatusAction() (+25 more)

### Community 7 - "Pruebas BD y e2e"
Cohesion: 0.07
Nodes (9): PORT, pg, @playwright/test, client, CENTRO, FAR, PEOPLE, pages (+1 more)

### Community 8 - "Seguridad de la marcación"
Cohesion: 0.13
Nodes (12): APP_URL, Ley 1581 de 2012 (datos personales), src/components/employee/ (pantalla de marcación), Passkeys (WebAuthn / SimpleWebAuthn), Códigos de rechazo (INVALID_QR, DEVICE_NOT_BOUND, PASSKEY_FAILED, OUTSIDE_RADIUS, DUPLICATE_PUNCH…), /m/<código> (página del QR), device_binding, Información que se necesita de la empresa real (+4 more)

### Community 9 - "Configuración del paquete"
Cohesion: 0.09
Nodes (22): engines, node, name, private, version, clsx, dotenv, @node-rs/argon2 (+14 more)

### Community 10 - "Dependencias de ejecución"
Cohesion: 0.10
Nodes (21): dependencies, class-variance-authority, clsx, dotenv, geist, lucide-react, next, next-themes (+13 more)

### Community 11 - "Aislamiento multiempresa y migraciones"
Cohesion: 0.14
Nodes (11): DATABASE_URL (transaction pooler 6543), 20261029020000_block_truncate, 20261029010000_fix_function_search_path, 20261027150316_init, 20261029000000_lock_data_api, prisma/migrations, SESSION_SECRET, Supabase (PostgreSQL 17, us-east-1) (+3 more)

### Community 12 - "Configuración TypeScript"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 13 - "Reglas laborales colombianas"
Cohesion: 0.18
Nodes (12): Ley 2466 de 2025, Ley 2578 de 2026 (Virgen de Chiquinquirá), Ley 51 de 1983 (festivos), Nexora (SaaS asistencia y pre-nómina), Revisión profesional (jurídica y nómina), Plan de implementación, Fase 6: Pre-nómina, Fase 7: Dashboard y reportes (+4 more)

### Community 14 - "Esquema Prisma"
Cohesion: 0.22
Nodes (17): prisma/schema.prisma, parameter_snapshot, app_user, attendance_attempt, audit_log, company, data_consent, holiday (+9 more)

### Community 15 - "Rutas y estructura"
Cohesion: 0.12
Nodes (12): src/components/ui/, src/lib/, /admin, /app, /ingresar, /plataforma, Datos de demostración (Panadería El Trigal), Estructura del repositorio (+4 more)

### Community 16 - "Dependencias de desarrollo"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/turbopack, tsx, @types/node (+6 more)

### Community 17 - "Scripts npm"
Cohesion: 0.15
Nodes (13): scripts, build, check, db:generate, db:migrate, db:seed, dev, lint (+5 more)

### Community 18 - "Fases 1-3 y horarios"
Cohesion: 0.20
Nodes (8): Argon2id (hash de contraseñas), /sistema (sistema de diseño), schedule_pattern, schedule_pattern_day, shift_template, Fase 1: Arquitectura y diseño, Fase 2: Autenticación y usuarios, Fase 3: Empresas y sedes

### Community 19 - "Stack y decisiones técnicas"
Cohesion: 0.20
Nodes (4): Decreto 0159 de 2026, Decreto 1469 de 2025, prisma migrate deploy (session pooler), Nexora: Arquitectura

### Community 20 - "Gestión laboral fase 5"
Cohesion: 0.38
Nodes (8): attendance_event, employee, employee_contract, novelty, overtime_request, scheduled_shift, work_session, Fase 5: Gestión laboral

### Community 21 - "Layout raíz y tema"
Cohesion: 0.28
Nodes (6): geist, next-themes, metadata, RootLayout(), viewport, ThemeProvider()

### Community 22 - "Iconos de la app"
Cohesion: 0.31
Nodes (7): AppleIcon(), contentType, size, contentType, Icon(), Mark(), size

### Community 23 - "Configuración ESLint"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **19 isolated node(s):** `@prisma/client`, `@tailwindcss/turbopack`, `@types/node`, `@types/pg`, `@types/qrcode` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 242 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Páginas del panel admin` to `Acciones de gestión laboral`, `Marcación QR del empleado`, `Autenticación y sesiones`, `Empleados y dispositivos`, `Configuración del paquete`, `Rutas y estructura`, `Layout raíz y tema`, `Iconos de la app`, `Configuración Next.js`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `@tailwindcss/turbopack`, `@types/node` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Páginas del panel admin` be split into smaller, more focused modules?**
  _Cohesion score 0.06058165548098434 - nodes in this community are weakly interconnected._
- **Why does `Nexora: Arquitectura` connect `Stack y decisiones técnicas` to `Seguridad de la marcación`, `Aislamiento multiempresa y migraciones`, `Reglas laborales colombianas`, `Esquema Prisma`, `Rutas y estructura`, `Fases 1-3 y horarios`, `Gestión laboral fase 5`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `Núcleo servidor y datos` be split into smaller, more focused modules?**
  _Cohesion score 0.05305010893246187 - nodes in this community are weakly interconnected._
- **Why does `Estructura del repositorio` connect `Rutas y estructura` to `Datos semilla demo`, `Autenticación y sesiones`, `Seguridad de la marcación`, `Aislamiento multiempresa y migraciones`, `Reglas laborales colombianas`, `Esquema Prisma`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `Acciones de gestión laboral` be split into smaller, more focused modules?**
  _Cohesion score 0.07643467643467644 - nodes in this community are weakly interconnected._