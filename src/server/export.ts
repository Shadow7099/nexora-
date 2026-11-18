import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import type { Payslips } from "@/server/payroll";
import type { SaleDetail } from "@/server/sales";
import { displayCell, formatDateTime, formatIsoDate, type ColumnKind, type ReportTable } from "@/lib/report-table";

/**
 * Exportación de reportes a Excel y PDF. Ambos parten de la misma tabla que se
 * ve en pantalla (src/lib/report-table.ts): mismos números en todos los formatos.
 * Cada archivo lleva empresa, NIT, período, filtros y fecha de generación.
 */

const header = (t: ReportTable) => [
  t.meta.companyName + (t.meta.nit ? ` · NIT ${t.meta.nit}` : ""),
  `Período: ${formatIsoDate(t.meta.from)} a ${formatIsoDate(t.meta.to)}${t.meta.filters.length ? ` · ${t.meta.filters.join(" · ")}` : ""}`,
  `Generado el ${formatDateTime(t.meta.generatedAt, t.meta.timeZone)} con Nexora`,
];

const numFmt: Partial<Record<ColumnKind, string>> = { int: "#,##0", hours: "#,##0.00", money: '"$" #,##0', percent: '0.0"%"' };

export async function toXlsx(t: ReportTable): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nexora";
  wb.created = t.meta.generatedAt;
  const ws = wb.addWorksheet(t.title.slice(0, 31), { views: [{ state: "frozen", ySplit: 5 }] });
  ws.addRow([t.title]).font = { bold: true, size: 14 };
  for (const line of header(t)) ws.addRow([line]).font = { color: { argb: "FF555555" } };
  const head = ws.addRow(t.columns.map((c) => c.label));
  head.font = { bold: true };
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECF8" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF9AA5C4" } } };
  });
  for (const r of t.rows) ws.addRow(t.columns.map((c) => r[c.key] ?? null));
  if (Object.keys(t.totals).length) {
    const tr = ws.addRow(t.columns.map((c, i) => (i === 0 ? "Total" : c.key in t.totals ? t.totals[c.key]! : null)));
    tr.font = { bold: true };
    tr.eachCell((cell) => (cell.border = { top: { style: "thin" } }));
  }
  for (const n of t.notes) ws.addRow([n]).font = { italic: true, color: { argb: "FF666666" } };
  t.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (numFmt[c.kind]) col.numFmt = numFmt[c.kind]!;
    const longest = Math.max(c.label.length, ...t.rows.slice(0, 500).map((r) => String(r[c.key] ?? "").length));
    col.width = Math.min(60, Math.max(10, longest + 2));
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toPdf(t: ReportTable): Buffer {
  const doc = new jsPDF({ orientation: t.columns.length > 6 ? "landscape" : "portrait", unit: "pt", format: "letter" });
  const margin = 36;
  doc.setFont("helvetica", "bold").setFontSize(15).text(t.title, margin, margin + 6);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  header(t).forEach((line, i) => doc.text(line, margin, margin + 24 + i * 12));
  doc.setTextColor(0);
  const numeric = (k: ColumnKind) => ["int", "hours", "money", "percent"].includes(k);
  const body = t.rows.map((r) => t.columns.map((c) => displayCell(r[c.key] ?? null, c.kind)));
  const foot = Object.keys(t.totals).length ? [t.columns.map((c, i) => (i === 0 ? "Total" : c.key in t.totals ? displayCell(t.totals[c.key]!, c.kind) : ""))] : undefined;
  autoTable(doc, {
    startY: margin + 66,
    margin: { left: margin, right: margin },
    head: [t.columns.map((c) => c.label)],
    body: body.length ? body : [[{ content: "Sin datos para el período y los filtros elegidos.", colSpan: t.columns.length }]],
    foot,
    showFoot: "lastPage",
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [37, 70, 184], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [232, 236, 248], textColor: 20, fontStyle: "bold" },
    columnStyles: Object.fromEntries(t.columns.map((c, i) => [i, numeric(c.kind) ? { halign: "right" as const } : {}])),
    didDrawPage: () => {
      const pages = doc.getNumberOfPages();
      doc.setFontSize(8).setTextColor(120);
      doc.text(`${t.meta.companyName} · ${t.title} · página ${pages}`, margin, doc.internal.pageSize.getHeight() - 16);
      doc.setTextColor(0);
    },
  });
  if (t.notes.length) {
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    doc.setFontSize(8).setTextColor(90);
    doc.text(doc.splitTextToSize(t.notes.join("  "), doc.internal.pageSize.getWidth() - margin * 2), margin, y);
  }
  return Buffer.from(doc.output("arraybuffer"));
}

// ───────────────────────── Comprobantes de pago ─────────────────────────

const money = (n: number) => `$ ${Math.round(n).toLocaleString("es-CO")}`;
const qty = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 2 });

/**
 * Comprobantes de pago (desprendibles) de un período: una página por empleado,
 * solo devengados y deducciones. Si el período no está cerrado se marca como
 * BORRADOR. Siempre aclara que es una estimación que revisa el contador.
 */
export function toPayslipPdf(p: Payslips, generatedAt: Date): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const margin = 40;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const draft = p.period.status !== "CLOSED";
  const periodText = `${p.period.frequency === "QUINCENAL" ? "Quincena" : "Mes"} del ${formatIsoDate(p.period.start)} al ${formatIsoDate(p.period.end)}`;

  if (p.slips.length === 0) {
    doc.setFont("helvetica", "normal").setFontSize(12).text("No hay empleados calculados en este período.", margin, margin + 20);
  }
  p.slips.forEach((s, i) => {
    if (i > 0) doc.addPage();
    if (draft) {
      doc.setTextColor(225).setFont("helvetica", "bold").setFontSize(72);
      doc.text("BORRADOR", width / 2, height / 2, { align: "center", angle: 35 });
      doc.setTextColor(0);
    }
    doc.setFont("helvetica", "bold").setFontSize(15).text("Comprobante de pago de nómina", margin, margin + 6);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
    doc.text(`${p.company.name}${p.company.nit ? ` · NIT ${p.company.nit}` : ""}`, margin, margin + 24);
    doc.text(`${periodText} · ${draft ? "período sin cerrar" : "período cerrado"}`, margin, margin + 36);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: margin + 52,
      margin: { left: margin, right: margin },
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2 },
      body: [
        [{ content: "Empleado", styles: { fontStyle: "bold" } }, `${s.employee.firstName} ${s.employee.lastName}`, { content: "Documento", styles: { fontStyle: "bold" } }, `${s.employee.documentType} ${s.employee.documentNumber}`],
        [{ content: "Cargo", styles: { fontStyle: "bold" } }, s.employee.position, { content: "Días pagados", styles: { fontStyle: "bold" } }, s.paidDays == null ? "—" : String(s.paidDays)],
      ],
    });

    const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      head: [["Concepto", "Cantidad", "Devengado", "Deducción"]],
      body: s.lines.map((l) => [
        l.label,
        l.kind === "DEDUCCION" ? "" : l.concept === "SALARIO_BASICO" || l.concept === "AUX_TRANSPORTE" ? `${qty(l.quantity)} días` : `${qty(l.quantity)} h`,
        l.kind === "DEVENGADO" ? money(l.amount) : "",
        l.kind === "DEDUCCION" ? money(l.amount) : "",
      ]),
      foot: [
        ["Totales", "", money(s.gross), money(s.deductions)],
        [{ content: "Neto a pagar", styles: { fontSize: 11 } }, "", "", { content: money(s.net), styles: { fontSize: 11 } }],
      ],
      showFoot: "lastPage",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [37, 70, 184], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [232, 236, 248], textColor: 20, fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    });

    let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 56;
    doc.setDrawColor(150);
    doc.line(margin, y, margin + 200, y);
    doc.line(width - margin - 200, y, width - margin, y);
    doc.setFontSize(8).setTextColor(90);
    doc.text("Firma del empleador", margin, y + 12);
    doc.text("Recibí conforme (firma del trabajador)", width - margin - 200, y + 12);
    y += 36;
    const note =
      "Valores estimados por Nexora con las jornadas, horas extra aprobadas, novedades y parámetros legales vigentes. " +
      "No incluye retención en la fuente, embargos, libranzas ni otros descuentos. No es nómina electrónica ante la DIAN; " +
      "debe revisarlo el contador o responsable de nómina antes de pagar.";
    doc.text(doc.splitTextToSize(note, width - margin * 2), margin, y);
    doc.text(`Generado el ${formatDateTime(generatedAt, p.company.timeZone)} con Nexora · ${i + 1} de ${p.slips.length}`, margin, height - 20);
    doc.setTextColor(0);
  });
  return Buffer.from(doc.output("arraybuffer"));
}

// ───────────────────────── Comprobante de venta ─────────────────────────

const METHOD_TEXT: Record<string, string> = { CASH: "Efectivo", TRANSFER: "Transferencia", CARD: "Tarjeta", OTHER: "Otro" };

/**
 * Comprobante de una venta (media carta). Es un soporte interno: la factura
 * electrónica ante la DIAN la emite el facturador conectado (Siigo o Alegra).
 */
export function toSalePdf(s: SaleDetail, generatedAt: Date): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const margin = 40;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  if (s.status === "VOIDED") {
    doc.setTextColor(230, 200, 200).setFont("helvetica", "bold").setFontSize(80);
    doc.text("ANULADA", width / 2, height / 2, { align: "center", angle: 35 });
    doc.setTextColor(0);
  }
  doc.setFont("helvetica", "bold").setFontSize(15).text(s.company.name, margin, margin + 6);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(90);
  const head = [s.company.nit ? `NIT ${s.company.nit}` : null, `${s.site.name} · ${s.site.address}, ${s.site.city}`].filter(Boolean) as string[];
  head.forEach((l, i) => doc.text(l, margin, margin + 22 + i * 12));
  doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(13).text(`Comprobante de venta ${s.label}`, width - margin, margin + 6, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).text(formatDateTime(s.createdAt, s.company.timeZone), width - margin, margin + 22, { align: "right" });

  autoTable(doc, {
    startY: margin + 52,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      [{ content: "Cliente", styles: { fontStyle: "bold" } }, s.customer.name, { content: "Documento", styles: { fontStyle: "bold" } }, s.customer.doc ?? "—"],
      [{ content: "Medio de pago", styles: { fontStyle: "bold" } }, METHOD_TEXT[s.paymentMethod] ?? s.paymentMethod, { content: "Atendió", styles: { fontStyle: "bold" } }, s.by],
    ],
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Código", "Producto", "Cant.", "Precio", "Desc.", "IVA", "Total"]],
    body: s.items.map((i) => [i.sku, i.name, i.quantity.toLocaleString("es-CO"), money(i.unitPrice), i.discount ? money(i.discount) : "", `${i.taxRate.toLocaleString("es-CO")} %`, money(i.total)]),
    foot: [
      [{ content: "Subtotal", colSpan: 6 }, money(s.subtotal)],
      [{ content: "IVA", colSpan: 6 }, money(s.taxTotal)],
      [{ content: "Total", colSpan: 6, styles: { fontSize: 11 } }, { content: money(s.total), styles: { fontSize: 11 } }],
    ],
    showFoot: "lastPage",
    styles: { fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [37, 70, 184], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [232, 236, 248], textColor: 20, fontStyle: "bold", halign: "right" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
  });
  let end = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFontSize(8).setTextColor(90);
  if (s.notes) {
    doc.text(doc.splitTextToSize(`Nota: ${s.notes}`, width - margin * 2), margin, end);
    end += 14;
  }
  if (s.voided) {
    doc.setTextColor(180, 30, 30).text(doc.splitTextToSize(`Venta anulada el ${formatDateTime(s.voided.at, s.company.timeZone)} por ${s.voided.by}: ${s.voided.reason}`, width - margin * 2), margin, end);
    doc.setTextColor(90);
    end += 14;
  }
  doc.text(doc.splitTextToSize("Comprobante interno de venta generado con Nexora. No reemplaza la factura electrónica ante la DIAN, que se emite con el facturador de la empresa.", width - margin * 2), margin, end);
  doc.text(`Generado el ${formatDateTime(generatedAt, s.company.timeZone)}`, margin, height - 20);
  return Buffer.from(doc.output("arraybuffer"));
}
