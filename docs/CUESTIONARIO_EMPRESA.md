# Cuestionario para activar la empresa en Nexora

Con estas respuestas se deja la empresa configurada de punta a punta: sedes con su QR, empleados con su contrato, horarios y reglas. Lo marcado **(obligatorio)** es necesario para activar; lo demás se puede completar después.

Los datos de sedes, empleados y horarios se llenan más fácil en la plantilla de Excel **`plantilla-datos-empresa.xlsx`**: trae listas desplegables y una fila de ejemplo.

> Los datos personales de los empleados (documento, correo, salario) son confidenciales. Envíelos por un canal privado, no por un grupo de chat.

---

## A. Empresa

1. **Nombre comercial** (obligatorio). Ej.: Panadería El Trigal.
2. Razón social y **NIT**.
3. **Nombre y correo del administrador** que manejará Nexora (obligatorio). Ese correo será su usuario.
4. ¿Habrá otro administrador o encargado por sede? Nombre y correo.
5. ¿La empresa es **persona jurídica declarante de renta** (S.A.S., Ltda., etc.) o persona natural con dos o más empleados? Sirve para saber si aplica la exoneración de salud del empleador, SENA e ICBF (art. 114-1 del Estatuto Tributario). Si no sabe, pregúntele a su contador.
6. **Fecha en que quiere empezar el piloto** de 30 días.

## B. Sedes (una fila por sede en la hoja «Sedes»)

7. **Nombre de cada sede** (obligatorio). Ej.: Centro, Primavera.
8. **Dirección y ciudad** (obligatorio).
9. **Ubicación exacta de la puerta donde se pegará el QR** (obligatorio). Dos formas:
   - En Google Maps, de pie en la entrada: mantenga presionado el punto azul y copie los dos números (latitud, longitud). Ej.: `4.1420, -73.6266`.
   - O dígame que la tomará usted mismo con el celular desde Nexora (Sedes → Editar → «Usar mi ubicación actual») cuando esté en la sede.
10. ¿La sede está dentro de un centro comercial, un sótano o una zona con mala señal? En esos lugares el GPS falla más y conviene un radio mayor.
11. **Radio permitido para marcar**, en metros. Por defecto son 80 m. Si no sabe, déjelo así y se ajusta la primera semana.
12. **Días y horario de apertura** de cada sede. Ej.: lunes a sábado, 5:00 a. m. a 8:00 p. m.
13. ¿Dónde se pegará el QR y quién lo imprime?

## C. Empleados (una fila por empleado en la hoja «Empleados»)

14. **Nombres y apellidos** (obligatorio).
15. **Tipo y número de documento** (obligatorio): CC, CE, PPT, pasaporte o TI.
16. **Correo de cada empleado** (obligatorio): es su usuario para ingresar. Si alguno no tiene correo, hay que crearle uno, por ejemplo uno gratuito de Gmail.
17. Celular (opcional).
18. **Cargo y sede habitual** (obligatorio).
19. **Fecha de ingreso a la empresa** (obligatorio).
20. **Contrato** (obligatorio):
    - tipo: término indefinido, término fijo, obra o labor, aprendizaje o prestación de servicios;
    - fecha de inicio del contrato actual;
    - si es de término fijo, fecha de terminación.
21. **Salario mensual** (obligatorio) y si es ordinario o integral.
22. **Horas semanales pactadas** (obligatorio). Desde el 15 de julio de 2026 el máximo legal es 42 h.
23. **Frecuencia de pago** (obligatorio): quincenal o mensual.
24. **Clase de riesgo ARL** de cada cargo (I a V; la indica la ARL o el contador). Y si la conoce, la **tarifa exacta de su póliza**: puede ser distinta de la tarifa base.
25. **Celular que usará para marcar:** ¿propio o de la empresa? ¿iPhone o Android? ¿Tiene huella o reconocimiento facial?
26. ¿Algún empleado no tiene celular con internet o no puede usarlo en el trabajo? Para esos casos se puede desactivar la exigencia de celular vinculado o registrar sus jornadas a mano.

## D. Horarios (hojas «Turnos» y «Horarios»)

27. **Turnos que usa la empresa** (obligatorio). Para cada uno: nombre, hora de inicio, hora de fin, minutos de descanso y si ese descanso es pagado o no. Ej.: «Madrugada 4:00–12:30, 30 min no pagados». Si el fin es antes del inicio, el turno termina al día siguiente.
28. **Horario de cada empleado** (obligatorio): qué turno hace cada día de la semana y qué días descansa.
29. ¿Algún empleado tiene **turno partido** (dos turnos el mismo día)?
30. ¿Algún empleado **rota** (una semana de mañana y otra de tarde)? Nexora maneja ciclos de 14 días.
31. ¿Se trabaja **domingos o festivos**? ¿Quiénes?
32. ¿Hay **turnos nocturnos** (después de las 7:00 p. m.)?

## E. Reglas de la empresa

33. **Tolerancia de llegada tarde** (minutos). Ej.: 5 minutos.
34. ¿Las **horas extra** deben ser autorizadas antes? ¿Quién las autoriza hoy?
35. ¿Cómo funciona el **almuerzo**? Hay dos opciones:
    - Es un descanso fijo dentro del turno: no se marca y Nexora lo descuenta según el horario.
    - El empleado sale de la sede: marca salida y vuelve a marcar entrada.
36. ¿Quién **aprueba** los permisos y las vacaciones?
37. ¿Hay hoy empleados en **vacaciones, incapacidad o licencia**? Fechas (hoja «Novedades»).

## F. Pre-nómina y revisión profesional

38. **Nombre y contacto del contador** que liquida la nómina. Debe revisar la tabla de parámetros legales antes de usar la pre-nómina.
39. ¿Paga la nómina **quincenal o mensual**? ¿Qué día?
40. ¿Tiene **abogado** o asesor que revise la autorización de tratamiento de datos personales (Ley 1581)?

## G. Dominio y despliegue

41. ¿Tiene o quiere un **dominio propio** (ej.: `asistencia.miempresa.com`)? Debe estar listo **antes de imprimir los QR definitivos**: cambiarlo después obliga a reimprimirlos.
42. ¿Quién paga el hospedaje? La base de datos con respaldos diarios cuesta unos USD 25 al mes; se recomienda antes de cargar datos reales.

---

## Qué hago con las respuestas

1. Creo la empresa y su administrador. El administrador recibe una contraseña temporal.
2. Creo las sedes con sus coordenadas y su QR, listos para imprimir.
3. Creo los turnos y el horario de cada empleado.
4. Creo los empleados con su contrato. Cada uno recibe una contraseña temporal que el administrador le entrega en privado.
5. Configuro la tolerancia, el celular vinculado y la exoneración.
6. Verifico todo con una marcación de prueba por sede antes de empezar el piloto.
