# Plan de implementación

Cada fase termina con código funcionando, pruebas automáticas pasando y una forma concreta de verificarla. Ninguna fase se da por terminada si su funcionalidad no funciona.

| Fase | Alcance | Criterio de aceptación | Estado |
|---|---|---|---|
| **1. Arquitectura y diseño** | Proyecto, esquema de BD con migración, garantías en la BD, datos demo base, sistema de diseño, navegación, modo claro/oscuro | Migración aplica; pruebas de BD y utilidades; pruebas de navegador (escritorio y celular); build sin errores | ✅ Terminada |
| **2. Autenticación y usuarios** | Inicio de sesión, sesiones en BD, roles verificados en servidor, bloqueo por intentos, cambio de contraseña, autorización de datos, CRUD de empleados, auditoría | Un empleado no ve datos ajenos; un admin de la empresa A no accede a B (pruebas automáticas) | ✅ Terminada |
| **3. Empresas y sedes** | CRUD de sedes con mapa/coordenadas y radio, generación e impresión de QR, rotación de QR, plantillas de turno, patrones semanales y rotativos, festivos colombianos calculados | Se imprime un QR por sede; los turnos nocturnos y partidos se generan bien (pruebas) | ⏳ Siguiente (la resolución de turnos ya está hecha y probada) |
| **4. Asistencia** | Página del QR, vinculación de dispositivo y recuperación, passkeys, geolocalización, entrada/salida, pausas, idempotencia, intentos rechazados, PWA, marcaciones demo | Entrada y salida desde el celular; segunda entrada bloqueada; ubicación fuera de radio rechazada | |
| **5. Gestión laboral** | Detección de horas extra, solicitudes y aprobación, novedades (vacaciones, incapacidades, permisos), corrección de marcaciones con motivo | Rechazar una hora extra no altera el tiempo registrado | |
| **6. Pre-nómina** | Parámetros legales verificados y versionados, clasificación de horas (diurna, nocturna, dominical, festiva), estimación por período con advertencias | Cálculos de casos conocidos coinciden; falta de parámetros produce advertencia, no un número | |
| **7. Dashboard y reportes** | Indicadores, gráficos (asistencia, puntualidad, horas por sede, costo), filtros, exportación Excel/CSV/PDF | Totales del reporte = datos en BD (prueba) | |
| **8. Calidad y despliegue** | Pruebas de extremo a extremo, revisión de seguridad, manuales, despliegue, resumen académico | Checklist de las 10 pruebas obligatorias | |

## Después del software

1. **Piloto de 30 días** en las 4 sedes con los empleados reales.
2. Revisar semanalmente: marcaciones rechazadas, dispositivos re-vinculados, diferencias entre lo programado y lo registrado.
3. Medir: horas administrativas ahorradas en la nómina, errores corregidos, satisfacción del administrador.
4. Solo con resultados positivos: abrir el registro de nuevas empresas y probar los planes comerciales.

## Fase 2: qué quedó hecho

- **Ingreso** con correo y contraseña (Argon2id). Mensaje genérico ante error; el tiempo de respuesta es igual si el correo no existe.
- **Bloqueo** de 15 minutos tras 5 intentos fallidos (queda en auditoría).
- **Sesiones en base de datos** (en la cookie va un token aleatorio; en la BD, solo su hash). Empleados: 60 días renovables en su celular. Administradores: 12 horas. Cookie `httpOnly`, `SameSite=Lax` y, en producción, `__Host-` y `Secure`.
- **Revocación inmediata:** desactivar un empleado, restablecer su clave o suspender la empresa cierra sus sesiones.
- **Primer ingreso:** contraseña temporal → crear contraseña propia → autorización de datos (Ley 1581, texto borrador pendiente de revisión jurídica).
- **Roles verificados en el servidor** en cada página y acción; la capa de datos toma la empresa de la sesión, nunca del navegador.
- **Empleados:** crear (usuario + empleado + contrato), editar, nuevas condiciones de contrato versionadas, desactivar/reactivar, restablecer contraseña. Límite de empleados del plan.
- **Configuración:** tolerancia de llegada, precisión mínima del GPS, exigir celular vinculado; registro de auditoría visible.
- **Resumen del administrador** con datos reales: empleados, sedes, QR y turnos de hoy calculados desde los patrones (nocturnos, partidos, rotativos).
- **Pantalla del empleado** con su nombre, sede y horario real de hoy (el botón de marcar se activa en la fase 4).
- **Panel de plataforma** (superadministrador): empresas con su estado y tamaño, sin datos personales.

Errores encontrados y corregidos durante las pruebas: correo/documento duplicado se reportaba en el campo equivocado; las páginas de dos columnas desbordaban horizontalmente en celular (tapaban el botón "Desactivar"); TRUNCATE podía vaciar las tablas de solo inserción.
