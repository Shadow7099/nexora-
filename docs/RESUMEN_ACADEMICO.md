# Nexora: resumen académico

*Control inteligente. Empresas eficientes.*
Proyecto para la materia de economía · noviembre de 2026

---

## 1. Problema empresarial

Las micro, pequeñas y medianas empresas colombianas controlan la asistencia de su personal con planillas de papel, hojas de cálculo o relojes de huella aislados. Eso genera cuatro costos:

1. **Errores de nómina.** Las horas extra, los recargos nocturnos y los dominicales se calculan a mano. Las reglas cambian con frecuencia. Solo la Ley 2466 de 2025 movió la franja nocturna a las 7:00 p. m. (desde el 25 de diciembre de 2025), subió el recargo dominical en escalones (80 % → 90 % → 100 % entre 2025 y 2027), y la Ley 2101 de 2021 bajó la jornada máxima a 42 horas semanales desde el 15 de julio de 2026.
2. **Riesgo legal.** Pagar de menos un recargo o una hora extra expone al empleador a reclamaciones laborales. Pagar de más, por no tener registros confiables, es un sobrecosto directo.
3. **Información asimétrica.** El empleador no observa directamente las horas trabajadas en sedes donde no está presente: la marcación por otra persona y las horas no autorizadas son un problema clásico de agente-principal.
4. **Tiempo administrativo.** Consolidar asistencia de varias sedes y preparar la pre-nómina consume horas del dueño o del administrador cada quincena.

**Tamaño del segmento.** Las mipymes son más del 99 % de las empresas del país y generan entre el 65 % y el 80 % del empleo. Las cifras varían según la fuente, el año y la metodología ([BBVA Research](https://www.bbvaresearch.com/publicaciones/colombia-una-mirada-a-las-mipymes-en-colombia/), [Semana](https://www.semana.com/economia/articulo/las-mipymes-en-colombia/202439/), [Asobancaria](https://www.asobancaria.com/wp-content/uploads/2022/10/1351_BE.pdf)).

## 2. Solución propuesta

Una plataforma web (SaaS) en la que:

- **Cada empleado marca entrada y salida escaneando un QR pegado en su sede**, desde su propio celular. Nexora valida cuatro cosas: el QR vigente, que el celular esté vinculado, la huella (opcional) y que la ubicación esté dentro del área de la sede. La hora la pone el servidor.
- **El administrador ve la asistencia en tiempo real**: quién llegó, quién llegó tarde, quién faltó, y los intentos rechazados.
- **Las horas extra se detectan solas** (tiempo registrado por encima del programado) y el administrador decide cuántas autoriza. El tiempo registrado nunca se borra.
- **La pre-nómina se estima** con los parámetros legales vigentes en cada fecha (salario mínimo, auxilio de transporte, recargos, aportes). Cada valor cita su norma. Si falta un parámetro, no se muestra ningún número.
- **Reportes y gráficos** exportables a Excel, CSV y PDF.

No reemplaza al contador ni hace nómina electrónica: le entrega información confiable y a tiempo.

**Estado:** primera versión funcional en producción (https://nexora-tau-liard.vercel.app), con 161 pruebas automáticas y 74 de navegador, en escritorio y celular.

## 3. Público objetivo

| Segmento | Características |
|---|---|
| **Principal** | Empresas de 5 a 30 empleados con **varias sedes o turnos**: panaderías, restaurantes, tiendas, droguerías, servicios de aseo y vigilancia |
| Usuario que paga | Dueño o administrador, sin área de recursos humanos |
| Usuario diario | El empleado, con su celular |
| Aliado | El contador externo que liquida la nómina |

Caso piloto: una panadería con 4 sedes y 8 empleados, con turnos de madrugada, nocturnos y partidos.

## 4. Propuesta de valor

| Para | Valor |
|---|---|
| El dueño | Sabe quién está trabajando en cada sede sin estar ahí. Conoce el costo laboral estimado antes de pagar. Tiene registros que no se pueden alterar si hay una reclamación |
| El administrador | Deja de consolidar planillas. Las horas extra le llegan detectadas para aprobar. Cada quincena tiene la pre-nómina con su explicación |
| El empleado | Marca en segundos con su celular, ve su historial y pide permisos sin papeles |
| El contador | Recibe datos ordenados en Excel, con cada recargo explicado y la norma que lo sustenta |

**Diferenciadores:**
- No requiere comprar hardware (relojes biométricos): el QR impreso cuesta casi cero y el celular ya lo tiene el empleado.
- Las reglas laborales colombianas están versionadas por fecha.
- El tiempo registrado es inmutable y auditable.

## 5. Modelo de ingresos

**Suscripción mensual (SaaS) por tamaño de empresa.** Son precios de prueba, todavía **sin validar** con clientes:

| Plan | Empleados | Precio mensual | Precio por empleado (si usa el máximo) |
|---|---:|---:|---:|
| Básico | hasta 5 | $59.900 COP | $11.980 |
| Empresa | hasta 15 | $99.900 COP | $6.660 |
| Negocios | hasta 30 | $149.900 COP | $4.997 |

Referencia de mercado: un proveedor colombiano de control de asistencia publica precios entre **COP 8.000 y 14.000 por contrato activo al mes**, según el volumen ([Software Advice, Bitakora](https://www.softwareadvice.com/hr/bitakora-profile/); dato sin fecha, a confirmar). Los planes de Nexora quedan en ese rango o por debajo.

Ingresos futuros posibles:
- Plan por sedes adicionales.
- Implementación asistida (configurar sedes, horarios e imprimir QR).
- Integración con el software de nómina electrónica del contador.

La plataforma ya guarda el plan y los límites de sedes y empleados de cada empresa. El cobro automático no se construyó en esta versión, por decisión de alcance.

## 6. Viabilidad económica preliminar

### Estructura de costos

El costo de **atender a un cliente adicional es casi cero**. La misma infraestructura sirve a muchas empresas (arquitectura multiempresa), así que los costos son mayormente fijos y hay **economías de escala**.

| Concepto | Tipo | Valor mensual | Fuente o supuesto |
|---|---|---|---|
| Hospedaje de la app (Vercel Pro) | Fijo | ≈ USD 20 por usuario | [Comparativa 2026](https://www.jetadmin.io/blog/vercel-vs-supabase/), a confirmar en vercel.com/pricing |
| Base de datos (Supabase Pro, con respaldos diarios) | Fijo | ≈ USD 25 | [Guía de precios 2026](https://makerkit.dev/blog/saas/supabase-pricing), a confirmar en supabase.com/pricing |
| Dominio y correo transaccional | Fijo | bajo | Supuesto |
| Soporte e implementación (medio tiempo) | Fijo (por tramos) | COP 2.000.000 | **Supuesto** |
| Pasarela de pagos | Variable | ≈ 3 % del ingreso | **Supuesto** |

### Punto de equilibrio (escenario ilustrativo)

Supuestos, todos por validar:
- **Costos fijos:** COP 2.500.000 al mes. Son ≈ USD 45 de infraestructura más soporte y otros; la conversión depende de la TRM vigente.
- **Mezcla de clientes:** 40 % Básico, 40 % Empresa y 20 % Negocios.
- **Ingreso promedio por cliente:** 0,4 × 59.900 + 0,4 × 99.900 + 0,2 × 149.900 = **COP 93.900**.
- **Margen de contribución por cliente:** ≈ 93.900 × (1 − 0,03) ≈ **COP 91.000**. El costo variable es solo la pasarela.

$$\text{Clientes de equilibrio} = \frac{\text{Costos fijos}}{\text{Margen de contribución por cliente}} = \frac{2.500.000}{91.000} \approx 28 \text{ empresas}$$

Interpretación:
- Con cerca de **28 empresas** suscritas se cubren los costos del escenario.
- Por encima de ese número, casi todo ingreso adicional es utilidad, hasta que el soporte exija contratar a otra persona (un costo fijo "por tramos").
- Sin el soporte pagado (el fundador lo hace), el equilibrio baja a unas **2 empresas**, solo por la infraestructura.

### Análisis económico

- **Para el cliente, la decisión de compra es un análisis costo-beneficio:** el plan Empresa (COP 99.900) se paga si evita, por ejemplo, unas pocas horas mensuales de trabajo administrativo o un solo error en recargos. Hay que medirlo en el piloto: horas ahorradas y diferencias encontradas entre lo programado y lo registrado.
- **Reducción de la asimetría de información:** el registro con QR, celular vinculado, huella y ubicación baja el costo de monitoreo del empleador. También protege al trabajador: sus horas extra quedan registradas aunque no se aprueben.
- **Costos de cambio:** una vez configuradas las sedes, los horarios y el historial, cambiar de proveedor es costoso para el cliente. Eso favorece la retención, pero obliga a ofrecer exportación completa de los datos (ya existe en Excel/CSV) para generar confianza.

### Riesgos

| Riesgo | Mitigación |
|---|---|
| Disposición a pagar menor a la supuesta | Piloto gratuito de 30 días; medir el valor antes de fijar precios |
| Cambios normativos frecuentes | Parámetros versionados por fecha, actualizables sin programar; validación por contador |
| Errores legales en la estimación | Se presenta como estimación con advertencias, nunca como liquidación; revisión profesional |
| Adopción por parte de los empleados | Marcación en segundos, sin instalar nada; pruebas en celulares reales |
| Competencia de proveedores establecidos | Enfoque en mipymes multisede sin hardware y en reglas colombianas explicadas |
| Dependencia de proveedores de nube | Arquitectura estándar (Next.js + PostgreSQL) que se puede trasladar a otro proveedor |

## 7. Próximos pasos

1. **Piloto de 30 días** en las 4 sedes de la empresa demo, con los empleados reales.
2. **Medir:**
   - horas administrativas ahorradas por quincena;
   - diferencias detectadas entre horas programadas y registradas;
   - marcaciones rechazadas y su causa;
   - satisfacción del administrador y de los empleados.
3. **Validar:** la tabla de parámetros legales con un contador y la política de datos con un abogado.
4. **Encuestar la disposición a pagar** con 10 a 20 empresas del segmento antes de fijar los precios.
5. **Solo con resultados positivos:** abrir el registro de nuevas empresas y el cobro por suscripción.
