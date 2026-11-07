# Nexora

**Control inteligente. Empresas eficientes.**

Asistencia con QR por sede, horarios, horas extra con aprobación y pre-nómina estimada para pymes colombianas.

> Estado: **las 8 fases están terminadas** y la app está en producción: https://nexora-tau-liard.vercel.app. Antes del piloto con empleados reales faltan pasos externos (celular físico, contador, abogado, dominio): ver [docs/PENDIENTES.md](docs/PENDIENTES.md).

## Documentación

| Entregable | Documento |
|---|---|
| Manual de instalación | [docs/MANUAL_INSTALACION.md](docs/MANUAL_INSTALACION.md) |
| Manual de usuario (empleado, administrador, plataforma) | [docs/MANUAL_USUARIO.md](docs/MANUAL_USUARIO.md) |
| Documentación técnica | [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) |
| Pruebas y resultados (checklist de las 10 pruebas obligatorias) | [docs/PRUEBAS.md](docs/PRUEBAS.md) |
| Instrucciones de despliegue | [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) |
| Revisión de seguridad | [docs/SEGURIDAD.md](docs/SEGURIDAD.md) |
| Resumen académico (economía) | [docs/RESUMEN_ACADEMICO.md](docs/RESUMEN_ACADEMICO.md) |
| Plan por fases | [docs/PLAN.md](docs/PLAN.md) |
| Lo que falta de la empresa real | [docs/PENDIENTES.md](docs/PENDIENTES.md) |
| Cuestionario para el empresario + plantilla de Excel | [docs/CUESTIONARIO_EMPRESA.md](docs/CUESTIONARIO_EMPRESA.md) · [docs/plantilla-datos-empresa.xlsx](docs/plantilla-datos-empresa.xlsx) |
| Guía para continuar en otro chat | [docs/CONTINUAR.md](docs/CONTINUAR.md) |

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 o superior

## Instalación local

```bash
git clone https://github.com/Shadow7099/nexora-.git nexora
cd nexora
npm install                      # también genera el cliente de Prisma
cp .env.example .env             # y complete DATABASE_URL
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
| `/admin` | administrador | resumen, asistencia, empleados, sedes y QR, horarios, solicitudes, pre-nómina, reportes, configuración |
| `/app` | empleado | inicio, historial, solicitudes |
| `/m/<código>` | empleado | página que abre el QR de la sede: marcar entrada o salida |
| `/plataforma` | superadministrador | empresas (alta, suspensión, recuperación del administrador) y parámetros laborales |
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
  server/                lógica de negocio con autorización (sesiones, asistencia, pre-nómina, reportes, plataforma…)
  proxy.ts               redirección optimista a /ingresar sin cookie
tests/
  unit/  db/  e2e/
docs/
```
