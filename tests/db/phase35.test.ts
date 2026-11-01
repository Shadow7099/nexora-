/**
 * Fase 3 (sedes, QR, plantillas, horarios, cambios puntuales) y fase 5
 * (horas extra, novedades, correcciones). Prueba obligatoria 3 (turnos
 * nocturnos y partidos) y la regla fundamental: rechazar horas extra no
 * borra el tiempo registrado.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { shiftsOn } from "@/lib/schedule";
import { punch } from "@/server/attendance";
import { addManualSession, closeSessionManually } from "@/server/corrections";
import { bindDevice } from "@/server/devices";
import { AppError } from "@/server/errors";
import { cancelNovelty, decideNovelty, listNovelties, myNovelties, registerNovelty, requestNovelty } from "@/server/novelties";
import { decideOvertime, detectOvertime, listOvertime, myOvertime } from "@/server/overtime";
import { loadOverrides, loadPatterns } from "@/server/schedule-data";
import { clearOverride, getEmployeeSchedule, saveTemplate, setOverride, setPattern } from "@/server/schedules";
import { createSite, rotateQr, setSiteActive, updateSite } from "@/server/sites";
import { login, makeCompany } from "../support/fixtures";

const rp = { rpID: "localhost", origin: "http://localhost:3000" };
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};
const siteInput = (over: Record<string, unknown> = {}) => ({
  name: `Sede ${randomUUID().slice(0, 6)}`, address: "Cl. 1 # 2-3", city: "Villavicencio", latitude: "4.15", longitude: "-73.63", radiusMeters: "90",
  opens: "06:00", closes: "20:00", days: [1, 2, 3, 4, 5, 6], ...over,
});

async function setup(tag: string) {
  const f = await makeCompany(tag); // turno L–V 8:00–17:00 (descanso 60) en la sede del fixture
  const admin = await login(f.admin.email);
  const emp = await login(f.empUser.email);
  const qr = await db.siteQrCode.create({ data: { companyId: f.company.id, siteId: f.site.id, publicCode: `qr${randomUUID().replace(/-/g, "").slice(0, 16)}`, version: 1 } });
  const device = await bindDevice(emp.actor);
  const doPunch = (iso: string) =>
    punch(emp.actor, { publicCode: qr.publicCode, idempotencyKey: randomUUID(), position: { lat: 4.14, lng: -73.62, accuracy: 10 } }, { deviceToken: device.token, rp, now: new Date(iso) });
  return { ...f, admin, emp, qr, doPunch };
}

describe("fase 3 · sedes y QR", () => {
  it("crea una sede con su QR y horario (incluye cierre al día siguiente)", async () => {
    const s = await setup("s3a");
    const site = await createSite(s.admin.actor, siteInput({ opens: "22:00", closes: "06:00", days: [1, 2, 3] }));
    const hours = await db.siteOpeningHours.findMany({ where: { siteId: site.id } });
    expect(hours.map((h) => [h.weekday, h.opensMin, h.closesMin])).toEqual([[1, 1320, 1800], [2, 1320, 1800], [3, 1320, 1800]]);
    expect(await db.siteQrCode.count({ where: { siteId: site.id, revokedAt: null } })).toBe(1);
  });

  it("valida los campos y el nombre único por empresa", async () => {
    const s = await setup("s3b");
    await expect(createSite(s.admin.actor, siteInput({ radiusMeters: "3", latitude: "200" }))).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { radiusMeters: expect.any(String) } });
    await expect(createSite(s.admin.actor, siteInput({ name: s.site.name }))).rejects.toMatchObject({ code: "CONFLICT", fieldErrors: { name: expect.any(String) } });
  });

  it("rotar el QR invalida el anterior al instante", async () => {
    const s = await setup("s3c");
    const before = await s.doPunch("2026-10-27T12:55:00Z");
    expect(before.ok).toBe(true);
    const next = await rotateQr(s.admin.actor, s.site.id);
    expect(next.version).toBe(2);
    expect(await s.doPunch("2026-10-27T22:00:00Z")).toMatchObject({ ok: false, reason: "QR_REVOKED" });
  });

  it("edita y desactiva; otra empresa no puede tocar la sede", async () => {
    const a = await setup("s3d");
    const b = await setup("s3e");
    await updateSite(a.admin.actor, a.site.id, siteInput({ name: "Sede renombrada" }));
    expect((await db.site.findUniqueOrThrow({ where: { id: a.site.id } })).name).toBe("Sede renombrada");
    await setSiteActive(a.admin.actor, a.site.id, false);
    expect(await a.doPunch("2026-10-27T12:55:00Z")).toMatchObject({ ok: false, reason: "INVALID_QR" });
    expect(await code(updateSite(b.admin.actor, a.site.id, siteInput()))).toBe("NOT_FOUND");
    expect(await code(rotateQr(b.admin.actor, a.site.id))).toBe("NOT_FOUND");
    expect(await code(createSite(a.emp.actor, siteInput()))).toBe("FORBIDDEN");
  });
});

describe("fase 3 · plantillas y horarios", () => {
  it("una plantilla que cruza la medianoche termina al día siguiente", async () => {
    const s = await setup("h3a");
    const t = await saveTemplate(s.admin.actor, null, { name: "Noche", start: "22:00", end: "06:00", breakMinutes: "30" });
    expect([t.startMin, t.endMin]).toEqual([1320, 1800]);
    await expect(saveTemplate(s.admin.actor, null, { name: "Mal", start: "08:00", end: "09:00", breakMinutes: "90" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("un nuevo patrón aplica desde su fecha y no cambia el pasado (nocturno y partido)", async () => {
    const s = await setup("h3b");
    const night = await saveTemplate(s.admin.actor, null, { name: "Noche", start: "22:00", end: "06:00", breakMinutes: "30" });
    const am = await saveTemplate(s.admin.actor, null, { name: "Mañana", start: "07:00", end: "11:00", breakMinutes: "0" });
    const pm = await saveTemplate(s.admin.actor, null, { name: "Tarde", start: "15:00", end: "19:00", breakMinutes: "0" });
    // Desde el lunes 2 nov: lunes nocturno; martes partido.
    await setPattern(s.admin.actor, s.employee.id, {
      cycleDays: 7, effectiveFrom: "2026-11-02",
      days: [{ dayIndex: 0, templateId: night.id, siteId: s.site.id }, { dayIndex: 1, templateId: am.id, siteId: s.site.id }, { dayIndex: 1, templateId: pm.id, siteId: s.site.id }],
    });
    const p = (await loadPatterns(s.company.id, [s.employee.id])).get(s.employee.id)!;
    expect(shiftsOn(p, "2026-10-27")[0]).toMatchObject({ templateName: "Diurno" }); // antes: sigue el horario anterior
    const mon = shiftsOn(p, "2026-11-02");
    expect(mon[0]).toMatchObject({ templateName: "Noche", endMin: 1800 });
    expect(mon[0]!.end.toISOString()).toBe("2026-11-03T11:00:00.000Z"); // 6 a. m. del martes
    expect(shiftsOn(p, "2026-11-03").map((x) => x.templateName)).toEqual(["Mañana", "Tarde"]);
    expect(shiftsOn(p, "2026-11-04")).toEqual([]);
    const sched = await getEmployeeSchedule(s.admin.actor, s.employee.id);
    expect(sched.patterns.map((x) => [x.effectiveFrom.toISOString().slice(0, 10), x.effectiveTo?.toISOString().slice(0, 10) ?? null])).toEqual([
      ["2026-11-02", null],
      ["2026-10-05", "2026-11-01"],
    ]);
  });

  it("rechaza plantillas o sedes de otra empresa en el patrón", async () => {
    const a = await setup("h3c");
    const b = await setup("h3d");
    const t = await saveTemplate(b.admin.actor, null, { name: "Ajena", start: "08:00", end: "12:00", breakMinutes: "0" });
    expect(await code(setPattern(a.admin.actor, a.employee.id, { cycleDays: 7, effectiveFrom: "2026-11-02", days: [{ dayIndex: 0, templateId: t.id, siteId: a.site.id }] }))).toBe("VALIDATION");
    expect(await code(setPattern(b.admin.actor, a.employee.id, { cycleDays: 7, effectiveFrom: "2026-11-02", days: [] }))).toBe("NOT_FOUND");
  });

  it("cambio puntual: otro turno o descanso en una fecha, y quitarlo vuelve al patrón", async () => {
    const s = await setup("h3e");
    const t = await saveTemplate(s.admin.actor, null, { name: "Tarde", start: "13:00", end: "21:00", breakMinutes: "30" });
    await setOverride(s.admin.actor, s.employee.id, { kind: "shift", date: "2026-10-27", templateId: t.id, siteId: s.site.id });
    await setOverride(s.admin.actor, s.employee.id, { kind: "rest", date: "2026-10-28" });
    const p = (await loadPatterns(s.company.id, [s.employee.id])).get(s.employee.id)!;
    const ov = (await loadOverrides(s.company.id, "2026-10-26", "2026-10-30", [s.employee.id])).get(s.employee.id)!;
    expect(shiftsOn(p, "2026-10-27", undefined, ov)[0]).toMatchObject({ templateName: "Tarde", startMin: 780 });
    expect(shiftsOn(p, "2026-10-28", undefined, ov)).toEqual([]);
    expect(shiftsOn(p, "2026-10-29", undefined, ov)[0]).toMatchObject({ templateName: "Diurno" });
    await clearOverride(s.admin.actor, s.employee.id, "2026-10-28");
    const ov2 = (await loadOverrides(s.company.id, "2026-10-26", "2026-10-30", [s.employee.id])).get(s.employee.id)!;
    expect(shiftsOn(p, "2026-10-28", undefined, ov2)[0]).toMatchObject({ templateName: "Diurno" });
  });
});

describe("fase 5 · horas extra", () => {
  it("se detectan al cerrar la jornada; rechazarlas NO cambia el tiempo registrado", async () => {
    const s = await setup("o5a"); // turno 8:00–17:00 = 540 min programados
    await s.doPunch("2026-10-27T12:58:00Z"); // 7:58 a. m.
    await s.doPunch("2026-10-27T23:28:00Z"); // 6:28 p. m.  → 630 min → 90 extra
    const [req] = await listOvertime(s.admin.actor);
    expect(req).toMatchObject({ detectedMinutes: 90, status: "PENDING" });
    expect(await code(decideOvertime(s.admin.actor, req!.id, { decision: "reject", note: "" }))).toBe("VALIDATION"); // motivo obligatorio
    await decideOvertime(s.admin.actor, req!.id, { decision: "reject", note: "No fue autorizada previamente" });
    const session = await db.workSession.findFirstOrThrow({ where: { employeeId: s.employee.id } });
    expect([session.startAt.toISOString(), session.endAt?.toISOString()]).toEqual(["2026-10-27T12:58:00.000Z", "2026-10-27T23:28:00.000Z"]);
    expect(await db.attendanceEvent.count({ where: { employeeId: s.employee.id } })).toBe(2);
    const after = await db.overtimeRequest.findUniqueOrThrow({ where: { id: req!.id } });
    expect(after).toMatchObject({ status: "REJECTED", detectedMinutes: 90, approvedMinutes: null, decidedById: s.admin.actor.userId });
    expect(await code(decideOvertime(s.admin.actor, req!.id, { decision: "approve", approvedMinutes: 90 }))).toBe("CONFLICT");
  });

  it("aprobación parcial: no puede superar lo detectado", async () => {
    const s = await setup("o5b");
    await s.doPunch("2026-10-27T13:00:00Z");
    await s.doPunch("2026-10-27T23:00:00Z"); // 600 min → 60 extra
    const [req] = await listOvertime(s.admin.actor);
    await expect(decideOvertime(s.admin.actor, req!.id, { decision: "approve", approvedMinutes: 61 })).rejects.toMatchObject({ code: "VALIDATION" });
    await decideOvertime(s.admin.actor, req!.id, { decision: "approve", approvedMinutes: 30, note: "Solo media hora autorizada" });
    expect(await myOvertime(s.emp.actor)).toEqual([expect.objectContaining({ detectedMinutes: 60, approvedMinutes: 30, status: "APPROVED" })]);
  });

  it("dentro del margen (< 15 min) no genera solicitud; en día de descanso, todo es extra", async () => {
    const s = await setup("o5c");
    await s.doPunch("2026-10-27T12:58:00Z");
    await s.doPunch("2026-10-27T22:08:00Z"); // 550 min → 10 extra (bajo el umbral)
    expect(await listOvertime(s.admin.actor)).toHaveLength(0);
    await s.doPunch("2026-10-31T14:00:00Z"); // sábado (descanso)
    await s.doPunch("2026-10-31T17:00:00Z"); // 180 min
    expect((await listOvertime(s.admin.actor))[0]).toMatchObject({ detectedMinutes: 180 });
  });

  it("un administrador de otra empresa no puede decidir; el empleado no ve las de otros", async () => {
    const a = await setup("o5d");
    const b = await setup("o5e");
    await a.doPunch("2026-10-27T13:00:00Z");
    await a.doPunch("2026-10-27T23:30:00Z");
    const [req] = await listOvertime(a.admin.actor);
    expect(await code(decideOvertime(b.admin.actor, req!.id, { decision: "approve", approvedMinutes: 10 }))).toBe("NOT_FOUND");
    expect(await myOvertime(b.emp.actor)).toHaveLength(0);
    expect(await code(listOvertime(a.emp.actor))).toBe("FORBIDDEN");
  });
});

describe("fase 5 · novedades", () => {
  it("el empleado solicita, el administrador aprueba; sin solapes; la asistencia la muestra", async () => {
    const s = await setup("n5a");
    const n = await requestNovelty(s.emp.actor, { type: "VACACIONES", startDate: "2026-11-09", endDate: "2026-11-13", note: "Viaje" });
    expect(n.status).toBe("PENDING");
    expect(await code(requestNovelty(s.emp.actor, { type: "PERMISO", startDate: "2026-11-10", endDate: "2026-11-10" }))).toBe("CONFLICT");
    expect(await code(requestNovelty(s.emp.actor, { type: "SUSPENSION", startDate: "2026-12-01", endDate: "2026-12-01" }))).toBe("VALIDATION");
    expect(await code(decideNovelty(s.admin.actor, n.id, "reject"))).toBe("VALIDATION");
    await decideNovelty(s.admin.actor, n.id, "approve");
    const { attendanceDay } = await import("@/server/attendance");
    const day = await attendanceDay(s.admin.actor, new Date("2026-11-10T16:00:00Z"));
    expect(day.rows[0]).toMatchObject({ status: "novelty", novelty: "Vacaciones" });
  });

  it("el administrador registra una novedad aprobada; el empleado retira solo las pendientes", async () => {
    const s = await setup("n5b");
    const reg = await registerNovelty(s.admin.actor, s.employee.id, { type: "INCAPACIDAD_COMUN", startDate: "2026-11-02", endDate: "2026-11-04" });
    expect(reg.status).toBe("APPROVED");
    const p = await requestNovelty(s.emp.actor, { type: "PERMISO", startDate: "2026-11-20", endDate: "2026-11-20", hours: "2" });
    await cancelNovelty(s.emp.actor, p.id);
    expect(await code(cancelNovelty(s.emp.actor, reg.id))).toBe("CONFLICT");
    expect((await myNovelties(s.emp.actor)).map((x) => x.status).sort()).toEqual(["APPROVED", "CANCELLED"]);
    expect(await code(requestNovelty(s.emp.actor, { type: "PERMISO", startDate: "2026-11-20", endDate: "2026-11-21", hours: "2" }))).toBe("VALIDATION");
  });

  it("aislamiento: otra empresa no ve ni decide", async () => {
    const a = await setup("n5c");
    const b = await setup("n5d");
    const n = await requestNovelty(a.emp.actor, { type: "PERMISO", startDate: "2026-11-25", endDate: "2026-11-25" });
    expect((await listNovelties(b.admin.actor)).some((x) => x.id === n.id)).toBe(false);
    expect(await code(decideNovelty(b.admin.actor, n.id, "approve"))).toBe("NOT_FOUND");
    expect(await code(registerNovelty(b.admin.actor, a.employee.id, { type: "PERMISO", startDate: "2026-11-26", endDate: "2026-11-26" }))).toBe("NOT_FOUND");
  });
});

describe("fase 5 · correcciones (sin borrar el tiempo real)", () => {
  it("registra la salida olvidada con motivo; la marcación original sigue intacta", async () => {
    const s = await setup("c5a");
    await s.doPunch("2026-10-27T12:55:00Z");
    await s.doPunch("2026-10-28T12:55:00Z"); // 24 h después: la anterior pasa a revisión
    const review = await db.workSession.findFirstOrThrow({ where: { employeeId: s.employee.id, status: "NEEDS_REVIEW" } });
    expect(await code(closeSessionManually(s.admin.actor, review.id, { endTime: "17:05", reason: "" }))).toBe("VALIDATION");
    await closeSessionManually(s.admin.actor, review.id, { endTime: "17:05", reason: "Olvidó marcar; confirmado con el supervisor" }, new Date("2026-10-28T13:00:00Z"));
    const closed = await db.workSession.findUniqueOrThrow({ where: { id: review.id }, include: { outEvent: true, inEvent: true } });
    expect(closed).toMatchObject({ status: "CLOSED" });
    expect(closed.endAt?.toISOString()).toBe("2026-10-27T22:05:00.000Z");
    expect(closed.outEvent).toMatchObject({ source: "ADMIN_MANUAL", createdById: s.admin.actor.userId, verification: "ADMIN" });
    expect(closed.inEvent).toMatchObject({ source: "QR", occurredAt: new Date("2026-10-27T12:55:00Z") });
  });

  it("agrega una jornada completa, sin solaparse con otra y no en el futuro", async () => {
    const s = await setup("c5b");
    const input = { date: "2026-10-26", startTime: "08:00", endTime: "19:00", siteId: s.site.id, reason: "Celular dañado, confirmado por el supervisor" };
    await addManualSession(s.admin.actor, s.employee.id, input, new Date("2026-10-27T00:00:00Z"));
    expect(await code(addManualSession(s.admin.actor, s.employee.id, { ...input, startTime: "09:00" }, new Date("2026-10-27T00:00:00Z")))).toBe("CONFLICT");
    expect(await code(addManualSession(s.admin.actor, s.employee.id, { ...input, date: "2026-12-01" }, new Date("2026-10-27T00:00:00Z")))).toBe("VALIDATION");
    // 11 h trabajadas contra 9 programadas → 120 min de extra detectados
    expect((await listOvertime(s.admin.actor))[0]).toMatchObject({ detectedMinutes: 120 });
    const b = await setup("c5c");
    expect(await code(addManualSession(b.admin.actor, s.employee.id, input))).toBe("NOT_FOUND");
  });

  it("detectOvertime es idempotente", async () => {
    const s = await setup("c5d");
    await s.doPunch("2026-10-27T13:00:00Z");
    await s.doPunch("2026-10-27T23:00:00Z");
    await detectOvertime(s.company.id, s.employee.id, "2026-10-27");
    await detectOvertime(s.company.id, s.employee.id, "2026-10-27");
    expect(await db.overtimeRequest.count({ where: { employeeId: s.employee.id } })).toBe(1);
  });
});
