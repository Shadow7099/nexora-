# Manual de instalación (entorno local)

Para desarrollar o probar Nexora en un computador propio. Para publicarla en internet, ver [DESPLIEGUE.md](DESPLIEGUE.md).

## Requisitos

| Programa | Versión | Para qué |
|---|---|---|
| Node.js | 22 o superior | Ejecutar la app |
| PostgreSQL | 16 o 17 | Base de datos |
| Git | cualquiera reciente | Descargar el código |
| Chrome / Chromium | opcional | Pruebas de navegador |

## Pasos

```bash
# 1. Código
git clone https://github.com/Shadow7099/nexora-.git
cd nexora-
npm install            # instala dependencias y genera el cliente de Prisma

# 2. Base de datos local
createdb nexora        # o créela con pgAdmin
cp .env.example .env   # y edite DATABASE_URL con su usuario y clave

# 3. Tablas, garantías y parámetros laborales (migraciones)
npm run db:migrate

# 4. Datos de demostración (opcional): Panadería El Trigal, 4 sedes, 8 empleados,
#    dos semanas de marcaciones simuladas
npm run db:seed

# 5. Ejecutar
npm run dev            # http://localhost:3000
```

### Cuentas de la demo

Contraseña de todas: `Nexora-Demo-2026`

| Rol | Correo |
|---|---|
| Administrador de la empresa | `admin@eltrigal.test` |
| Empleados | `juan@`, `laura@`, `andres@`, `valentina@`, `camila@`, `santiago@`, `diego@`, `paula@eltrigal.test` |
| Superadministrador (Nexora) | `plataforma@nexora.test` |

En el primer ingreso cada cuenta acepta la autorización de datos personales.

### Probar la marcación con QR en local

- En el computador: **Sedes y QR → Imprimir QR**, o abrir `http://localhost:3000/m/<código>`.
- El navegador pedirá permiso de **ubicación**. Para que la marcación sea aceptada, la sede debe tener las coordenadas del lugar donde está (Sedes → Editar → «Usar mi ubicación actual»).
- La huella (passkey) funciona en `localhost`. Desde un celular en la misma red se necesita HTTPS (por ejemplo, desplegar una vista previa en Vercel).

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` y `npm start` | Compilación y servidor de producción |
| `npm run check` | Tipos + lint + pruebas unitarias y de base de datos |
| `npm run test:e2e` | Pruebas de navegador (escritorio y celular) |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Carga la demo |

### Bases de datos de prueba

Las pruebas crean y borran sus propias bases: `nexora_test` (Vitest) y `nexora_e2e_test` (Playwright). El usuario de PostgreSQL necesita permiso `CREATEDB`. Por seguridad, el código se niega a borrar una base cuyo nombre no termine en `_test`.

Para cambiarlas: variables `TEST_DATABASE_URL` y `E2E_DATABASE_URL`. Si Chrome no está en la ruta por defecto: `CHROMIUM_PATH=/ruta/a/chromium`.

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| «El servicio no está disponible en este momento» al ingresar | La app no llega a la base: revise `DATABASE_URL` y que PostgreSQL esté encendido |
| `ECONNREFUSED 127.0.0.1:5432` en las pruebas | PostgreSQL apagado |
| La marcación dice «fuera del área de la sede» | Las coordenadas de la sede no son las de su ubicación actual |
| La huella no se ofrece | El navegador necesita HTTPS (o `localhost`) y un celular o computador con biometría o PIN |
