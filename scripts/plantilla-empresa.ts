/**
 * Genera docs/plantilla-datos-empresa.xlsx: la plantilla que llena el empresario
 * para activar su empresa (sedes, turnos, empleados, horarios, novedades).
 * Las columnas coinciden con los campos que exige Nexora. Uso: npx tsx scripts/plantilla-empresa.ts
 */
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
wb.creator = "Nexora";
const BLUE = "FF2546B8";
const EXAMPLE = "FFF1F3F9";

type Col = { header: string; width: number; note?: string; list?: string[] };

function sheet(name: string, intro: string, cols: Col[], example: (string | number)[], rows = 40) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 3 }] });
  ws.mergeCells(1, 1, 1, cols.length);
  ws.getCell(1, 1).value = intro;
  ws.getCell(1, 1).font = { italic: true, color: { argb: "FF555555" } };
  ws.getCell(1, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(1).height = 46;
  const head = ws.getRow(3);
  cols.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { wrapText: true, vertical: "middle" };
    if (c.note) cell.note = c.note;
    ws.getColumn(i + 1).width = c.width;
  });
  head.height = 34;
  // Fila de ejemplo (gris): se puede borrar o sobrescribir.
  const ex = ws.getRow(4);
  example.forEach((v, i) => {
    const cell = ex.getCell(i + 1);
    cell.value = v;
    cell.font = { italic: true, color: { argb: "FF777777" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXAMPLE } };
  });
  ws.getRow(2).getCell(1).value = "La fila gris es un EJEMPLO: escriba encima o bórrela. Una fila por registro.";
  ws.getRow(2).getCell(1).font = { size: 9, color: { argb: "FF999999" } };
  cols.forEach((c, i) => {
    if (!c.list) return;
    for (let r = 4; r <= 4 + rows; r++) {
      ws.getCell(r, i + 1).dataValidation = { type: "list", allowBlank: true, formulae: [`"${c.list.join(",")}"`], showErrorMessage: true, errorTitle: "Valor no válido", error: `Elija: ${c.list.join(", ")}` };
    }
  });
  return ws;
}

// ── Instrucciones ──
const info = wb.addWorksheet("Instrucciones");
info.getColumn(1).width = 110;
[
  ["Nexora · datos para activar la empresa", { bold: true, size: 16, color: { argb: BLUE } }],
  [""],
  ["1. Complete las hojas en orden: Empresa → Sedes → Turnos → Empleados → Horarios → Novedades."],
  ["2. La fila gris de cada hoja es un ejemplo. Escriba encima o bórrela."],
  ["3. Donde hay una flecha en la celda, elija de la lista."],
  ["4. Fechas en formato AAAA-MM-DD (ej.: 2026-11-15). Horas en formato 24 h HH:MM (ej.: 05:00, 14:30, 22:00)."],
  ["5. Los nombres de sede y de turno deben escribirse igual en todas las hojas."],
  ["6. Si no sabe un dato marcado como opcional, déjelo vacío. Las dudas legales (ARL, exoneración) las resuelve su contador."],
  [""],
  ["Este archivo tiene datos personales y salarios: envíelo por un canal privado (correo directo), no por grupos."],
].forEach(([t, font], i) => {
  const c = info.getCell(i + 1, 1);
  c.value = t as string;
  c.font = (font as Partial<ExcelJS.Font>) ?? {};
  c.alignment = { wrapText: true };
});

const SI_NO = ["Sí", "No", "No sé"];

// ── Empresa ──
const emp = wb.addWorksheet("Empresa");
emp.getColumn(1).width = 58;
emp.getColumn(2).width = 48;
emp.getColumn(3).width = 50;
const hdr = emp.getRow(1);
["Pregunta", "Respuesta", "Ejemplo / ayuda"].forEach((h, i) => {
  const c = hdr.getCell(i + 1);
  c.value = h;
  c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
});
const qs: [string, string, string[]?][] = [
  ["Nombre comercial (obligatorio)", "Panadería El Trigal"],
  ["Razón social", "El Trigal S.A.S."],
  ["NIT", "900.123.456-7"],
  ["Administrador: nombre completo (obligatorio)", "María Fernanda Ruiz"],
  ["Administrador: correo (obligatorio, será su usuario)", "maria@eltrigal.com"],
  ["Otro administrador o encargado: nombre y correo", "Opcional"],
  ["¿Es persona jurídica declarante de renta (o persona natural con 2+ empleados)?", "Para la exoneración del art. 114-1 E.T. Pregunte al contador", SI_NO],
  ["Fecha de inicio del piloto", "2026-11-15"],
  ["Tolerancia de llegada tarde (minutos)", "5"],
  ["¿Las horas extra se autorizan antes? ¿Quién las autoriza?", "Sí, el administrador de cada sede"],
  ["Almuerzo: ¿descanso fijo que no se marca, o salen y marcan salida/entrada?", "Descanso fijo", ["Descanso fijo", "Marcan salida y entrada"]],
  ["¿Quién aprueba permisos y vacaciones?", "La administradora"],
  ["¿Se exige que cada empleado marque solo desde su propio celular?", "Recomendado: Sí", SI_NO],
  ["Pago de nómina: frecuencia y día", "Quincenal, días 15 y 30"],
  ["Contador: nombre, correo y teléfono", ""],
  ["Abogado o asesor para la autorización de datos (Ley 1581)", "Opcional"],
  ["Dominio propio deseado (ej.: asistencia.miempresa.com)", "Debe estar antes de imprimir los QR definitivos"],
];
qs.forEach(([q, help, list], i) => {
  const r = emp.getRow(i + 2);
  r.getCell(1).value = q;
  r.getCell(3).value = help;
  r.getCell(3).font = { italic: true, color: { argb: "FF777777" } };
  r.getCell(1).alignment = { wrapText: true };
  r.getCell(3).alignment = { wrapText: true };
  if (list) r.getCell(2).dataValidation = { type: "list", allowBlank: true, formulae: [`"${list.join(",")}"`] };
  // Celda de respuesta resaltada: ahí se escribe.
  r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8DB" } };
  r.getCell(2).border = { bottom: { style: "hair", color: { argb: "FFCCCCCC" } } };
  r.getCell(2).alignment = { wrapText: true };
});

// ── Sedes ──
sheet(
  "Sedes",
  "Una fila por sede. Coordenadas: en Google Maps, de pie en la entrada donde irá el QR, mantenga presionado el punto azul y copie los dos números. Si prefiere, deje las coordenadas vacías y las tomamos con el celular en la sede.",
  [
    { header: "Nombre de la sede (obligatorio)", width: 24 },
    { header: "Dirección (obligatorio)", width: 28 },
    { header: "Ciudad (obligatorio)", width: 16 },
    { header: "Latitud", width: 12, note: "Ej.: 4.1420" },
    { header: "Longitud", width: 12, note: "Ej.: -73.6266" },
    { header: "Radio permitido (m)", width: 12, note: "Por defecto 80" },
    { header: "Abre (HH:MM)", width: 10 },
    { header: "Cierra (HH:MM)", width: 10 },
    { header: "Días que abre", width: 22, note: "Ej.: lunes a sábado" },
    { header: "¿Centro comercial, sótano o mala señal?", width: 16, list: SI_NO },
    { header: "Observaciones", width: 30 },
  ],
  ["Centro", "Cl. 38 # 31-20", "Villavicencio", 4.142, -73.6266, 80, "05:00", "20:00", "lunes a sábado", "No", ""],
);

// ── Turnos ──
sheet(
  "Turnos",
  "Los turnos que usa la empresa. Si la hora de fin es menor que la de inicio, el turno termina al día siguiente (ej.: 22:00 a 06:00).",
  [
    { header: "Nombre del turno (obligatorio)", width: 24 },
    { header: "Inicio (HH:MM)", width: 12 },
    { header: "Fin (HH:MM)", width: 12 },
    { header: "Descanso (minutos)", width: 12 },
    { header: "¿Descanso pagado?", width: 12, list: ["Sí", "No"] },
  ],
  ["Madrugada", "04:00", "12:30", 30, "No"],
);

// ── Empleados ──
sheet(
  "Empleados",
  "Una fila por empleado. El correo es su usuario para ingresar (si no tiene, cree uno gratuito). El salario es el mensual, sin auxilio de transporte.",
  [
    { header: "Nombres (obligatorio)", width: 16 },
    { header: "Apellidos (obligatorio)", width: 18 },
    { header: "Tipo de documento", width: 12, list: ["CC", "CE", "PPT", "PASAPORTE", "TI"] },
    { header: "Número de documento", width: 16 },
    { header: "Correo (obligatorio)", width: 26 },
    { header: "Celular", width: 14 },
    { header: "Cargo", width: 16 },
    { header: "Sede habitual", width: 16, note: "Igual que en la hoja Sedes" },
    { header: "Fecha de ingreso (AAAA-MM-DD)", width: 14 },
    { header: "Tipo de contrato", width: 18, list: ["Indefinido", "Fijo", "Obra o labor", "Aprendizaje", "Prestación de servicios"] },
    { header: "Inicio del contrato actual", width: 14 },
    { header: "Fin del contrato (si es fijo)", width: 14 },
    { header: "Salario mensual (COP)", width: 14 },
    { header: "Tipo de salario", width: 12, list: ["Ordinario", "Integral"] },
    { header: "Horas semanales pactadas", width: 12, note: "Máximo legal 42 h desde el 15-jul-2026" },
    { header: "Frecuencia de pago", width: 12, list: ["Quincenal", "Mensual"] },
    { header: "Clase de riesgo ARL", width: 10, list: ["I", "II", "III", "IV", "V"] },
    { header: "Tarifa ARL de la póliza (%) si la conoce", width: 12 },
    { header: "Celular para marcar", width: 14, list: ["Propio", "De la empresa", "No tiene"] },
    { header: "Tipo de celular", width: 12, list: ["iPhone", "Android", "Otro"] },
  ],
  ["Juan", "Pérez Castro", "CC", "1020304050", "juan.perez@gmail.com", "3001234567", "Panadero", "Centro", "2025-02-03", "Indefinido", "2025-02-03", "", 1900000, "Ordinario", 42, "Quincenal", "I", "", "Propio", "Android"],
);

// ── Horarios ──
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
sheet(
  "Horarios",
  "Qué turno hace cada empleado cada día. Escriba el nombre del turno (igual que en la hoja Turnos) o «Descanso». Turno partido: «Mañana + Tarde». Si rota cada semana, llene también la Semana 2; si no, déjela vacía.",
  [
    { header: "Empleado (nombres y apellidos)", width: 24 },
    { header: "Sede donde trabaja", width: 16 },
    ...days.map((d) => ({ header: `Semana 1 ${d}`, width: 12 })),
    ...days.map((d) => ({ header: `Semana 2 ${d}`, width: 12 })),
  ],
  ["Juan Pérez Castro", "Centro", "Madrugada", "Madrugada", "Madrugada", "Madrugada", "Madrugada", "Descanso", "Descanso"],
);

// ── Novedades ──
sheet(
  "Novedades",
  "Solo si hoy hay empleados en vacaciones, incapacidad o licencia, o con fechas ya aprobadas.",
  [
    { header: "Empleado", width: 24 },
    { header: "Tipo", width: 26, list: ["Vacaciones", "Incapacidad general", "Incapacidad laboral", "Licencia de maternidad", "Licencia de paternidad", "Licencia remunerada", "Licencia no remunerada", "Licencia de luto", "Calamidad doméstica", "Permiso"] },
    { header: "Desde (AAAA-MM-DD)", width: 14 },
    { header: "Hasta (AAAA-MM-DD)", width: 14 },
    { header: "Observaciones", width: 30 },
  ],
  ["Laura Gómez Ríos", "Vacaciones", "2026-11-20", "2026-12-04", ""],
);

// Impresión: horizontal y a una página de ancho.
for (const ws of wb.worksheets) ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 1 as ExcelJS.PaperSize };

wb.xlsx.writeFile("docs/plantilla-datos-empresa.xlsx").then(() => console.log("docs/plantilla-datos-empresa.xlsx"));
