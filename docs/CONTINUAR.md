# Nexora: guía para continuar en un chat nuevo

> Pega este archivo (o su enlace) al iniciar el chat nuevo. Resume qué está hecho, cómo está montado, las reglas del proyecto y el plan detallado de las fases que faltan.
> Última actualización: 2 de noviembre de 2026 · fase 7 terminada.

---

## 1. Prompt para el chat nuevo

```
Eres el responsable técnico de Nexora (repositorio Shadow7099/nexora-, rama main).
Lee primero docs/CONTINUAR.md, docs/ARQUITECTURA.md y docs/PLAN.md.
Respeta las reglas de la sección 4 de CONTINUAR.md.
Las fases 1 a 7 están hechas. Antes de la fase 8, construye la pantalla
"Nueva empresa" en Plataforma (crear empresa + primer administrador con
contraseña temporal, suspender/activar) y la recuperación de cuenta; luego
sigue con la fase 8 según la sección 6. Los parámetros de la pre-nómina siguen
pendientes de validación por un contador.
Trabaja por partes, prueba todo (Vitest + Playwright) y no avances con algo que no funcione.
```

---

## 2. Estado actual

| Fase | Estado |
|---|---|
| 1. Arquitectura, BD, diseño | ✅ |
| 2. Ingreso, roles, empleados, configuración | ✅ |
| 3. Sedes, QR (imprimir/rotar), plantillas, horarios, cambios puntuales, festivos | ✅ |
| 4. Marcación QR + ubicación + celular vinculado + passkeys, PWA | ✅ |
| 5. Horas extra (detección/aprobación), novedades, correcciones | ✅ |
| 6. Pre-nómina estimada (parámetros legales versionados, cálculo, detalle por empleado) | ✅ (parámetros sin validar por contador) |
| 7. Dashboard con gráficos y reportes (Excel/CSV/PDF) | ✅ |
| **Pantalla "Nueva empresa" y recuperación de cuenta** | ⏳ Siguiente (necesario para la segunda empresa) |
| **8. Calidad, seguridad, manuales, despliegue final, resumen académico** | ⏳ |

Pruebas al cierre de la fase 7: **156** unitarias/BD (Vitest) y **70** de navegador (Playwright, escritorio y celular). Todas en verde.

Pendiente del usuario: **probar una marcación real con un celular** (aún hay 0 marcaciones reales en producción; ver sección 7).

---

## 3. Infraestructura

| Pieza | Dónde |
|---|---|
| Código | GitHub `Shadow7099/nexora-` (público, rama `main`; cada push despliega a producción) |
| App | Vercel, proyecto `nexora` (equipo `shadow7099s-projects`, id `prj_Zk3JcUky4eZhEXJpOEay0fqu6XsX`) → https://nexora-tau-liard.vercel.app |
| Base de datos | Supabase, organización **APP**, proyecto `sergioobedoyaa@gmail.com` (ref `wyikwhwrzdfmiilkpsqd`), us-east-1, PostgreSQL 17 |
| Variables en Vercel | Solo `DATABASE_URL` (Transaction pooler, puerto 6543). **No definir `APP_URL`** salvo que sea exactamente el dominio final (las passkeys verifican el origen) |
| Protección Vercel | Producción pública; previews protegidas con login de Vercel |

**Cuentas demo** (empresa ficticia Panadería El Trigal, 4 sedes, 8 empleados), contraseña `Nexora-Demo-2026`:
`admin@eltrigal.test` · `juan@`, `laura@`, `andres@`, `valentina@`, `camila@`, `santiago@`, `diego@`, `paula@eltrigal.test` · `plataforma@nexora.test` (superadmin).

**Migraciones aplicadas en Supabase** (también registradas en `_prisma_migrations` con su checksum SHA-256, para que `prisma migrate deploy` las reconozca):
`20261027150316_init`, `20261029000000_lock_data_api`, `20261029010000_fix_function_search_path`, `20261029020000_block_truncate`, `20261101195716_attendance_phase4`, `20261102000000_payroll_phase6` (columna `company.parafiscal_exempt` + 35 parámetros laborales nacionales).
Las fases 3 y 5 no necesitaron migración.

Datos demo en Supabase: dos semanas de marcaciones **simuladas** (`source = SYSTEM`, 18–31 oct 2026). Para que aparezcan sus horas extra: Solicitudes → **Revisar jornadas pasadas**.

**Cómo se aplicaron las migraciones a Supabase:** con el conector de Supabase (`apply_migration`), pegando el SQL exacto del archivo + `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)` con `sha256sum` del archivo. Alternativa: `DATABASE_URL=<Session pooler, puerto 5432> npx prisma migrate deploy`.

---

## 4. Reglas del proyecto (no negociables)

1. **El tiempo real nunca se borra.** `attendance_event` y `audit_log` son de solo inserción (UPDATE, DELETE y TRUNCATE bloqueados por trigger). Las correcciones son eventos nuevos `ADMIN_MANUAL` con autor y motivo.
2. **Multiempresa desde el backend.** Toda función de `src/server/*` recibe el `actor` y toma `companyId` de la sesión (`requireCompanyAdmin`, `requireEmployee`). Claves foráneas compuestas `(id, company_id)`. Un recurso de otra empresa responde **NOT_FOUND**, no "prohibido".
3. **No inventar valores legales.** Todo porcentaje o valor va en `labor_parameter` con vigencia, norma y URL. Si falta, se muestra advertencia y no se calcula.
4. **API pública de Supabase cerrada:** RLS sin políticas y sin permisos para `anon`/`authenticated`. Toda tabla nueva queda cubierta por los `ALTER DEFAULT PRIVILEGES`, pero verifica con `get_advisors`.
5. **No afirmar lo que no se probó.** Cada fase termina con pruebas en verde y capturas revisadas (escritorio y celular, claro y oscuro).
6. **Interfaz en español**, estética sobria (tokens en `globals.css`, componentes en `src/components/ui`).

---

## 5. Guía técnica rápida

**Stack:** Next.js 16.4 (App Router, Turbopack; `cacheComponents: false`), React 19, TypeScript, Tailwind 4, Prisma 7.10 con `@prisma/adapter-pg`, PostgreSQL, Zod 4, SimpleWebAuthn 14, Vitest 5, Playwright 1.64.

```
src/server/      lógica de negocio (cada función verifica rol y empresa)
  sessions.ts      ingreso, sesiones, cambio de clave, autorización de datos
  current.ts       cookie → actor (requireActor), cookie de dispositivo, relying party
  attendance.ts    punch(), vistas del día, historial
  devices.ts / passkeys.ts / sites.ts / schedules.ts / overtime.ts / novelties.ts / corrections.ts
  employees.ts / company.ts / overview.ts / modules.ts / schedule-data.ts / audit.ts
src/lib/         funciones puras probadas: schedule.ts, geo.ts, holidays.ts, utils.ts, validation.ts
src/app/         rutas; actions.ts y gestion-actions.ts = acciones de servidor delgadas
prisma/          schema, migraciones, seed.ts, seed-attendance.ts
tests/unit, tests/db (BD propia nexora_test), tests/e2e (BD propia nexora_e2e_test)
```

**Comandos:** `npm run check` (tipos + lint + Vitest) · `npm run build` · `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.

**Entorno local del contenedor:** PostgreSQL 16 en `/usr/lib/postgresql/16/bin`, datos en `/var/lib/pgdata`, socket `/tmp`. Se apaga cuando el contenedor se recicla:
`su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/pgdata -l /var/lib/pgdata/log -o '-k /tmp' start"`.
Usuario `nexora/nexora` con CREATEDB.

**Trampas conocidas (ya resueltas, no repetir):**
- Next 16: `middleware` se llama `proxy.ts`; los tipos de rutas (`PageProps`, `LayoutProps`) requieren `next typegen` (incluido en `npm run typecheck`).
- Prisma 7 con adaptador: el nombre de la restricción única viene en `e.meta.driverAdapterError.cause.constraint.index`, no en `e.message`.
- El cliente de BD es perezoso (`src/lib/db.ts`): el build no necesita `DATABASE_URL`.
- Grillas de dos columnas: usar `grid-cols-1` + `minmax(0,1fr)` o desbordan en celular.
- Confirmaciones de acciones que hacen desaparecer el elemento (aprobar, rechazar): no usar `revalidatePath` en esa acción, o el mensaje se pierde.
- iPhone: un ícono de pantalla de inicio en modo `standalone` tiene cookies separadas de Safari (donde abre el QR). Por eso el manifiesto usa `display: "browser"`. Si el navegador olvida el celular, el empleado lo recupera con su huella (`relinkWithPasskey`) sin aprobación del admin.
- Playwright en el contenedor: usar `CHROMIUM_PATH=/opt/pw-browsers/chromium`; las pruebas de passkeys usan el autenticador virtual por CDP.
- `seed.ts` no puede importar módulos `server-only` (corre con `tsx`).

---

## 6. Fases que faltan (plan detallado)

### Fase 6 · Pre-nómina estimada ✅ (hecha)

- **Parámetros:** `prisma/labor-parameters.ts` (fuente única) → SQL de la migración con `scripts/labor-parameters-sql.ts`. Cada fila: valor, vigencia, norma y URL. `verified_at` en null hasta que un contador los valide.
  Para cambiar un valor (p. ej. salario mínimo 2027): **Plataforma → Parámetros laborales → Nueva versión** (cierra la anterior el día previo; nada se borra). El admin de empresa los ve en solo lectura en Pre-nómina → Parámetros laborales.
- **Cálculo puro:** `src/lib/payroll.ts` (`estimatePayroll`, `classifyMinutes`, `commercialDays`, `periodFor`). Minuto a minuto según la fecha local: diurno/nocturno, domingo/festivo (con el % vigente ese día), ordinario/extra **aprobada**/no aprobada; descanso no remunerado descontado en proporción. Valor hora = salario ÷ (horas semanales ÷ 6 × 30) — **criterio a validar con el contador**.
- **Servidor:** `src/server/payroll.ts` (`computePayroll`, `payrollOverview`, `getPayrollEstimate`, `listLaborParameters`, `verifyLaborParameter`, `addLaborParameterVersion`). Guarda `payroll_estimate` + líneas con explicación, copia de parámetros y advertencias.
- **Bloqueos (sin números):** parámetro faltante para alguna fecha, sin contrato, salario integral, aprendizaje, prestación de servicios.
- **Advertencias:** parámetros sin validar, jornadas abiertas/por revisar, extras o novedades pendientes, incapacidades/licencias, salario bajo el mínimo, Fondo de Solidaridad (≥ 4 SMMLV, no calculado), tiempo parcial.
- **No incluye:** retención en la fuente, embargos, libranzas, Fondo de Solidaridad, cotización por semanas, valor real de incapacidades. Exoneración art. 114-1 E.T.: casilla en Configuración (`company.parafiscal_exempt`).
- **Pendiente del usuario:** que un contador revise la tabla de parámetros y el criterio del valor hora; luego validar cada fila desde `plataforma@nexora.test`.
- Los sitios .gov.co no eran accesibles desde el contenedor: los valores se contrastaron con varias fuentes secundarias coincidentes. Ver notas en cada parámetro (SMMLV 2026 transitorio por la demanda ante el Consejo de Estado; fecha exacta de la franja nocturna 25 o 26 dic. 2025).

### Fase 7 · Dashboard y reportes ✅ (hecha)

- **Datos:** `src/lib/reports.ts` (puro: asistencia día a día con estados asistió/tarde/ausente/novedad/descanso/por revisar, resúmenes, series semanales, puntualidad mensual, horas por sede, período anterior) y `src/server/reports.ts` (`parseFilters`, `dashboard`, `buildReport` para asistencia, horas-extra, novedades, pre-nomina, intentos).
- **Formato único:** `src/lib/report-table.ts` (columnas tipadas, filas, totales, CSV con `;` y BOM) → `src/server/export.ts` (Excel con `exceljs`, PDF con `jspdf` + `jspdf-autotable`). Pantalla, Excel, CSV y PDF usan la misma tabla: mismos números.
- **Rutas:** `/admin/reportes` (filtros GET desde/hasta/sede/empleado, 8 indicadores con comparación contra el período anterior, 4 gráficos Recharts con tabla accesible), `/admin/reportes/[tipo]` (vista previa), `/admin/reportes/descargar/[tipo]?formato=xlsx|csv|pdf` (verifica sesión y rol; empleado = 403).
- **Resumen** (`/admin`): asistencia real de hoy (en jornada, tarde, ausentes, horas).
- **Prueba obligatoria 7:** `tests/db/reports.test.ts` compara totales con consultas SQL independientes y con el Excel; `tests/e2e/reports.spec.ts` compara el total del Excel descargado con la vista previa.
- Paleta de gráficos validada (daltonismo y contraste) en `globals.css` (`--chart-1`, `--chart-2`, `--chart-grid`).
- `npm audit`: 9 alertas moderadas en dependencias internas de `exceljs` (minimatch, uuid, archiver) en rutas que Nexora no usa con datos del usuario. Revisar en la fase 8.

### Fase 8 · Calidad, despliegue y entrega

- Checklist de las **10 pruebas obligatorias** del enunciado (la mayoría ya automatizadas; documentar dónde está cada una).
- Revisión de seguridad: límite de intentos por IP para el ingreso, cabeceras CSP, revisión de dependencias, `get_advisors` de Supabase, recuperación de cuenta.
- Manuales: instalación, usuario (administrador y empleado, con capturas), documentación técnica.
- Dominio propio y `APP_URL`; reimprimir los QR con el dominio final.
- Política de datos (Ley 1581) revisada por abogado; texto final en `/autorizacion`.
- **Resumen académico** (economía): problema, solución, público objetivo, propuesta de valor, modelo de ingresos (planes de prueba: $59.900 / $99.900 / $149.900 COP, hipótesis sin validar) y viabilidad preliminar.

---

## 7. Antes del piloto de 30 días (depende del usuario)

1. Probar una marcación real: Sedes y QR → Editar sede → "Usar mi ubicación actual" → escanear el QR con el celular → `juan@eltrigal.test` → Vincular → Registrar entrada.
2. Reemplazar los datos demo por los reales (sedes, coordenadas, empleados, horarios, salarios). Ver `docs/PENDIENTES.md`.
3. Validación de un contador para los parámetros de la fase 6 (y el criterio del valor hora) y de un abogado para la política de datos.

---

## 8. Mapa del código (graphify)

El repositorio incluye el grafo de conocimiento en `graphify-out/`:
- `graphify-out/graph.html`: grafo interactivo (abrir en el navegador).
- `graphify-out/GRAPH_REPORT.md`: nodos centrales, comunidades y conexiones.
- Consultas: `graphify query "¿cómo se valida una marcación?"`, `graphify path "punch" "detectOvertime"`, `graphify explain "attendanceDay"`.
- Después de cambiar código: `graphify update .`.
