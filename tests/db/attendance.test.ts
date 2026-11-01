/**
 * Fase 4: marcación con QR. Cubre las pruebas obligatorias 1, 2 y 4 del plan
 * (entrada y salida; sin segunda entrada con jornada abierta; ubicación fuera
 * del área rechazada) más dispositivo, QR, idempotencia y jornadas olvidadas.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { attendanceDay, employeeHistory, punch, STALE_SESSION_HOURS } from "@/server/attendance";
import { approveDevice, bindDevice, listDevices, revokeDevice } from "@/server/devices";
import { AppError } from "@/server/errors";
import { login, makeCompany } from "../support/fixtures";

const rp = { rpID: "localhost", origin: "http://localhost:3000" };
// La sede del fixture está en (4.14, -73.62) con radio de 80 m.
const at = (metersNorth: number, accuracy = 15) => ({ lat: 4.14 + metersNorth / 111_195, lng: -73.62, accuracy });
const t0 = new Date("2026-10-27T12:55:00Z"); // martes 7:55 a. m. en Bogotá
const plus = (min: number) => new Date(t0.getTime() + min * 60_000);

async function setup(tag: string, opts: { requireDevice?: boolean } = {}) {
  const f = await makeCompany(tag);
  if (opts.requireDevice === false) await db.company.update({ where: { id: f.company.id }, data: { requireDeviceBinding: false } });
  const qr = await db.siteQrCode.create({ data: { companyId: f.company.id, siteId: f.site.id, publicCode: `qr${randomUUID().replace(/-/g, "").slice(0, 16)}`, version: 1 } });
  const emp = await login(f.empUser.email);
  const admin = await login(f.admin.email);
  const device = await bindDevice(emp.actor, "Mozilla/5.0 (Linux; Android 14) Chrome/130");
  const doPunch = (o: { meters?: number; accuracy?: number; now?: Date; key?: string; token?: string | null; code?: string; position?: null } = {}) =>
    punch(
      emp.actor,
      {
        publicCode: o.code ?? qr.publicCode,
        idempotencyKey: o.key ?? randomUUID(),
        position: o.position === null ? null : at(o.meters ?? 10, o.accuracy ?? 15),
      },
      { deviceToken: o.token === null ? undefined : (o.token ?? device.token), rp, now: o.now ?? t0 },
    );
  return { ...f, qr, emp, admin, device, doPunch };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

describe("entrada y salida", () => {
  it("registra entrada y salida, abre y cierra la jornada con la hora del servidor", async () => {
    const s = await setup("p1");
    expect(s.device.status).toBe("ACTIVE"); // el primer celular queda activo
    const a = await s.doPunch();
    expect(a).toMatchObject({ ok: true, type: "IN", flagged: false });
    const b = await s.doPunch({ now: plus(9 * 60 + 5) });
    expect(b).toMatchObject({ ok: true, type: "OUT", workedMinutes: 545 });
    const sessions = await db.workSession.findMany({ where: { employeeId: s.employee.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ status: "CLOSED" });
    const events = await db.attendanceEvent.findMany({ where: { employeeId: s.employee.id }, orderBy: { occurredAt: "asc" } });
    expect(events.map((e) => [e.type, e.verification, e.geoStatus, e.distanceMeters])).toEqual([
      ["IN", "DEVICE_TOKEN", "INSIDE", 10],
      ["OUT", "DEVICE_TOKEN", "INSIDE", 10],
    ]);
  });

  it("no permite una segunda entrada inmediata (duplicado) y lo registra", async () => {
    const s = await setup("p2");
    expect((await s.doPunch()).ok).toBe(true);
    expect(await s.doPunch({ now: plus(0.5) })).toMatchObject({ ok: false, reason: "DUPLICATE_PUNCH" });
    expect(await db.workSession.count({ where: { employeeId: s.employee.id } })).toBe(1);
    expect(await db.attendanceAttempt.count({ where: { userId: s.empUser.id, reason: "DUPLICATE_PUNCH" } })).toBe(1);
  });

  it("dos toques simultáneos crean una sola jornada", async () => {
    const s = await setup("p3");
    const results = await Promise.all([s.doPunch(), s.doPunch(), s.doPunch()]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await db.workSession.count({ where: { employeeId: s.employee.id, status: "OPEN" } })).toBe(1);
    expect(await db.attendanceEvent.count({ where: { employeeId: s.employee.id } })).toBe(1);
  });

  it("repetir la misma solicitud (misma clave) devuelve el mismo resultado sin duplicar", async () => {
    const s = await setup("p4");
    const key = randomUUID();
    const a = await s.doPunch({ key });
    const b = await s.doPunch({ key, now: plus(5) });
    expect(b).toEqual(a);
    expect(await db.attendanceEvent.count({ where: { employeeId: s.employee.id } })).toBe(1);
  });

  it("una jornada olvidada (> 16 h) pasa a revisión sin inventar salida y se abre una nueva", async () => {
    const s = await setup("p5");
    await s.doPunch();
    const r = await s.doPunch({ now: plus((STALE_SESSION_HOURS + 8) * 60) });
    expect(r).toMatchObject({ ok: true, type: "IN", staleClosed: true });
    const sessions = await db.workSession.findMany({ where: { employeeId: s.employee.id }, orderBy: { startAt: "asc" } });
    expect(sessions.map((x) => [x.status, x.endAt])).toEqual([
      ["NEEDS_REVIEW", null],
      ["OPEN", null],
    ]);
  });
});

describe("ubicación", () => {
  it("fuera del radio: rechazada, sin marcación y con intento registrado", async () => {
    const s = await setup("g1");
    expect(await s.doPunch({ meters: 600 })).toMatchObject({ ok: false, reason: "OUTSIDE_RADIUS", distance: 600 });
    expect(await db.attendanceEvent.count({ where: { employeeId: s.employee.id } })).toBe(0);
    const attempt = await db.attendanceAttempt.findFirstOrThrow({ where: { userId: s.empUser.id } });
    expect(attempt).toMatchObject({ reason: "OUTSIDE_RADIUS", siteId: s.site.id });
  });

  it("borde del radio dentro de la incertidumbre del GPS: aceptada y marcada para revisar", async () => {
    const s = await setup("g2");
    expect(await s.doPunch({ meters: 100, accuracy: 40 })).toMatchObject({ ok: true, flagged: true });
    expect((await db.attendanceEvent.findFirstOrThrow({ where: { employeeId: s.employee.id } })).status).toBe("FLAGGED");
  });

  it("GPS impreciso o ubicación negada: rechazada", async () => {
    const s = await setup("g3");
    expect(await s.doPunch({ accuracy: 500 })).toMatchObject({ ok: false, reason: "LOW_ACCURACY" });
    expect(await s.doPunch({ position: null })).toMatchObject({ ok: false, reason: "LOCATION_DENIED" });
  });
});

describe("código QR", () => {
  it("rechaza QR inexistente, revocado o de otra empresa", async () => {
    const s = await setup("q1");
    const other = await setup("q2");
    expect(await s.doPunch({ code: "no-existe-123" })).toMatchObject({ ok: false, reason: "INVALID_QR" });
    expect(await s.doPunch({ code: other.qr.publicCode })).toMatchObject({ ok: false, reason: "WRONG_COMPANY" });
    await db.siteQrCode.update({ where: { id: s.qr.id }, data: { revokedAt: new Date() } });
    expect(await s.doPunch()).toMatchObject({ ok: false, reason: "QR_REVOKED" });
    expect(await db.attendanceEvent.count({ where: { employeeId: s.employee.id } })).toBe(0);
  });
});

describe("dispositivo vinculado", () => {
  it("sin celular vinculado no se puede marcar", async () => {
    const s = await setup("d1");
    expect(await s.doPunch({ token: null })).toMatchObject({ ok: false, reason: "DEVICE_NOT_BOUND" });
    expect(await s.doPunch({ token: "token-inventado" })).toMatchObject({ ok: false, reason: "DEVICE_NOT_BOUND" });
  });

  it("un segundo celular queda pendiente; al aprobarlo, el anterior se revoca", async () => {
    const s = await setup("d2");
    const second = await bindDevice(s.emp.actor, "Mozilla/5.0 (iPhone) Safari/605");
    expect(second.status).toBe("PENDING");
    expect(await s.doPunch({ token: second.token })).toMatchObject({ ok: false, reason: "DEVICE_NOT_BOUND", message: expect.stringContaining("pendiente") });
    const pending = (await listDevices(s.admin.actor)).find((d) => d.status === "PENDING")!;
    await approveDevice(s.admin.actor, pending.id);
    expect((await s.doPunch({ token: second.token })).ok).toBe(true);
    expect(await s.doPunch({ token: s.device.token, now: plus(120) })).toMatchObject({ ok: false, reason: "DEVICE_REVOKED" });
  });

  it("un celular revocado por el administrador deja de marcar", async () => {
    const s = await setup("d3");
    const d = (await listDevices(s.admin.actor))[0]!;
    await revokeDevice(s.admin.actor, d.id);
    expect(await s.doPunch()).toMatchObject({ ok: false, reason: "DEVICE_REVOKED" });
  });

  it("si la empresa no exige celular vinculado, se marca sin él", async () => {
    const s = await setup("d4", { requireDevice: false });
    expect((await s.doPunch({ token: null })).ok).toBe(true);
  });

  it("con passkey activada en el celular, marcar sin ella se rechaza", async () => {
    const s = await setup("d5");
    const binding = (await listDevices(s.admin.actor))[0]!;
    await db.passkeyCredential.create({
      data: { userId: s.empUser.id, deviceBindingId: binding.id, credentialId: `cred-${randomUUID()}`, publicKey: Buffer.from([1, 2, 3]) },
    });
    expect(await s.doPunch()).toMatchObject({ ok: false, reason: "PASSKEY_FAILED" });
  });

  it("un administrador no puede aprobar ni revocar celulares de otra empresa", async () => {
    const a = await setup("d6");
    const b = await setup("d7");
    const deviceOfB = (await listDevices(b.admin.actor))[0]!;
    expect(await code(revokeDevice(a.admin.actor, deviceOfB.id))).toBe("NOT_FOUND");
    expect(await code(approveDevice(a.admin.actor, deviceOfB.id))).toBe("NOT_FOUND");
    expect((await listDevices(a.admin.actor)).some((d) => d.id === deviceOfB.id)).toBe(false);
  });
});

describe("permisos y vistas", () => {
  it("el administrador no marca; el empleado no ve la asistencia de la empresa", async () => {
    const s = await setup("v1");
    expect(await code(punch(s.admin.actor, {}, { rp }))).toBe("FORBIDDEN");
    expect(await code(attendanceDay(s.emp.actor))).toBe("FORBIDDEN");
    expect(await code(bindDevice(s.admin.actor))).toBe("FORBIDDEN");
  });

  it("el día del administrador detecta tardanza según la tolerancia", async () => {
    const s = await setup("v2"); // turno 8:00 a. m., tolerancia 5 min
    await s.doPunch({ now: new Date("2026-10-27T13:12:00Z") }); // 8:12 a. m.
    const day = await attendanceDay(s.admin.actor, new Date("2026-10-27T15:00:00Z"));
    expect(day.rows[0]).toMatchObject({ status: "late", lateMinutes: 12, working: true });
    expect(day.present).toBe(1);
  });

  it("sin marcación después del inicio del turno, aparece como ausente", async () => {
    const s = await setup("v3");
    const day = await attendanceDay(s.admin.actor, new Date("2026-10-27T15:00:00Z")); // 10 a. m.
    expect(day.rows[0]!.status).toBe("absent");
  });

  it("el historial del empleado solo trae sus jornadas", async () => {
    const a = await setup("v4");
    const b = await setup("v5");
    await a.doPunch({ now: new Date() });
    await b.doPunch({ now: new Date() });
    const h = await employeeHistory(a.emp.actor);
    expect(h.sessions).toHaveLength(1);
    expect(h.sessions[0]!.employeeId).toBe(a.employee.id);
  });
});

describe("ubicación de la sede", () => {
  it("el administrador la ajusta (con auditoría) y otra empresa no puede tocarla", async () => {
    const { updateSiteLocation } = await import("@/server/sites");
    const a = await setup("s1");
    const b = await setup("s2");
    await updateSiteLocation(a.admin.actor, a.site.id, { latitude: "4.15", longitude: "-73.63", radiusMeters: "120" });
    const site = await db.site.findUniqueOrThrow({ where: { id: a.site.id } });
    expect([Number(site.latitude), Number(site.longitude), site.radiusMeters]).toEqual([4.15, -73.63, 120]);
    expect(await db.auditLog.count({ where: { entityId: a.site.id, action: "site.location_update" } })).toBe(1);
    expect(await code(updateSiteLocation(b.admin.actor, a.site.id, { latitude: 0, longitude: 0, radiusMeters: 50 }))).toBe("NOT_FOUND");
    expect(await code(updateSiteLocation(a.emp.actor, a.site.id, { latitude: 0, longitude: 0, radiusMeters: 50 }))).toBe("FORBIDDEN");
    expect(await code(updateSiteLocation(a.admin.actor, a.site.id, { latitude: 4, longitude: -73, radiusMeters: 5 }))).toBe("VALIDATION");
  });
});
