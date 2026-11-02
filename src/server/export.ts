import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
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
