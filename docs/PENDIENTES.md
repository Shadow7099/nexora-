# Información que se necesita de la empresa real

La demo usa datos ficticios. Para el piloto de 30 días se necesita:

## Por sede (4)
- Nombre y dirección exacta.
- **Coordenadas reales** (abrir Google Maps en la puerta de la sede → mantener presionado → copiar latitud y longitud).
- Radio permitido sugerido (por defecto 80 m; en centros comerciales o zonas con mala señal puede necesitarse más).
- Horario de apertura y cierre por día.
- ¿Hay wifi o señal móvil estable en el punto donde se pegará el QR?

## Por empleado (8)
- Nombre, documento, cargo, sede habitual, correo o celular para el acceso.
- Tipo de contrato, salario mensual, fecha de ingreso, frecuencia de pago (quincenal o mensual).
- Horario real actual (incluidos turnos nocturnos, partidos o rotativos).
- Modelo de celular (para confirmar soporte de passkeys) y si el celular es propio o de la empresa.
- Clase de riesgo ARL de cada cargo.

## De la empresa
- Razón social y NIT.
- Tolerancia de llegada tarde que aplica hoy (en minutos).
- ¿Se pagan las pausas o almuerzos? ¿De cuánto son?
- ¿Cómo se autorizan hoy las horas extra?
- ¿Quién revisa la pre-nómina (contador o asesor de nómina)? Debe validar los cálculos de la fase 6.

## Revisión profesional
- **Jurídica:** política de tratamiento de datos y aviso de privacidad (Ley 1581 de 2012); conservación de coordenadas; reglamento interno sobre el uso del celular para marcar.
- **Nómina:** validar los parámetros legales cargados en la fase 6 contra la normativa vigente para el período del piloto.

## Despliegue
- Dominio (por ejemplo `asistencia.empresa.com`) para imprimir en los QR. **Cambiar el dominio después obliga a reimprimir los QR.** Pasos en [DESPLIEGUE.md](DESPLIEGUE.md#4-dominio-propio-antes-de-imprimir-los-qr-definitivos).
- Hosting y base de datos: ya en Vercel + Supabase (planes gratuitos). Antes del piloto con datos reales, pasar a planes con respaldos (Supabase Pro).
- Opcional: proveedor de correo (Resend, Amazon SES…) si se quiere recuperación de contraseña por correo.

## Antes del piloto (checklist)
1. Marcación real con un celular físico (iPhone y Android) en cada sede.
2. Contador: validar la tabla de parámetros (Plataforma → Parámetros laborales) y el criterio del valor hora.
3. Abogado: texto de autorización de datos (`/autorizacion`).
4. Dominio propio, `APP_URL` e impresión definitiva de los QR.
5. Cargar sedes, empleados, contratos y horarios reales (o crear la empresa real desde Plataforma → Nueva empresa).
