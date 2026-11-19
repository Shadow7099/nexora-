# Revisión de seguridad (fase 8)

Fecha: 2 de noviembre de 2026.

## Controles implementados

| Área | Control | Dónde |
|---|---|---|
| Contraseñas | Argon2id; mínimo 10 caracteres con letras; tiempo de respuesta igual si el correo no existe | `src/lib/password.ts`, `src/server/sessions.ts` |
| Fuerza bruta | Bloqueo de la cuenta 15 min tras 5 fallos; **además**, una red (IP) con 30 fallos en 15 min queda en espera, sumando todas las cuentas. Solo se guarda el hash de la IP | `authenticate()`, tabla `login_throttle` |
| Sesiones | Token aleatorio en cookie `httpOnly`, `SameSite=Lax`, `Secure` y prefijo `__Host-`; en la BD solo el hash. Empleados 60 días, administradores 12 h. Cerrar sesión, desactivar, restablecer clave o suspender la empresa la invalidan al instante | `src/server/sessions.ts`, `current.ts` |
| Autorización | Rol y empresa verificados en el servidor en cada página, acción y descarga; la empresa sale de la sesión, nunca del navegador. Un recurso ajeno responde «no existe» | `src/server/authz.ts` y cada módulo |
| Multiempresa en la BD | Claves foráneas compuestas `(id, company_id)`: la base rechaza mezclar empresas aunque el código fallara | migración `init` |
| Integridad | Marcaciones y auditoría de solo inserción (UPDATE, DELETE y TRUNCATE bloqueados por trigger); una sola jornada abierta por empleado; aprobado ≤ detectado | migraciones |
| Marcación | QR rotables, celular vinculado (cookie `httpOnly` con hash en BD), huella o Face ID obligatoria en cada marcación (passkey WebAuthn; excepción por celular autorizada y auditada por el administrador; cada ventana del mismo celular —Safari, ícono, cámara— se reconoce con la passkey sin anular las demás), ubicación con radio e incertidumbre del GPS, hora del servidor, clave de idempotencia, intentos rechazados registrados | `src/server/attendance.ts` |
| Activación sin contraseña | El empleado no tiene contraseña: al crearlo se genera un código de 8 caracteres (≈ 8,5 × 10¹¹ combinaciones), de un solo uso, que vence en 7 días; en la base solo su hash. Activar exige cédula + código; 30 intentos fallidos por red en 15 min la ponen en espera. Activar retira los celulares anteriores y cierra sus sesiones (un celular nuevo reemplaza al viejo sin aprobación). Después entra solo con Face ID o huella (passkey descubrible, verificación de usuario obligatoria, desafío de un solo uso en cookie `httpOnly` de 5 min); la passkey debe pertenecer a un celular activo | `src/server/activation.ts`, `/activar`, `/ingresar` |
| Marcar sin escanear | Después del primer ingreso por QR, el empleado marca desde Inicio: se usa la sede activa más cercana y su QR vigente, con las mismas validaciones (celular vinculado, huella o Face ID, radio y precisión del GPS, hora del servidor). Una marcación a la vez por empleado (bloqueo en la transacción): dos toques simultáneos no crean entrada y salida | `punchFromApp()`, `punch()` |
| API pública de Supabase | RLS en todas las tablas sin políticas y sin permisos para `anon`/`authenticated` (verificado: tabla nueva `login_throttle` incluida) | `lock_data_api` |
| Cabeceras HTTP | `Content-Security-Policy` (solo el propio origen, sin iframes, plugins ni formularios a otros sitios), `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy` (ubicación y cámara solo en el propio origen); sin `X-Powered-By` | `next.config.ts` |
| Registro abierto | Desde la página de inicio: campo trampa para robots, máximo 3 empresas por red al día (hash de la IP en la auditoría), correo único; la empresa queda en prueba y el superadministrador puede suspenderla | `registerOpen()` |
| Asistente de la página de inicio | Responde desde una base de conocimiento fija; no lee la base de datos ni datos de empresas. Máx. 500 caracteres por mensaje, 12 turnos y 20 mensajes por red cada 10 min (hash de la IP, en memoria). Con `ANTHROPIC_API_KEY` usa Claude limitado a esa base; si falla, vuelve a las respuestas fijas | `src/server/chat.ts` |
| Cierre de nómina | Borrador → Revisada → Cerrada con cambio condicional al estado actual (dos clics no lo aplican dos veces); cerrar exige confirmación; un período revisado o cerrado no se recalcula; cada paso queda en la auditoría con totales. Comprobantes en PDF solo para el administrador de la empresa | `setPayrollStatus()`, `/admin/pre-nomina/comprobantes` |
| Inventario | Movimientos de stock de solo inserción (UPDATE, DELETE y TRUNCATE bloqueados por trigger); stock = suma de movimientos; sin stock negativo, ni con salidas simultáneas (bloqueo por producto en la transacción); productos y sedes ligados a la empresa con claves foráneas compuestas | `src/server/inventory.ts`, migración `inventory` |
| Caja | Movimientos y cierres que no se borran: la base solo permite llenar una vez los datos de anulación (movimiento) o de reapertura (cierre), con motivo. Un cierre vigente por sede y día (índice único); registrar, anular y cerrar se ordenan con un bloqueo por sede y día; un día cerrado no admite cambios | `src/server/cash.ts`, migración `cash` |
| Ventas | Número consecutivo por empresa sin repetidos ni huecos (bloqueo por empresa + índice único); venta, renglones, stock y caja en una sola transacción; no se vende más de lo que hay; la venta guarda copia del cliente y los productos; ventas y renglones no se borran ni editan (triggers): solo se anulan una vez con motivo, devolviendo stock y anulando el ingreso | `src/server/sales.ts`, migración `sales` |
| CRM y avisos externos | Cada empresa recibe leads en su propia URL con un token aleatorio de 24 bytes; los avisos de Meta y WhatsApp se aceptan solo con firma HMAC-SHA256 válida de la app de la empresa; el lead de Meta se trae de su API con el token de la página (en cabecera); cuerpo máximo 256 KB; cada aviso se registra una sola vez (índice único por id externo); autorización comercial con fecha y origen | `src/server/crm.ts`, `src/server/crm-webhooks.ts` |
| Mensajes e IA | Avisos de Meta solo con firma válida; cada mensaje se guarda una vez (id externo único); respuestas por la API oficial con el token de la empresa (en cabecera) y solo dentro de la ventana de 24 h; la IA usa la llave de Claude de la empresa, corre después de responder el aviso, solo con datos de esa empresa, con reglas fijas que no se dejan cambiar desde los mensajes del cliente; nunca envía sola reclamos, pagos ni chats en pausa | `src/server/messages.ts`, `src/server/crm-ai.ts`, `src/server/wa-templates.ts` |
| Integraciones | Tokens y llaves de cada empresa (Meta, TikTok, WhatsApp, Siigo/Alegra, Resend, Claude) cifrados con AES-256-GCM; la clave (`NEXORA_SECRETS_KEY`) solo vive en Vercel, nunca en la base. Cada valor queda atado a su empresa y proveedor (no se puede copiar a otra). Nunca vuelven al navegador, a la auditoría ni a los registros; las pruebas de conexión envían el token en la cabecera, no en la URL. Solo el administrador de la empresa (o el superadministrador para la plataforma) los guarda | `src/lib/secrets.ts`, `src/server/integrations.ts` |
| Redirecciones | Solo destinos internos tras ingresar (sin redirecciones abiertas) | `safeNext()` |
| Datos personales | Autorización explícita (Ley 1581) antes de usar la app; ubicación solo en el momento de marcar; el superadministrador no ve datos de empleados | `/autorizacion`, `platform.ts` |
| Auditoría | Ingresos, cambios de configuración, decisiones, correcciones, cálculos, revisión y cierre de pre-nómina, altas y suspensiones de empresas | `audit_log` |

## Límites conocidos y decisiones

- **CSP con `'unsafe-inline'` en scripts:** Next.js y el selector de tema arrancan con scripts en línea. Aun así no se permite ningún script externo. Mejora futura: CSP con *nonce* (obliga a renderizar todo dinámicamente).
- **Recuperación de contraseña sin correo automático:** los empleados la recuperan con su administrador y los administradores con el soporte de Nexora (Plataforma → empresa → Restablecer contraseña). Un enlace por correo requiere un proveedor de envío (p. ej. Resend, Amazon SES) con su llave y un dominio verificado. **Se necesita:** elegir el proveedor y crear la cuenta.
- **`'unsafe-inline'` en estilos:** necesario para los gráficos (Recharts) y las animaciones.

## Dependencias (`npm audit`, 2 nov. 2026)

**0 críticas, 0 altas, 24 moderadas.** Todas vienen de dos paquetes:

| Paquete | Aviso | Por qué no afecta a Nexora |
|---|---|---|
| `minimatch` < 11.0.1 | Denegación de servicio con patrones de búsqueda de archivos manipulados ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)) | En producción solo lo usa `exceljs → archiver` para empaquetar el Excel; nunca recibe patrones escritos por usuarios. El resto es de ESLint (solo desarrollo) |
| `uuid` < 11.1.1 | Falta de control de límites en v3/v5/v6 cuando se pasa un búfer ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)) | `exceljs` usa `uuid.v4()` sin búfer |

Forzar las versiones corregidas rompe a quienes las usan (cambian de API). Revisar cuando `exceljs` y ESLint publiquen versiones que las actualicen.

## Asesores de Supabase

- **Seguridad:** solo «RLS enabled, no policy» (intencional).
- **Rendimiento:** avisos informativos de claves foráneas sin índice propio e índices aún sin uso. Con 8 empleados no tienen efecto; revisar si la base crece a miles de empleados.

## Pendiente fuera del código

1. Texto de autorización de datos y política de tratamiento revisados por un abogado (Ley 1581 de 2012).
2. Dominio propio con HTTPS antes de imprimir los QR definitivos.
3. Respaldos: plan Pro de Supabase o `pg_dump` programado antes del piloto.
