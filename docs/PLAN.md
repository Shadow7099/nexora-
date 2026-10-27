# Plan de implementación

Cada fase termina con código funcionando, pruebas automáticas pasando y una forma concreta de verificarla. Ninguna fase se da por terminada si su funcionalidad no funciona.

| Fase | Alcance | Criterio de aceptación | Estado |
|---|---|---|---|
| **1. Arquitectura y diseño** | Proyecto, esquema de BD con migración, garantías en la BD, datos demo base, sistema de diseño, navegación, modo claro/oscuro | Migración aplica; 25 pruebas de BD y utilidades; 16 pruebas de navegador (escritorio y celular); build sin errores | ✅ Terminada |
| **2. Autenticación y usuarios** | Inicio de sesión, sesiones en BD, roles verificados en servidor, bloqueo por intentos, cambio de contraseña, autorización de datos, CRUD de empleados, auditoría | Un empleado no ve datos ajenos; un admin de la empresa A no accede a B (pruebas automáticas) | ⏳ Siguiente |
| **3. Empresas y sedes** | CRUD de sedes con mapa/coordenadas y radio, generación e impresión de QR, rotación de QR, plantillas de turno, patrones semanales y rotativos, festivos colombianos calculados | Se imprime un QR por sede; los turnos nocturnos y partidos se generan bien (pruebas) | |
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
