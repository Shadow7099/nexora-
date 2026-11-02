# Pruebas y resultados

> Última ejecución completa: 2 de noviembre de 2026, commit de la fase 8.
> **Vitest: 161 pruebas en 14 archivos, todas en verde. Playwright: 74 pruebas (37 escenarios × escritorio y celular), todas en verde.**

## Cómo se ejecutan

```bash
npm run check                                         # tipos + lint + 161 pruebas unitarias y de base de datos
CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e   # 74 pruebas de navegador (escritorio y celular)
```

- Las pruebas de base de datos usan una base propia (`nexora_test`) que se borra y se recrea con todas las migraciones en cada ejecución. Nunca tocan la base real (el nombre debe terminar en `_test`).
- Las de navegador usan otra base (`nexora_e2e_test`) con la empresa demo, levantan la app compilada (`next start`) y la recorren en Chrome de escritorio y en un Pixel 7 emulado.
- La huella (passkey) se prueba con el autenticador virtual de Chrome; la ubicación, con la geolocalización simulada de Playwright.

## Las 10 pruebas obligatorias del enunciado

| # | Qué se exige | Dónde se prueba | Resultado |
|---|---|---|---|
| 1 | Un empleado puede registrar entrada y salida | `tests/db/attendance.test.ts` «registra entrada y salida, abre y cierra la jornada con la hora del servidor» · `tests/e2e/attendance.spec.ts` «entrada y salida desde el QR, con la hora del servidor y sin duplicados» | ✅ |
| 2 | No puede registrar una segunda entrada con una jornada abierta | `tests/db/guarantees.test.ts` «rechaza una segunda entrada mientras hay una jornada abierta» (índice único en la BD) · `tests/db/attendance.test.ts` «no permite una segunda entrada inmediata (duplicado) y lo registra» | ✅ |
| 3 | Turnos nocturnos y partidos | `tests/unit/schedule.test.ts` «turno partido…», «turno nocturno: termina al día siguiente», «a las 2 a. m. del miércoles devuelve el turno nocturno del martes» · `tests/db/phase35.test.ts` «un nuevo patrón aplica desde su fecha y no cambia el pasado (nocturno y partido)» · `tests/unit/reports.test.ts` «una jornada nocturna pertenece al día de su entrada» · `tests/unit/payroll.test.ts` «jornada nocturna que cruza la medianoche…» | ✅ |
| 4 | Ubicación fuera del área: rechazada o gestionada con excepción documentada | `tests/unit/geo.test.ts` (dentro / borde con incertidumbre del GPS / fuera) · `tests/db/attendance.test.ts` «fuera del radio: rechazada, sin marcación y con intento registrado», «borde del radio… aceptada y marcada para revisar» · `tests/e2e/attendance.spec.ts` «fuera del área de la sede: rechazada y visible para el administrador» | ✅ |
| 5 | Un empleado no puede consultar registros ajenos | `tests/db/tenancy.test.ts` «un empleado no puede usar funciones de administrador», «un empleado solo ve su propia pantalla» · `tests/db/phase35.test.ts` «…el empleado no ve las de otros» · `tests/e2e/auth.spec.ts` «un empleado no puede entrar al panel de administración» · `tests/e2e/reports.spec.ts` «…un empleado no puede descargar» (403) | ✅ |
| 6 | Un administrador de una empresa no puede acceder a otra | `tests/db/tenancy.test.ts` «no puede leer, editar, desactivar ni resetear empleados de otra empresa (responde 'no existe')» · `tests/db/guarantees.test.ts` (claves foráneas compuestas: la BD rechaza mezclar empresas) · aislamiento en cada módulo: `attendance`, `phase35`, `payroll`, `reports` (sede o empleado de otra empresa = NOT_FOUND) | ✅ |
| 7 | Los reportes corresponden a los datos almacenados | `tests/db/reports.test.ts` «prueba obligatoria 7»: totales de asistencia, horas extra, novedades y pre-nómina comparados con consultas SQL independientes y con el Excel generado · `tests/e2e/reports.spec.ts` «vista previa y descarga en Excel: mismos totales» | ✅ |
| 8 | La pre-nómina usa los parámetros configurados | `tests/unit/payroll.test.ts` (20 casos calculados a mano; recargo dominical 80 % → 90 % según la fecha; franja nocturna antes y después de la Ley 2466; valor de la empresa con prioridad sobre el nacional; parámetro faltante ⇒ bloqueado sin números) · `tests/db/payroll.test.ts` (copia de parámetros guardada con cada estimación) | ✅ |
| 9 | Funciona correctamente en celulares | **Todas** las pruebas de navegador corren también en un Pixel 7 emulado. Además: `tests/e2e/auth.spec.ts` «ninguna página privada desborda horizontalmente», comprobación de que el viewport no se agranda (`payroll`, `reports`, `platform`), marcación completa desde el celular, recuperación del celular con la huella | ✅ (falta la prueba con un celular físico, ver abajo) |
| 10 | Los errores se gestionan sin perder información | `tests/db/attendance.test.ts` «repetir la misma solicitud (misma clave) devuelve el mismo resultado sin duplicar» (reintentos de red), «una jornada olvidada (> 16 h) pasa a revisión sin inventar salida» · `tests/db/guarantees.test.ts` «bloquea UPDATE y DELETE sobre marcaciones», «…sobre la auditoría», «no permite vaciar marcaciones ni auditoría» · `tests/db/phase35.test.ts` «registra la salida olvidada con motivo; la marcación original sigue intacta», rechazar horas extra no cambia el tiempo registrado · formularios que conservan lo escrito al fallar la validación (`tests/db/tenancy.test.ts` «valida los campos y devuelve errores legibles») · intentos rechazados quedan registrados (`tests/db/attendance.test.ts`) | ✅ |

## Resumen por archivo

| Archivo | Pruebas | Qué cubre |
|---|---:|---|
| `tests/unit/schedule.test.ts` | 16 | Turnos: nocturnos, partidos, rotativos, cambios puntuales |
| `tests/unit/geo.test.ts` | 7 | Distancia (Haversine) y decisión dentro / borde / fuera |
| `tests/unit/holidays.test.ts` | 4 | Festivos colombianos (Pascua, Ley Emiliani, Ley 2578 de 2026) |
| `tests/unit/payroll.test.ts` | 20 | Pre-nómina calculada a mano |
| `tests/unit/reports.test.ts` | 6 | Asistencia día a día, agregados, CSV |
| `tests/unit/utils.test.ts` | 4 | Formatos |
| `tests/db/guarantees.test.ts` | 14 | Garantías impuestas por la base de datos |
| `tests/db/auth.test.ts` | 9 | Ingreso, bloqueo por cuenta y por red, sesiones |
| `tests/db/tenancy.test.ts` | 13 | Multiempresa, empleados, contratos |
| `tests/db/attendance.test.ts` | 20 | Marcación con QR, celular, huella, ubicación |
| `tests/db/phase35.test.ts` | 18 | Sedes, QR, horarios, horas extra, novedades, correcciones |
| `tests/db/payroll.test.ts` | 8 | Pre-nómina con datos de la base, parámetros |
| `tests/db/reports.test.ts` | 6 | Prueba obligatoria 7, tablero, filtros |
| `tests/db/platform.test.ts` | 4 | Alta de empresas, suspensión, recuperación del administrador |
| `tests/e2e/*.spec.ts` | 37 × 2 | Flujos completos en escritorio y celular |

## Errores encontrados por las pruebas (y corregidos)

- Páginas de dos columnas y tablas con texto oculto (`sr-only`) ensanchaban la página en celular. Se corrigió y ahora las pruebas comparan el viewport con el ancho de la pantalla.
- En iPhone, el ícono de la pantalla de inicio no compartía cookies con Safari (donde abre el QR): pedía vincular el celular en cada ingreso. Se cambió el manifiesto y se agregó la recuperación con la huella (prueba en `attendance.spec.ts`).
- `TRUNCATE` podía vaciar las tablas de solo inserción: migración que lo bloquea (prueba en `guarantees.test.ts`).
- Redondeo de coma flotante en la pre-nómina (124.547,4999… → 124.547): se corrigió el redondeo al peso.
- Mensajes de confirmación que desaparecían al revalidar la página (aprobar, validar).

## Lo que no se puede automatizar (pendiente del usuario)

1. **Marcación real con un celular físico** (iPhone y Android): escanear el QR impreso, vincular, activar la huella y marcar en la sede. Hasta hoy no hay marcaciones reales en producción.
2. **Precisión del GPS en cada sede real** (interiores, centros comerciales): ajustar el radio según lo que muestren los intentos rechazados la primera semana.
3. **Validación de los parámetros de la pre-nómina por un contador** y del texto de autorización de datos por un abogado.
