# Instrucciones de despliegue

Producción actual: **Vercel** (app) + **Supabase** (PostgreSQL). Cada push a `main` en GitHub despliega solo.

| Pieza | Dónde |
|---|---|
| Código | GitHub `Shadow7099/nexora-`, rama `main` |
| App | Vercel, proyecto `nexora` (equipo `shadow7099s-projects`) → https://nexora-tau-liard.vercel.app |
| Base de datos | Supabase, organización **APP**, proyecto ref `wyikwhwrzdfmiilkpsqd`, us-east-1, PostgreSQL 17 |

## 1. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Obligatoria | Valor |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena del **Transaction pooler** de Supabase (puerto **6543**). Supabase → botón **Connect** → ORMs |
| `APP_URL` | Solo con dominio propio | El dominio definitivo, p. ej. `https://asistencia.miempresa.com` |

- La contraseña de la base **nunca** va en el código, en GitHub ni en un chat: solo en Vercel.
- **No defina `APP_URL` antes de tener el dominio final.** Las passkeys (huella) verifican el origen exacto y los QR impresos llevan esa dirección. Sin `APP_URL`, Nexora usa el dominio desde el que se abre.
- Nexora no necesita la llave `anon` ni la API REST de Supabase: se conecta directo a PostgreSQL desde el servidor.

## 2. Migraciones

Aplicadas en producción (y registradas en `_prisma_migrations` con su checksum, para que `prisma migrate deploy` las reconozca):

| Migración | Contenido |
|---|---|
| `20261027150316_init` | Esquema completo, garantías (FK compuestas, solo inserción, una jornada abierta) |
| `20261029000000_lock_data_api` | RLS sin políticas, sin permisos para `anon`/`authenticated` |
| `20261029010000_fix_function_search_path` | `search_path` fijo en funciones (advertencia de Supabase) |
| `20261029020000_block_truncate` | Bloquea `TRUNCATE` en marcaciones y auditoría |
| `20261101195716_attendance_phase4` | Desafío WebAuthn en la sesión; jornada "por revisar" sin salida |
| `20261102000000_payroll_phase6` | Exoneración 114-1 y 35 parámetros laborales nacionales |
| `20261103000000_login_throttle` | Intentos de ingreso fallidos por red (hash de la IP) |

**Para aplicar una migración nueva**, cualquiera de las dos:

```bash
# A) Desde un computador, con la cadena del "Session pooler" (puerto 5432; el de 6543 no sirve para migrar)
DATABASE_URL="postgresql://postgres.wyikwhwrzdfmiilkpsqd:<clave>@aws-...pooler.supabase.com:5432/postgres" npx prisma migrate deploy
```

B) Con el conector de Supabase (como se hizo en este proyecto): pegar el SQL del archivo y luego
`INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (gen_random_uuid()::text, '<sha256 del archivo>', now(), '<nombre>', 1);`
(`sha256sum prisma/migrations/<nombre>/migration.sql`).

**Orden:** aplique la migración **antes** de subir el código que la usa.

Después de cada migración, revise Supabase → Advisors → Security. El único aviso esperado es «RLS enabled, no policy» (intencional: cierra la API pública).

## 3. Primer despliegue en otra cuenta (desde cero)

1. Cree el proyecto en Supabase (región cercana a la de Vercel) y copie las cadenas de conexión.
2. Aplique las migraciones (opción A con la base vacía).
3. En Vercel: **Add New → Project →** importe el repositorio de GitHub; framework Next.js (detectado solo). Agregue `DATABASE_URL`. Deploy.
4. Cree el superadministrador: `npm run db:seed` carga la demo completa (incluye `plataforma@nexora.test`). Para producción real sin demo, cree solo ese usuario y cámbiele la contraseña en el primer ingreso.
5. Ingrese como superadministrador → **Nueva empresa** → entregue la contraseña temporal al administrador de la empresa.

## 4. Dominio propio (antes de imprimir los QR definitivos)

1. Vercel → proyecto → **Settings → Domains → Add** (p. ej. `asistencia.miempresa.com`) y cree el registro DNS que indique Vercel.
2. Cuando el dominio funcione con HTTPS: defina `APP_URL` con ese dominio y vuelva a desplegar.
3. **Reimprima todos los QR** (Sedes y QR → Imprimir QR): los anteriores apuntan al dominio viejo.
4. Los empleados vuelven a vincular el celular y activar la huella en el dominio nuevo (las passkeys pertenecen a un dominio).

## 5. Volver a una versión anterior

Vercel → Deployments → el despliegue anterior → **Promote to Production**. Las migraciones no se revierten solas: las de Nexora solo agregan, así que una versión anterior del código funciona con la base nueva.

## 6. Respaldos

Supabase hace respaldos diarios en los planes pagos (el gratuito no garantiza recuperación). Antes del piloto con datos reales, pase al plan Pro o programe un `pg_dump` periódico con la cadena de conexión directa.
