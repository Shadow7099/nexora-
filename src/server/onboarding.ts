import "server-only";
import { db } from "@/lib/db";
import { requireCompanyAdmin } from "@/server/authz";
import type { Actor } from "@/server/sessions";

/**
 * «Primeros pasos»: lo que le falta a una empresa para empezar a marcar
 * asistencia, calculado desde sus datos reales (nada se marca a mano).
 */
export type SetupStep = { key: string; title: string; text: string; href: string; cta: string; done: boolean; detail?: string };

export async function setupProgress(actor: Actor) {
  const companyId = requireCompanyAdmin(actor);
  const [settingsSaved, sites, templates, employees, withoutSchedule, qrPunches, firstSite] = await Promise.all([
    db.auditLog.count({ where: { companyId, action: "company.settings_update" } }),
    db.site.count({ where: { companyId, active: true } }),
    db.shiftTemplate.count({ where: { companyId, active: true } }),
    db.employee.count({ where: { companyId, status: "ACTIVE" } }),
    db.employee.count({ where: { companyId, status: "ACTIVE", patterns: { none: {} } } }),
    db.attendanceEvent.count({ where: { companyId, source: "QR" } }),
    db.site.findFirst({ where: { companyId, active: true }, orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);

  const steps: SetupStep[] = [
    {
      key: "settings", title: "Revisa las reglas de tu empresa", href: "/admin/configuracion", cta: "Abrir configuración", done: settingsSaved > 0,
      text: "Tolerancia de llegada tarde, precisión del GPS, si cada empleado marca solo desde su celular y la exoneración del art. 114-1 (pregúntale a tu contador).",
    },
    {
      key: "sites", title: "Crea tus sedes", href: "/admin/sedes/nueva", cta: "Nueva sede", done: sites > 0, detail: sites ? `${sites} sede(s)` : undefined,
      text: "Una por cada lugar donde se marca. Estando en la entrada, usa «Usar mi ubicación actual» para guardar las coordenadas exactas.",
    },
    {
      key: "templates", title: "Define tus turnos", href: "/admin/horarios", cta: "Ir a horarios", done: templates > 0, detail: templates ? `${templates} turno(s)` : undefined,
      text: "Hora de inicio, fin y descanso de cada turno (madrugada, mañana, tarde, noche…). Si termina después de medianoche, Nexora lo entiende.",
    },
    {
      key: "employees", title: "Agrega a tus empleados", href: "/admin/empleados/nuevo", cta: "Nuevo empleado", done: employees > 0, detail: employees ? `${employees} empleado(s)` : undefined,
      text: "Datos, sede y contrato (salario, horas semanales, ARL). Nexora te muestra una contraseña temporal para entregarle a cada uno.",
    },
    {
      key: "schedules", title: "Asigna el horario de cada empleado", href: "/admin/horarios", cta: "Asignar horarios",
      done: employees > 0 && withoutSchedule === 0,
      detail: employees > 0 && withoutSchedule > 0 ? `${withoutSchedule} empleado(s) sin horario` : undefined,
      text: "Qué turno hace cada día y qué días descansa. Sirve para detectar llegadas tarde, ausencias y horas extra.",
    },
    {
      key: "qr", title: "Imprime el QR y haz una marcación de prueba", href: firstSite ? `/imprimir/qr/${firstSite.id}` : "/admin/sedes", cta: "Imprimir QR", done: qrPunches > 0,
      text: "Pega el QR en la entrada de cada sede. Luego un empleado lo escanea con su celular, vincula el celular, activa la huella y registra su entrada.",
    },
  ];
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}
