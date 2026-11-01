# Nexora: guía para continuar en un chat nuevo

> Pega este archivo (o su enlace) al iniciar el chat nuevo. Resume qué está hecho, cómo está montado, las reglas del proyecto y el plan detallado de las fases que faltan.
> Última actualización: 1 de noviembre de 2026 · commit `f38c407` en `main`.

---

## 1. Prompt para el chat nuevo

```
Eres el responsable técnico de Nexora (repositorio Shadow7099/nexora-, rama main).
Lee primero docs/CONTINUAR.md, docs/ARQUITECTURA.md y docs/PLAN.md.
Respeta las reglas de la sección 4 de CONTINUAR.md.
Sigue con la fase 6 (pre-nómina) según la sección 6: empieza investigando y
citando los parámetros legales vigentes, cárgalos versionados y muéstrame la
tabla de parámetros para que un contador la valide antes de calcular.
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
| **6. Pre-nómina estimada** | ⏳ Siguiente |
| **7. Dashboard con gráficos y reportes (Excel/CSV/PDF)** | ⏳ |
| **8. Calidad, seguridad, manuales, despliegue final, resumen académico** | ⏳ |

Pruebas al cierre de la fase 5: **116** unitarias/BD (Vitest) y **58** de navegador (Playwright, escritorio y celular). Todas en verde.

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
`20261027150316_init`, `20261029000000_lock_data_api`, `20261029010000_fix_function_search_path`, `20261029020000_block_truncate`, `20261101195716_attendance_phase4`.
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
- Playwright en el contenedor: usar `CHROMIUM_PATH=/opt/pw-browsers/chromium`; las pruebas de passkeys usan el autenticador virtual por CDP.
- `seed.ts` no puede importar módulos `server-only` (corre con `tsx`).

---

## 6. Fases que faltan (plan detallado)

### Fase 6 · Pre-nómina estimada

**Objetivo:** estimar, por período (quincena o mes) y empleado, devengados, deducciones y costo del empleador, con advertencias. Nunca presentarlo como liquidación legal.

**Paso 1: parámetros legales (antes de escribir cálculo).** Investigar en fuente primaria (Diario Oficial, Función Pública, MinTrabajo) y cargar en `labor_parameter` con `valid_from/valid_to`, `legal_source`, `source_url`, `verified_at`:

| Clave sugerida | Qué es | Pista a verificar (no usar sin confirmar) |
|---|---|---|
| `SMMLV` | Salario mínimo mensual | 2026: $1.750.905 (Decreto 1469 de 2025, suspendido; reexpedido Decreto 0159 de 2026) |
| `AUX_TRANSPORTE` | Auxilio de transporte | 2026: $249.095 (Decreto 1470 de 2025) |
| `AUX_TRANSPORTE_TOPE_SMMLV` | Hasta cuántos SMMLV aplica | 2 SMMLV |
| `JORNADA_MAX_SEMANAL` | Horas semanales máximas | 42 h desde julio de 2026 (Ley 2466 de 2025; fecha exacta 15 o 16 de julio, verificar) |
| `NOCTURNA_INICIO` / `NOCTURNA_FIN` | Franja nocturna | 7:00 p. m. – 6:00 a. m. (Ley 2466 de 2025) |
| `RECARGO_NOCTURNO` | Recargo nocturno | Verificar % |
| `HE_DIURNA`, `HE_NOCTURNA` | Horas extra | Verificar % |
| `RECARGO_DOMINICAL_FESTIVO` | Dominical/festivo | Escalonado por Ley 2466: 80 % → 90 % (1 jul 2026) → 100 % (1 jul 2027); verificar |
| `HE_DOMINICAL_DIURNA/NOCTURNA` | Extra en dominical/festivo | Verificar regla de acumulación |
| `SALUD_EMPLEADO`, `PENSION_EMPLEADO` | Deducciones del trabajador | Verificar % |
| `SALUD_EMPLEADOR`, `PENSION_EMPLEADOR`, `ARL_CLASE_I..V`, `CAJA`, `ICBF`, `SENA` | Aportes del empleador | Verificar % y exoneraciones (art. 114-1 E.T.) |
| `CESANTIAS`, `INT_CESANTIAS`, `PRIMA`, `VACACIONES` | Provisiones | Verificar % |

Mostrar la tabla en una pantalla de **Parámetros laborales** (solo lectura para el admin de empresa; edición por superadmin) para que **un contador la valide** antes de usarla.

**Paso 2: clasificación de minutos (función pura en `src/lib/payroll.ts`, con pruebas):**
- Cortar cada jornada en tramos diurno/nocturno según la franja vigente en esa fecha.
- Marcar domingo/festivo con `holidayOn()`.
- Separar ordinarias de extra usando **solo `approved_minutes`** de `overtime_request` (las rechazadas no se pagan como extra, pero el tiempo sigue registrado).
- Descontar descansos no pagados; aplicar novedades (vacaciones, incapacidad, licencias) según su tipo.

**Paso 3: estimación** en `payroll_period` + `payroll_estimate` + `payroll_estimate_line` (las tablas ya existen), guardando `parameter_snapshot` y `warnings`. Advertencias, como mínimo: parámetro faltante para alguna fecha, salario bajo el SMMLV, contrato sin datos, jornadas por revisar, horas extra pendientes de decisión, incapacidades (quién paga qué días requiere revisión).

**Pruebas obligatorias:** casos calculados a mano y validados (jornada diurna, nocturna que cruza medianoche, domingo, festivo, horas extra aprobadas parcialmente, auxilio con tope); falta de parámetro ⇒ advertencia y sin número; aislamiento entre empresas.

### Fase 7 · Dashboard y reportes

- **Indicadores** del resumen con datos reales: presentes, ausentes, tardanzas, horas, horas extra, costo estimado (de la fase 6), sedes activas.
- **Gráficos** (Recharts): asistencia semanal, puntualidad mensual, horas por sede, comparación entre períodos, evolución del costo estimado. Accesibles y en modo claro/oscuro.
- **Filtros** por fechas, sedes y empleados.
- **Exportación** Excel (p. ej. `exceljs`), CSV y PDF (p. ej. `@react-pdf/renderer` o impresión HTML): asistencia, horas extra (registrado / autorizado / tratamiento), novedades, pre-nómina, intentos rechazados. Cada reporte con empresa, período y fecha de generación.
- **Prueba obligatoria 7:** los totales del reporte coinciden con la BD.

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
3. Validación de un contador para la fase 6 y de un abogado para la política de datos.

---

## 8. Mapa del código (graphify)

El repositorio incluye el grafo de conocimiento en `graphify-out/`:
- `graphify-out/graph.html`: grafo interactivo (abrir en el navegador).
- `graphify-out/GRAPH_REPORT.md`: nodos centrales, comunidades y conexiones.
- Consultas: `graphify query "¿cómo se valida una marcación?"`, `graphify path "punch" "detectOvertime"`, `graphify explain "attendanceDay"`.
- Después de cambiar código: `graphify update .`.
