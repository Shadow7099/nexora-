# Nexora

**Control inteligente. Empresas eficientes.**

Asistencia con QR por sede, horarios, horas extra con aprobación y pre-nómina estimada para pymes colombianas.

> Estado: **Fase 2 de 8 terminada** (ingreso, roles, empleados y configuración). Ver [docs/PLAN.md](docs/PLAN.md).

## Documentación

- [Arquitectura, modelo de datos y seguridad](docs/ARQUITECTURA.md)
- [Plan de implementación por fases](docs/PLAN.md)
- [Información pendiente de la empresa real](docs/PENDIENTES.md)
- [Despliegue: Supabase y Vercel](docs/DESPLIEGUE.md)

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 o superior

## Instalación local

```bash
git clone https://github.com/Shadow7099/nexora-.git nexora
cd nexora
npm install                      # también genera el cliente de Prisma
cp .env.example .env             # y complete DATABASE_URL y SESSION_SECRET
npm run db:migrate               # crea las tablas
npm run db:seed                  # empresa demo: 4 sedes, 8 empleados
npm run dev                      # http://localhost:3000
```

Si no tiene PostgreSQL instalado, puede usar Docker:

```bash
docker run -d --name nexora-db -e POSTGRES_USER=nexora -e POSTGRES_PASSWORD=nexora -e POSTGRES_DB=nexora -p 5432:5432 postgres:16
```

## Datos de demostración

Empresa ficticia **Panadería El Trigal** con sedes en Villavicencio Centro, Villavicencio Primavera, Acacías y Restrepo, y 8 empleados con horarios diurnos, de madrugada, partido, rotativo y nocturno. Contraseña de todas las cuentas demo: `Nexora-Demo-2026`.

| Rol | Correo |
|---|---|
| Administrador de la empresa | `admin@eltrigal.test` |
| Empleado | `juan@eltrigal.test` (y `laura@`, `andres@`, `valentina@`, `camila@`, `santiago@`, `diego@`, `paula@`) |
| Superadministrador | `plataforma@nexora.test` |

Ingrese en `/ingresar`. En el primer ingreso cada usuario acepta la autorización de datos.

## Pruebas

```bash
npm run check        # tipos + lint + pruebas unitarias y de base de datos (Vitest)
npm run build
npm run test:e2e     # pruebas en navegador, escritorio y celular (Playwright)
```

Las pruebas **nunca usan la base de datos de trabajo**: crean y borran sus propias bases (`nexora_test` y `nexora_e2e_test`; el nombre debe terminar en `_test`). El usuario de PostgreSQL necesita permiso `CREATEDB`. Se pueden cambiar con `TEST_DATABASE_URL` y `E2E_DATABASE_URL`.

Para usar un Chromium ya instalado: `CHROMIUM_PATH=/ruta/a/chromium npm run test:e2e`.

## Rutas

| Ruta | Quién | Qué |
|---|---|---|
| `/ingresar` | todos | inicio de sesión |
| `/admin` | administrador | resumen, empleados, configuración |
| `/app` | empleado | saludo, sede y horario de hoy |
| `/plataforma` | superadministrador | empresas registradas |
| `/sistema` | público | sistema de diseño |

## Estructura

```
prisma/
  schema.prisma          modelo de datos
  migrations/            migraciones SQL (incluye triggers y restricciones)
  seed.ts                datos demo
src/
  app/                   rutas (App Router)
  components/ui/         componentes base (botón, tarjeta, insignia, campo…)
  components/layout/     estructura del panel admin y de la app del empleado
  components/employee/   pantalla de marcación
  lib/                   BD, contraseñas, validación, turnos, formato de fechas y moneda
  server/                lógica de negocio con autorización (sesiones, empleados, empresa)
  proxy.ts               redirección optimista a /ingresar sin cookie
tests/
  unit/  db/  e2e/
docs/
```
