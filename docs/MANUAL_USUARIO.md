# Manual de usuario

Nexora tiene tres tipos de cuenta:

- **Empleado:** marca su entrada y salida con el QR de su sede, y pide permisos.
- **Administrador de la empresa:** configura sedes, empleados y horarios; aprueba solicitudes; revisa asistencia, pre-nómina y reportes.
- **Superadministrador (Nexora):** da de alta empresas y mantiene los parámetros legales. No ve datos de los empleados.

Funciona en el navegador del celular o del computador, sin instalar nada. Modo claro u oscuro con el selector de la esquina superior.

---

## 0. Registrar un negocio nuevo

En la página de inicio, **Crear mi cuenta**: nombre del negocio, tu nombre, correo y contraseña. La empresa queda en modo prueba y entras directo a **Primeros pasos**. También se puede registrar con un link de invitación de Nexora.

¿Dudas antes de registrarse? El botón **¿Preguntas?** (abajo a la derecha) abre el asistente de Nexora: responde sobre precios, marcación, pre-nómina, reglas laborales y datos, y lleva al registro o al formulario de contacto.

## 1. Primer ingreso (todas las cuentas)

1. Abra la dirección de Nexora y escriba su **correo** y la **contraseña temporal** que le entregaron.
2. Cree su propia contraseña (mínimo 10 caracteres).
3. Lea y acepte la **autorización de tratamiento de datos personales**.

¿Olvidó la contraseña? En la pantalla de ingreso, «¿Olvidaste tu contraseña?»:
- **Empleados:** el administrador le da una contraseña temporal nueva.
- **Administradores:** el soporte de Nexora le da una contraseña temporal nueva.

Después de 5 intentos fallidos la cuenta se bloquea 15 minutos. Si hay muchos intentos fallidos desde una misma red, esa red espera 15 minutos.

<img src="img/celular-ingresar.jpg" alt="Pantalla de ingreso en el celular" width="240">

---

## 2. Empleado

### Marcar entrada y salida

1. **Solo la primera vez**, escanee el QR de la entrada de la sede e ingrese con su correo y contraseña. La sesión queda guardada en el celular (no se vuelve a pedir mientras la use).
   - **Las siguientes veces no hace falta escanear:** abra Nexora (la dirección principal lleva directo a su Inicio) y toque **Registrar entrada** o **Registrar salida**. Nexora usa la sede más cercana a su ubicación. Si el celular no lo ubica, use **¿No te ubica? Escanea el QR de la sede**.
   - **En iPhone:** si escanea con la cámara, se abre una ventana aparte; la primera vez pide **Confirmar con huella o Face ID** en esa ventana.
2. **La primera vez:** toque **Vincular este celular** y luego **Activar huella o Face ID** (obligatorio). Solo podrá marcar desde ese celular. Si ya tenía otro vinculado, el nuevo queda pendiente hasta que el administrador lo apruebe y después también activa su huella o Face ID.
3. Toque **Registrar entrada** (o **Registrar salida**), en Inicio o en la pantalla del QR. El celular pide permiso de **ubicación**: debe estar dentro del área de la sede.
4. El celular le pide su **huella o Face ID** (en algunos celulares, el PIN del celular).
5. Verá la confirmación con la hora. **La hora la pone el servidor**, no el celular.

| Antes de marcar | Entrada registrada |
|---|---|
| <img src="img/celular-qr-antes.jpg" alt="Pantalla del QR antes de marcar" width="240"> | <img src="img/celular-qr-entrada.jpg" alt="Entrada registrada" width="240"> |

**Huella o Face ID (obligatorio):** sin ella no se puede marcar. Si no la activó al vincular, Nexora muestra **Activar huella o Face ID** en Inicio y en la pantalla del QR. Así nadie más puede marcar por usted, aunque tenga su celular. Nexora no recibe su huella ni su rostro; los verifica el celular. Si su celular no tiene huella ni Face ID, el administrador puede autorizarlo a marcar sin ella.

**Si Nexora le pide confirmar que es su celular** (por ejemplo, después de borrar los datos del navegador o al abrir el QR desde la cámara del iPhone), toque **Confirmar con huella o Face ID**. No hace falta que el administrador apruebe nada, y las demás ventanas del celular (Safari, el ícono de inicio, la cámara) siguen reconocidas: solo se confirma una vez por ventana.

**En iPhone:** si agregó Nexora a la pantalla de inicio antes del 2 de noviembre de 2026, bórrelo y vuelva a agregarlo desde Safari (Compartir → Agregar a inicio).

### Mensajes al marcar

| Mensaje | Qué hacer |
|---|---|
| Estás fuera del área de la sede | Acérquese a la entrada e intente de nuevo |
| La ubicación del celular no es precisa | Active el GPS y salga a un lugar despejado |
| Celular pendiente de aprobación | Pida al administrador que lo apruebe |
| Ya registraste una marcación hace un momento | No marque dos veces seguidas |

Los intentos rechazados no crean marcaciones, pero el administrador los ve.

### Historial y solicitudes

- **Historial:** sus jornadas de los últimos días, con horas trabajadas.
- **Solicitudes:** **Pedir un permiso o vacaciones** (por días o por horas), y ver **Mis horas extra** (las detecta el sistema; puede dejar un comentario). Mientras esté pendiente, puede **Retirar** una solicitud.

<img src="img/celular-app-oscuro.jpg" alt="Inicio del empleado en modo oscuro" width="240">

---

## 3. Administrador de la empresa

### Resumen

La asistencia de hoy (en jornada, llegadas tarde, ausentes, horas), los turnos del día y la actividad reciente.

![Resumen del administrador](img/escritorio-admin-resumen.jpg)

### Configuración inicial (una sola vez)

Si se registró con un link de invitación, **Primeros pasos** (en el menú) muestra qué falta y lleva a cada pantalla; cada paso se marca solo cuando está hecho.


1. **Configuración:** tolerancia de llegada tarde, precisión mínima del GPS, si se exige celular vinculado, y si la empresa aplica la **exoneración del art. 114-1 del Estatuto Tributario** (confírmelo con su contador).
2. **Sedes y QR → Nueva sede:** nombre, dirección, **coordenadas** (en la sede: Editar → **Usar mi ubicación actual**) y **radio permitido** (80 m por defecto).
3. **Imprimir QR** de cada sede y péguelo en la entrada. Si un QR se filtra o se daña: **Rotar QR** (el anterior deja de funcionar al instante; imprima el nuevo).
4. **Empleados → Nuevo empleado:** datos, sede habitual y contrato (salario, horas semanales, clase de riesgo ARL). Nexora muestra una **contraseña temporal** una sola vez: entréguesela al empleado por un canal privado.
5. **Horarios:** plantillas de turno (si el fin es antes del inicio, termina al día siguiente) y el horario de cada empleado (semanal o rotativo de 14 días). Para un día puntual: **Cambio puntual**.

![Sedes y QR](img/escritorio-admin-sedes.jpg)

![Horarios de la semana](img/escritorio-admin-horarios.jpg)

### Día a día

- **Asistencia:** quién está en jornada, quién llegó tarde o no ha llegado, intentos rechazados y celulares por aprobar.
- **Celular sin huella ni Face ID** (por ejemplo, uno viejo): en **Empleados →** el empleado **→ Celulares vinculados**, **Permitir marcar sin huella ni Face ID**. Solo aplica a ese celular; uno nuevo vuelve a exigirla. Se puede revertir con **Volver a exigir huella o Face ID**.
- **Solicitudes:**
  - **Horas extra:** Nexora las detecta al cerrar cada jornada (tiempo registrado por encima del programado, desde 15 minutos). Puede **Aprobar** todo o parte, o **Rechazar**. Rechazar no borra el tiempo registrado: solo define cuánto se paga como extra. Para datos anteriores: **Revisar jornadas pasadas**.
  - **Novedades:** aprobar o rechazar permisos y vacaciones; **Registrar novedad aprobada** (por ejemplo, una incapacidad que le enviaron).
- **Correcciones** (en el detalle del empleado): registrar la salida olvidada de una jornada o **Agregar jornada**, siempre con un motivo. La marcación original no se borra.

![Asistencia del día](img/escritorio-admin-asistencia.jpg)

### Pre-nómina (estimación, no liquidación legal)

1. Elija la quincena o el mes y toque **Calcular estimación**.
2. Revise el total y las advertencias de cada empleado. Abra un empleado para ver cada concepto con su explicación y los parámetros legales usados.
3. Si falta un parámetro legal o un dato del contrato, ese empleado queda **Sin calcular** y no se muestra ningún valor.
4. **Parámetros laborales:** la tabla de valores legales (salario mínimo, recargos, aportes) con norma y vigencia, para revisarla con su contador.

**Liquidar el período (Calcular → Revisar → Cerrar):**

1. **Calcular:** mientras está en *Borrador* puede recalcular las veces que quiera (por ejemplo, después de aprobar horas extra o corregir una jornada).
2. **Marcar como revisada:** cuando todos los empleados quedaron calculados. Ya no se recalcula; si encuentra un error, **Volver a borrador para corregir**.
3. **Cerrar período:** marque la casilla de confirmación (el contador revisó los valores) y toque **Cerrar período**. Un período cerrado queda fijo: no se recalcula ni se reabre.

En **Liquidación del período** ve cuánto sale y a quién: neto a pagar a los empleados, planilla de seguridad social (PILA) y provisiones para reservar (cesantías, intereses, prima y vacaciones), más el total por concepto. Los tres suman el costo total para la empresa.

**Descargas:** **Comprobantes de pago (PDF)** (una página por empleado, con firma del empleador y «recibí conforme»; dice *BORRADOR* hasta cerrar el período), el comprobante de un solo empleado desde su detalle, y **Resumen para el contador (Excel)**. **Períodos calculados** muestra el estado de cada quincena o mes y el **Historial** quién calculó, revisó y cerró, y cuándo.

![Pre-nómina de la quincena](img/escritorio-pre-nomina.jpg)

![Detalle por empleado](img/escritorio-pre-nomina-detalle.jpg)

### Reportes

- Filtros por fechas, sede y empleado (con atajos: últimos 7 días, últimos 30 días, este mes, mes anterior).
- Indicadores comparados con el período anterior y gráficos (asistencia semanal, puntualidad, horas por sede, costo estimado). Cada gráfico tiene **Ver datos en tabla**.
- Cinco reportes: asistencia, horas extra, novedades, pre-nómina e intentos rechazados. Cada uno se puede **Ver** en pantalla o descargar en **Excel**, **CSV** o **PDF**, con empresa, período y fecha de generación.

![Reportes](img/escritorio-reportes.jpg)

---

## 4. Superadministrador (Nexora)

- **Solicitudes:** los negocios que llenan «Solicita tu invitación» en la página de inicio. Contáctalos, genera su link en **Invitaciones** y márcalos como contactados, invitados o descartados.

- **Invitaciones → Generar link:** el dueño de un negocio abre el link, crea su empresa y su cuenta, y Nexora lo guía en **Primeros pasos** (reglas, sedes, turnos, empleados, horarios, QR y marcación de prueba). El link sirve una sola vez y vence; se puede anular.

- **Empresas → Nueva empresa:** nombre, NIT, plan y límites de sedes y empleados, y el primer administrador. Nexora muestra su contraseña temporal una sola vez.
- **Detalle de la empresa:** activar, pasar a prueba o **Suspender** (cierra al instante las sesiones de todos sus usuarios; los datos no se borran). **Restablecer contraseña** de un administrador que la olvidó.
- **Parámetros laborales:** cargar una **nueva versión** cuando cambie una norma (la anterior se cierra el día previo; nada se borra) y **Validar** cada valor después de la revisión del contador.

![Nueva empresa](img/escritorio-plataforma-nueva.jpg)

![Parámetros laborales](img/escritorio-parametros.jpg)
