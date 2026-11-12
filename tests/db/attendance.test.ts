/**
 * Fase 4: marcación con QR. Cubre las pruebas obligatorias 1, 2 y 4 del plan
 * (entrada y salida; sin segunda entrada con jornada abierta; ubicación fuera
 * del área rechazada) más dispositivo, QR, idempotencia y jornadas olvidadas.
 */
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { attendanceDay, employeeDeviceContext, employeeHistory, PASSKEY_MISSING_MESSAGE, punch, punchFromApp, qrContext, STALE_SESSION_HOURS } from "@/server/attendance";
import { addRelinkedWindow, approveDevice, bindDevice, findBinding, listDevices, MAX_RELINKED_WINDOWS, revokeDevice, setPasskeyExemption } from "@/server/devices";
import { AppError } from "@/server/errors";
import { login, makeCompany } from "../support/fixtures";

const rp = { rpID: "localhost", origin: "http://localhost:3000" };
// La sede del fixture está en (4.14, -73.62) con radio de 80 m.
const at = (metersNorth: number, accuracy = 15) => ({ lat: 4.14 + metersNorth / 111_195, lng: -73.62, accuracy });
const t0 = new Date("2026-10-27T12:55:00Z"); // martes 7:55 a. m. en Bogotá
const plus = (min: number) => new Date(t0.getTime() + min * 60_000);

async function setup(tag: string, opts: { requireDevice?: boolean; passkeyExempt?: boolean } = {}) {
  const f = await makeCompany(tag);
  if (opts.requireDevice === false) await db.company.update({ where: { id: f.company.id }, data: { requireDeviceBinding: false } });
  const qr = await db.siteQrCode.create({ data: { companyId: f.company.id, siteId: f.site.id, publicCode: `qr${randomUUID().replace(/-/g, "").slice(0, 16)}`, version: 1 } });
  const emp = await login(f.empUser.email);
  const admin = await login(f.admin.email);
  const device = await bindDevice(emp.actor, "Mozilla/5.0 (Linux; Android 14) Chrome/130");
  // La mayoría de estas pruebas no usan huella/Face ID: el celular queda autorizado a marcar sin ella.
  if (opts.passkeyExempt !== false && device.status === "ACTIVE") {
    await setPasskeyExemption(admin.actor, (await findBinding(f.employee.id, device.token))!.id, true);
  }
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
    // El celular nuevo también debe activar su huella o Face ID (la excepción del anterior no pasa al nuevo).
    expect(await s.doPunch({ token: second.token })).toMatchObject({ ok: false, reason: "PASSKEY_FAILED", message: PASSKEY_MISSING_MESSAGE });
    await setPasskeyExemption(s.admin.actor, pending.id, true);
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

  it("huella o Face ID obligatoria: sin ella no se marca, salvo que el administrador autorice ese celular", async () => {
    const s = await setup("d10", { passkeyExempt: false });
    const binding = (await findBinding(s.employee.id, s.device.token))!;
    expect(await s.doPunch()).toMatchObject({ ok: false, reason: "PASSKEY_FAILED", message: PASSKEY_MISSING_MESSAGE });
    expect(await db.attendanceAttempt.count({ where: { userId: s.empUser.id, reason: "PASSKEY_FAILED" } })).toBe(1);
    const ctx = await qrContext(s.emp.actor, s.qr.publicCode, s.device.token);
    expect(ctx).toMatchObject({ valid: true, needsPasskeySetup: true });

    // Solo el administrador de la empresa autoriza la excepción, y queda auditada.
    expect(await code(setPasskeyExemption(s.emp.actor, binding.id, true))).toBe("FORBIDDEN");
    const other = await setup("d11");
    expect(await code(setPasskeyExemption(other.admin.actor, binding.id, true))).toBe("NOT_FOUND");
    await setPasskeyExemption(s.admin.actor, binding.id, true);
    expect(await qrContext(s.emp.actor, s.qr.publicCode, s.device.token)).toMatchObject({ needsPasskeySetup: false });
    expect((await s.doPunch()).ok).toBe(true);
    expect(await db.auditLog.count({ where: { companyId: s.company.id, action: "device.passkey_exempt" } })).toBe(1);

    // Volver a exigirla.
    await setPasskeyExemption(s.admin.actor, binding.id, false);
    expect(await s.doPunch({ now: plus(9 * 60) })).toMatchObject({ ok: false, reason: "PASSKEY_FAILED" });
    expect((await findBinding(s.employee.id, s.device.token))!.label).toBe("Android · Chrome");

    // Un celular pendiente no se puede autorizar; si la empresa no exige celular, tampoco exige huella.
    const free = await setup("d12", { requireDevice: false, passkeyExempt: false });
    expect((await free.doPunch()).ok).toBe(true);
  });

  it("reconocer otra ventana del mismo celular con la huella no anula las demás (Safari ↔ cámara del iPhone)", async () => {
    const s = await setup("d8");
    const original = (await listDevices(s.admin.actor))[0]!;
    await db.passkeyCredential.create({
      data: { userId: s.empUser.id, deviceBindingId: original.id, credentialId: `cred-${randomUUID()}`, publicKey: Buffer.from([1, 2, 3]) },
    });
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
    const camera = await addRelinkedWindow(s.emp.actor, original.id, iphone);
    const safari = await addRelinkedWindow(s.emp.actor, original.id, iphone);
    // Las tres llaves siguen activas: ninguna ventana anula a la otra.
    for (const t of [s.device.token, camera, safari]) expect((await findBinding(s.employee.id, t))?.status).toBe("ACTIVE");
    expect((await findBinding(s.employee.id, camera))?.label).toBe("iPhone · Safari · reconocido con huella");
    // La huella sigue siendo obligatoria desde la ventana reconocida.
    expect(await s.doPunch({ token: camera })).toMatchObject({ ok: false, reason: "PASSKEY_FAILED" });
    // Sin la huella del celular activo no se reconoce: ni de otro empleado ni de un vínculo inexistente.
    const other = await setup("d9");
    expect(await code(addRelinkedWindow(other.emp.actor, original.id, iphone))).toBe("NOT_FOUND");

    // Se guardan como máximo MAX_RELINKED_WINDOWS ventanas; las más antiguas se revocan.
    for (let i = 0; i < MAX_RELINKED_WINDOWS; i++) await addRelinkedWindow(s.emp.actor, original.id, iphone);
    const active = await db.deviceBinding.count({ where: { employeeId: s.employee.id, status: "ACTIVE", label: { endsWith: "reconocido con huella" } } });
    expect(active).toBe(MAX_RELINKED_WINDOWS);
    expect((await findBinding(s.employee.id, camera))?.status).toBe("REVOKED");
    expect((await findBinding(s.employee.id, s.device.token))?.status).toBe("ACTIVE"); // el original nunca se toca
    expect(await db.auditLog.count({ where: { companyId: s.company.id, action: "device.relink" } })).toBe(2 + MAX_RELINKED_WINDOWS);

    // Revocar el celular revoca también sus ventanas reconocidas.
    await revokeDevice(s.admin.actor, original.id);
    expect(await db.deviceBinding.count({ where: { employeeId: s.employee.id, status: "ACTIVE" } })).toBe(0);
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

describe("marcar desde la app, sin escanear el QR", () => {
  it("usa la sede más cercana con las mismas validaciones (ubicación, celular, huella)", async () => {
    const s = await setup("app1");
    // Segunda sede a ~5 km: la cercana es la del fixture.
    const far = await db.site.create({ data: { companyId: s.company.id, name: "Sede lejana", address: "Dir", city: "Ciudad", latitude: 4.185, longitude: -73.62 } });
    await db.siteQrCode.create({ data: { companyId: s.company.id, siteId: far.id, publicCode: `qr${randomUUID().replace(/-/g, "").slice(0, 16)}`, version: 1 } });
    const fromApp = (o: { meters?: number; now?: Date; token?: string; position?: null } = {}) =>
      punchFromApp(
        s.emp.actor,
        { idempotencyKey: randomUUID(), position: o.position === null ? null : at(o.meters ?? 10) },
        { deviceToken: o.token ?? s.device.token, rp, now: o.now ?? t0 },
      );

    expect(await fromApp()).toMatchObject({ ok: true, type: "IN", siteName: s.site.name });
    // Cerca de la sede lejana: marca la salida allí (queda para revisión por ser otra sede).
    const out = await punchFromApp(s.emp.actor, { idempotencyKey: randomUUID(), position: { lat: 4.185, lng: -73.62, accuracy: 10 } }, { deviceToken: s.device.token, rp, now: plus(8 * 60) });
    expect(out).toMatchObject({ ok: true, type: "OUT", siteName: "Sede lejana" });

    // Lejos de todas: rechazada por estar fuera del área (de la sede más cercana).
    expect(await fromApp({ meters: 1500, now: plus(9 * 60) })).toMatchObject({ ok: false, reason: "OUTSIDE_RADIUS" });
    // Sin ubicación: rechazada, registrada en su sede habitual.
    expect(await fromApp({ position: null, now: plus(10 * 60) })).toMatchObject({ ok: false, reason: "LOCATION_DENIED" });
    const denied = await db.attendanceAttempt.findFirstOrThrow({ where: { userId: s.empUser.id, reason: "LOCATION_DENIED" } });
    expect(denied.siteId).toBe(s.site.id);
    // Sin celular vinculado tampoco se marca desde la app.
    expect(await fromApp({ token: "otro-navegador", now: plus(11 * 60) })).toMatchObject({ ok: false, reason: "DEVICE_NOT_BOUND" });
  });

  it("exige huella o Face ID igual que el QR, y avisa si la empresa no tiene sedes con QR", async () => {
    const s = await setup("app2", { passkeyExempt: false });
    expect(await punchFromApp(s.emp.actor, { idempotencyKey: randomUUID(), position: at(10) }, { deviceToken: s.device.token, rp, now: t0 })).toMatchObject({
      ok: false, reason: "PASSKEY_FAILED", message: PASSKEY_MISSING_MESSAGE,
    });
    const ctx = await employeeDeviceContext(s.emp.actor, s.device.token);
    expect(ctx).toMatchObject({ needsPasskeySetup: true, next: "IN", device: { status: "ACTIVE" } });

    await db.siteQrCode.updateMany({ where: { companyId: s.company.id }, data: { revokedAt: new Date() } });
    const r = await punchFromApp(s.emp.actor, { idempotencyKey: randomUUID(), position: at(10) }, { deviceToken: s.device.token, rp, now: t0 });
    expect(r).toMatchObject({ ok: false, reason: "OTHER", message: expect.stringContaining("sede activa") });
    expect(await code(punchFromApp(s.admin.actor, {}, { rp }))).toBe("FORBIDDEN");
  });
});
