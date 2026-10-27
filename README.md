# Nexora

**Control inteligente. Empresas eficientes.**

Asistencia con QR por sede, horarios, horas extra con aprobación y pre-nómina estimada para pymes colombianas.

> Estado: **Fase 1 de 8 terminada** (arquitectura, base de datos y sistema de diseño). Ver [docs/PLAN.md](docs/PLAN.md).

## Documentación

- [Arquitectura, modelo de datos y seguridad](docs/ARQUITECTURA.md)
- [Plan de implementación por fases](docs/PLAN.md)
- [Información pendiente de la empresa real](docs/PENDIENTES.md)

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

El inicio de sesión se habilita en la fase 2.

## Verificar la fase 1

```bash
npm run check        # tipos + lint + 25 pruebas (utilidades y garantías de la BD)
npm run build
npm run test:e2e     # 16 pruebas en navegador (escritorio y celular)
```

Para usar un Chromium ya instalado: `CHROMIUM_PATH=/ruta/a/chromium npm run test:e2e`.

Páginas disponibles:
- `/`: presentación
- `/sistema`: sistema de diseño
- `/sistema/admin` y `/sistema/empleado`: vistas previas del diseño (datos de ejemplo, sin BD)

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
  lib/                   BD, contraseñas, formato de fechas y moneda
tests/
  unit/  db/  e2e/
docs/
```
