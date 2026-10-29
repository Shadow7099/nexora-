# Nexora: Arquitectura

> Control inteligente. Empresas eficientes.

Plataforma SaaS de asistencia con QR por sede, horarios, horas extra con aprobación y pre-nómina **estimada** para pymes colombianas. Primera versión: 1 empresa, 4 sedes, 8 empleados. La arquitectura ya es multiempresa.

---

## 1. Decisiones principales

| Tema | Decisión | Por qué |
|---|---|---|
| Forma | **Monolito modular** en Next.js (App Router), sin microservicios | Un equipo pequeño, un despliegue, una base de datos. Los módulos (asistencia, horarios, nómina) se separan por carpetas, no por servicios. |
| Lenguaje | TypeScript estricto | Errores en compilación y no en producción. |
| Framework | Next.js 16 + React 19 | Server Components y Server Actions: la lógica sensible corre en el servidor, sin API pública que proteger por separado. |
| Caché | `cacheComponents` **desactivado** | Casi todo depende del usuario y la empresa. El renderizado dinámico es más simple y elimina el riesgo de servir en caché datos de otra empresa. |
| Base de datos | PostgreSQL 16 | Restricciones, índices parciales y triggers: las reglas críticas las garantiza la base, no solo el código. |
| ORM | Prisma 7 (adaptador `pg`) | Tipos generados, migraciones versionadas. Se usa la línea estable 7.x (la 8 sigue en *release candidate*). |
| Autenticación | **Sesiones propias en BD** + contraseña Argon2id + **passkeys (WebAuthn)** con SimpleWebAuthn | Auth.js v5 sigue en beta y no cubre la vinculación de dispositivo. Una sesión en BD se puede revocar al instante (empleado retirado, celular perdido). |
| Estilos | Tailwind CSS 4 + componentes propios al estilo shadcn/ui | Tokens de diseño en variables CSS: modo claro y oscuro sin duplicar componentes. |
| Validación | Zod 4 en cada Server Action | Nunca se confía en lo que manda el navegador. |
| Gráficos | Recharts (fase 7) | |
| Iconos | Lucide | Un solo set, trazo consistente. |
| Móvil | Web responsive + PWA (fase 4) | Los empleados no instalan nada desde una tienda: escanean el QR y listo. |
| Pruebas | Vitest (unitarias y de BD) + Playwright (navegador, escritorio y celular) | |

**Despliegue recomendado:** cualquier plataforma con Node 22 y PostgreSQL gestionado (por ejemplo Vercel + Neon/Supabase, o Railway, o un VPS con Docker). La aplicación no depende de servicios propietarios de un proveedor.

## 2. Vista general

```
 Celular del empleado            Computador del administrador
 (cámara → URL del QR)            (panel, reportes)
          │                                │
          ▼                                ▼
 ┌──────────────────────── Next.js (Node) ────────────────────────┐
 │  proxy.ts  → cabeceras, redirección optimista si no hay sesión  │
 │  Server Components (lectura)   Server Actions (escritura)       │
 │                │                         │                      │
 │                ▼                         ▼                      │
 │        Capa de acceso a datos (DAL): resuelve sesión → usuario │
 │        → empresa, y SOLO consulta con ese company_id           │
 │                │                                                │
 │   Módulos: auth · sedes/QR · asistencia · horarios · extras ·   │
 │            novedades · pre-nómina · reportes · auditoría        │
 └────────────────┬───────────────────────────────────────────────┘
                  ▼
        PostgreSQL (restricciones, triggers, índices parciales)
```

**Regla de oro de autorización:** cada Server Action y cada lectura vuelve a verificar la sesión y el rol en el servidor. Ocultar un botón no es seguridad.

## 3. Multiempresa (aislamiento de datos)

Tres capas, de afuera hacia adentro:

1. **DAL:** ninguna consulta recibe `companyId` desde el navegador; se toma de la sesión.
2. **Claves foráneas compuestas** `(id, company_id)`: la base de datos **rechaza** enlazar un empleado de la empresa A con una sede de la empresa B, aunque el código tenga un error. Está probado en `tests/db/guarantees.test.ts`.
3. **Pruebas automáticas** de acceso cruzado (fase 2): un administrador de la empresa A intentando leer o modificar datos de B.

4. **API pública cerrada:** RLS activo sin políticas y sin permisos para los roles públicos de Supabase (`anon`, `authenticated`). La app se conecta como dueña de las tablas desde el servidor; nadie más puede leer filas.

*Futuro:* políticas RLS por `company_id` como quinta capa cuando haya varias empresas en producción.

## 4. Modelo de datos

Esquema completo en [`prisma/schema.prisma`](../prisma/schema.prisma), con garantías adicionales en la migración inicial.

```
company ─┬─ app_user ─── session, passkey_credential, data_consent
         ├─ site ─── site_opening_hours, site_qr_code
         ├─ employee ─┬─ employee_contract   (salario y jornada versionados por fecha)
         │            ├─ device_binding       (celular vinculado)
         │            ├─ schedule_pattern ── schedule_pattern_day → shift_template
         │            ├─ scheduled_shift       (turno concreto por fecha)
         │            ├─ attendance_event      (marcación inmutable)
         │            ├─ work_session          (jornada: entrada + salida)
         │            ├─ overtime_request      (decisión del administrador)
         │            └─ novelty               (vacaciones, incapacidades, permisos…)
         ├─ holiday, labor_parameter (versionados por fecha, con fuente legal)
         ├─ payroll_period ── payroll_estimate ── payroll_estimate_line
         ├─ attendance_attempt (intentos rechazados)
         └─ audit_log (solo inserción)
```

### Tres tiempos que nunca se mezclan

| Concepto | Dónde vive | ¿Se puede cambiar? |
|---|---|---|
| **Programado** | `scheduled_shift` | Sí, el administrador ajusta turnos |
| **Registrado** (lo que pasó) | `attendance_event` → `work_session` | **No.** Solo inserción; una corrección es un evento nuevo con motivo y autor que referencia al original |
| **Autorizado / tratamiento en pre-nómina** | `overtime_request.approved_minutes`, `novelty` | Sí, con auditoría |

Rechazar una hora extra **no** borra ni reduce el tiempo registrado: solo cambia cómo se trata en la pre-nómina. El reporte muestra las tres columnas.

### Garantías impuestas por la base de datos (probadas)

- Una sola jornada abierta por empleado (índice único parcial). Impide la doble entrada incluso con dos solicitudes simultáneas.
- `attendance_event` y `audit_log`: `UPDATE`/`DELETE` bloqueados por trigger.
- Marcación manual sin motivo ni autor → rechazada.
- Horas extra aprobadas > detectadas → rechazado. Una decisión sin quién y cuándo → rechazada.
- Un solo QR vigente por sede. Coordenadas y radio dentro de rango.
- Correo único sin distinguir mayúsculas.

### Fechas y horas

- Todas las marcas de tiempo son `timestamptz` y **la hora la pone el servidor**, nunca el celular.
- Zona horaria por empresa (por defecto `America/Bogota`, sin horario de verano).
- Los turnos que cruzan la medianoche se guardan con `start_at`/`end_at` reales; la plantilla usa minutos > 1440 (por ejemplo 22:00–06:00 = 1320–1800).
- Turno partido = dos filas el mismo día. Descanso = ninguna fila.

## 5. Seguridad de la marcación con QR

### Flujo

1. El QR impreso contiene `https://<dominio>/m/<publicCode>`. El código es aleatorio y se puede revocar y reimprimir (versión nueva).
2. El empleado escanea. Si su sesión está activa, se abre directamente la pantalla de marcación.
3. Se verifica que el **dispositivo esté vinculado** (cookie httpOnly de larga duración; en BD solo se guarda su hash) y, si el celular lo soporta, con una **passkey** (huella o rostro manejados por el sistema operativo; Nexora no recibe ni guarda biometría).
4. Se pide la ubicación **una sola vez, en ese momento** (sin rastreo continuo). El servidor calcula la distancia a la sede y la compara con el radio y la precisión reportada.
5. El servidor registra la marcación con su propia hora, con una clave de idempotencia (un doble toque no crea dos registros).
6. Todo rechazo queda en `attendance_attempt` con su motivo.

### Limitaciones honestas (documentarlas ante la empresa y el profesor)

- **Un QR estático se puede fotografiar.** Por eso no basta con escanear: se exige sesión, dispositivo vinculado y ubicación. Mitigación opcional: QR dinámico en una tableta de la sede (rotación cada 30 s).
- **La ubicación del navegador se puede falsear** en un celular con herramientas de desarrollo o apps de GPS falso. El navegador no permite detectarlo con certeza. Se registra la precisión y la distancia, y se marcan como *revisar* las marcaciones con precisión pobre.
- **El vínculo de dispositivo se puede perder** si el empleado borra los datos del navegador o cambia de celular. Existe un flujo de recuperación: un nuevo vínculo queda *pendiente* hasta que el administrador lo aprueba.
- **Un empleado puede prestar su celular desbloqueado** a otro. Las passkeys reducen este riesgo (piden huella o PIN del propio teléfono), pero ningún sistema sin biometría propia lo elimina por completo. Es un control administrativo (reglamento interno).
- **No se usa la dirección IP** para identificar dispositivos (cambia con datos móviles y es compartida).

Por esto la recomendación es **probar 30 días con los empleados reales** y revisar los intentos rechazados antes de ofrecerlo a otras empresas.

## 6. Pre-nómina (fase 6)

- Cada valor legal (SMMLV, auxilio de transporte, recargos, horas extra, jornada máxima, inicio de la jornada nocturna, aportes…) es una fila de `labor_parameter` con **fecha de vigencia, norma y URL de verificación**. No hay porcentajes escritos en el código.
- Si falta un parámetro para alguna fecha del período, el cálculo **no inventa**: marca la línea con una advertencia y pide revisión humana.
- El resultado guarda una copia de los parámetros usados (`parameter_snapshot`), así una estimación de octubre se puede reproducir aunque la ley cambie en diciembre.
- Siempre se presenta como **estimación**, no como liquidación legal. No reemplaza al contador.

Cambios graduales ya identificados que el modelo versionado debe soportar, **pendientes de verificar en fuente primaria en la fase 6**: Ley 2466 de 2025 (jornada nocturna desde las 7:00 p. m., recargo dominical y festivo escalonado, reducción de la jornada máxima a 42 h en julio de 2026) y el salario mínimo 2026 (Decreto 1469 de 2025, suspendido, y reemplazado por el Decreto 0159 de 2026).

## 7. Datos personales (Ley 1581 de 2012)

- Se registra la **autorización** de cada usuario con versión de la política (`data_consent`).
- La ubicación se toma solo al marcar y se guarda junto a la marcación como evidencia, nunca en seguimiento.
- Contraseñas con Argon2id. Tokens de sesión y de dispositivo guardados solo como hash.
- Sin secretos en el frontend; variables de entorno solo en el servidor.
- **Requiere revisión jurídica:** el texto de la política de tratamiento, el aviso de privacidad, el tiempo de conservación de las coordenadas y el registro de bases de datos ante la SIC si aplica.

## 8. Preparación SaaS (sin cobros todavía)

`company` ya tiene `status` (prueba, activa, suspendida), `plan_code`, `max_employees` y `max_sites`. El rol `SUPERADMIN` administra empresas. La facturación por suscripción **no** se construye en esta versión.
