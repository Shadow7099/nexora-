# Despliegue

## Base de datos (Supabase)

| Dato | Valor |
|---|---|
| Organización | APP |
| Proyecto | `sergioobedoyaa@gmail.com` (ref `wyikwhwrzdfmiilkpsqd`) |
| Región | us-east-1 (la misma que usa Vercel por defecto) |
| PostgreSQL | 17 |

### Estado (29-oct-2026)

- Migraciones aplicadas: `20261027150316_init`, `20261029000000_lock_data_api`, `20261029010000_fix_function_search_path`, `20261029020000_block_truncate`. Quedan registradas en `_prisma_migrations`, así que `prisma migrate deploy` las reconoce y solo aplicará las nuevas.
- Datos demo cargados: 1 empresa, 4 sedes, 8 empleados, 10 usuarios, 8 contratos, 6 plantillas de turno, 4 QR.
- Garantías verificadas directamente en Supabase (prueba que se revierte sola): cruce entre empresas bloqueado, marcaciones y auditoría no editables, borrables ni truncables, doble entrada bloqueada, extras aprobadas ≤ detectadas, marcación manual exige motivo.
- **API pública cerrada:** RLS activo en las 27 tablas sin políticas y sin permisos para `anon`/`authenticated`. Verificado: con la llave pública no se puede leer ni escribir nada. Nexora no usa la API REST de Supabase ni su llave `anon`; se conecta directo a PostgreSQL desde el servidor.
- Asesor de seguridad de Supabase: sin advertencias. Queda el aviso informativo "RLS sin políticas", que es intencional.

### Variables de entorno en Vercel

En Supabase → **Connect** (botón superior) → **ORMs / Connection string**:

| Variable | Valor | Para qué |
|---|---|---|
| `DATABASE_URL` | Cadena del **Transaction pooler** (puerto **6543**), reemplazando `[YOUR-PASSWORD]` | La app en funciones serverless |
| `SESSION_SECRET` | 64 caracteres aleatorios (`openssl rand -hex 32`) | Firmas de sesión y QR (fase 2) |
| `APP_URL` | La URL final, por ejemplo `https://nexora.vercel.app` | Enlaces de los QR y passkeys |

La contraseña de la base **nunca** se escribe en el código, en GitHub ni en el chat: solo en Vercel → Settings → Environment Variables.

### Migraciones futuras

```bash
# Usar la cadena del "Session pooler" (puerto 5432); el transaction pooler no sirve para migrar.
DATABASE_URL="postgresql://postgres.wyikwhwrzdfmiilkpsqd:<clave>@aws-...pooler.supabase.com:5432/postgres" npx prisma migrate deploy
```

### Volver a cargar la demo desde cero

La demo se cargó con `prisma/seed.ts` (contraseñas Argon2id). Para regenerarla en otra base: `npm run db:seed` con `DATABASE_URL` apuntando a esa base.
