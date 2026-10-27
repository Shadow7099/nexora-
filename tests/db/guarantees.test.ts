/**
 * Garantías que la base de datos impone por sí misma, aunque el código de la
 * aplicación tuviera un error. Cada prueba corre dentro de una transacción
 * que se revierte al final, así no deja rastro (las tablas de solo inserción
 * tampoco se ven afectadas).
 *
 * Requiere DATABASE_URL con la migración aplicada.
 */
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";

const client = new Client({ connectionString: process.env.DATABASE_URL });

beforeAll(() => client.connect());
afterAll(() => client.end());
beforeEach(() => client.query("BEGIN"));
afterEach(() => client.query("ROLLBACK"));

/** Ejecuta la consulta dentro de un SAVEPOINT y devuelve el código de error de Postgres (o null). */
async function pgError(sql: string, params: unknown[] = []) {
  await client.query("SAVEPOINT t");
  try {
    await client.query(sql, params);
    await client.query("RELEASE SAVEPOINT t");
    return null;
  } catch (e) {
    await client.query("ROLLBACK TO SAVEPOINT t");
    return (e as { code?: string }).code ?? "unknown";
  }
}

/** Crea una empresa mínima con una sede y un empleado. */
async function fixture(tag: string) {
  const companyId = randomUUID();
  const userId = randomUUID();
  const siteId = randomUUID();
  const employeeId = randomUUID();
  await client.query(`INSERT INTO company (id, name, slug, updated_at) VALUES ($1, $2, $3, now())`, [companyId, `Test ${tag}`, `test-${tag}-${companyId}`]);
  await client.query(
    `INSERT INTO app_user (id, company_id, email, name, password_hash, role, updated_at) VALUES ($1, $2, $3, 'Prueba', 'x', 'EMPLOYEE', now())`,
    [userId, companyId, `${userId}@test.local`],
  );
  await client.query(
    `INSERT INTO site (id, company_id, name, address, city, latitude, longitude, updated_at) VALUES ($1, $2, 'Sede', 'Dir', 'Ciudad', 4.1, -73.6, now())`,
    [siteId, companyId],
  );
  await client.query(
    `INSERT INTO employee (id, company_id, user_id, document_type, document_number, first_name, last_name, position, hire_date, updated_at)
     VALUES ($1, $2, $3, 'CC', $4, 'Ana', 'Prueba', 'Cargo', '2026-01-01', now())`,
    [employeeId, companyId, userId, companyId.slice(0, 10)],
  );
  return { companyId, userId, siteId, employeeId };
}

async function insertPunch(f: { companyId: string; employeeId: string; siteId: string }, type = "IN") {
  const id = randomUUID();
  await client.query(
    `INSERT INTO attendance_event (id, company_id, employee_id, site_id, type, source, verification, geo_status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, 'QR', 'DEVICE_TOKEN', 'INSIDE', $6)`,
    [id, f.companyId, f.employeeId, f.siteId, type, randomUUID()],
  );
  return id;
}

describe("aislamiento entre empresas (claves foráneas compuestas)", () => {
  it("rechaza una marcación que mezcla empleado de una empresa con sede de otra", async () => {
    const a = await fixture("a");
    const b = await fixture("b");
    const code = await pgError(
      `INSERT INTO attendance_event (id, company_id, employee_id, site_id, type, source, verification, geo_status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'IN', 'QR', 'DEVICE_TOKEN', 'INSIDE', $5)`,
      [randomUUID(), a.companyId, a.employeeId, b.siteId, randomUUID()],
    );
    expect(code).toBe("23503"); // foreign_key_violation
  });

  it("rechaza un turno programado en la sede de otra empresa", async () => {
    const a = await fixture("a");
    const b = await fixture("b");
    const code = await pgError(
      `INSERT INTO scheduled_shift (id, company_id, employee_id, site_id, work_date, start_at, end_at)
       VALUES ($1, $2, $3, $4, '2026-10-27', '2026-10-27T13:00Z', '2026-10-27T22:00Z')`,
      [randomUUID(), a.companyId, a.employeeId, b.siteId],
    );
    expect(code).toBe("23503");
  });

  it("rechaza vincular un dispositivo a un empleado ajeno", async () => {
    const a = await fixture("a");
    const b = await fixture("b");
    const code = await pgError(
      `INSERT INTO device_binding (id, company_id, employee_id, token_hash, label) VALUES ($1, $2, $3, $4, 'Cel')`,
      [randomUUID(), a.companyId, b.employeeId, randomUUID()],
    );
    expect(code).toBe("23503");
  });
});

describe("el tiempo real no se borra", () => {
  it("bloquea UPDATE y DELETE sobre marcaciones", async () => {
    const f = await fixture("ae");
    const id = await insertPunch(f);
    expect(await pgError(`UPDATE attendance_event SET occurred_at = now() - interval '1 hour' WHERE id = $1`, [id])).toBe("23001");
    expect(await pgError(`DELETE FROM attendance_event WHERE id = $1`, [id])).toBe("23001");
  });

  it("bloquea UPDATE y DELETE sobre la auditoría", async () => {
    const id = randomUUID();
    await client.query(`INSERT INTO audit_log (id, action, entity_type) VALUES ($1, 'test', 'test')`, [id]);
    expect(await pgError(`UPDATE audit_log SET action = 'otra' WHERE id = $1`, [id])).toBe("23001");
    expect(await pgError(`DELETE FROM audit_log WHERE id = $1`, [id])).toBe("23001");
  });

  it("exige motivo y autor en una marcación manual", async () => {
    const f = await fixture("mp");
    const code = await pgError(
      `INSERT INTO attendance_event (id, company_id, employee_id, site_id, type, source, verification, geo_status, idempotency_key)
       VALUES ($1, $2, $3, $4, 'IN', 'ADMIN_MANUAL', 'ADMIN', 'NOT_REQUIRED', $5)`,
      [randomUUID(), f.companyId, f.employeeId, f.siteId, randomUUID()],
    );
    expect(code).toBe("23514"); // check_violation
  });
});

describe("una sola jornada abierta por empleado", () => {
  it("rechaza una segunda entrada mientras hay una jornada abierta", async () => {
    const f = await fixture("ws");
    const open = (eventId: string) =>
      pgError(
        `INSERT INTO work_session (id, company_id, employee_id, site_id, in_event_id, start_at) VALUES ($1, $2, $3, $4, $5, now())`,
        [randomUUID(), f.companyId, f.employeeId, f.siteId, eventId],
      );
    expect(await open(await insertPunch(f))).toBeNull();
    expect(await open(await insertPunch(f))).toBe("23505"); // unique_violation
  });

  it("no acepta una jornada cerrada sin hora de salida", async () => {
    const f = await fixture("ws2");
    const code = await pgError(
      `INSERT INTO work_session (id, company_id, employee_id, site_id, in_event_id, start_at, status) VALUES ($1, $2, $3, $4, $5, now(), 'CLOSED')`,
      [randomUUID(), f.companyId, f.employeeId, f.siteId, await insertPunch(f)],
    );
    expect(code).toBe("23514");
  });
});

describe("horas extra", () => {
  it("no permite aprobar más minutos de los detectados", async () => {
    const f = await fixture("ot");
    const code = await pgError(
      `INSERT INTO overtime_request (id, company_id, employee_id, work_date, detected_minutes, approved_minutes, status, decided_by_id, decided_at)
       VALUES ($1, $2, $3, '2026-10-27', 60, 90, 'APPROVED', $4, now())`,
      [randomUUID(), f.companyId, f.employeeId, f.userId],
    );
    expect(code).toBe("23514");
  });

  it("una decisión exige quién decidió y cuándo", async () => {
    const f = await fixture("ot2");
    const code = await pgError(
      `INSERT INTO overtime_request (id, company_id, employee_id, work_date, detected_minutes, status) VALUES ($1, $2, $3, '2026-10-27', 60, 'REJECTED')`,
      [randomUUID(), f.companyId, f.employeeId],
    );
    expect(code).toBe("23514");
  });
});

describe("coherencia de sedes", () => {
  it("rechaza coordenadas o radios fuera de rango", async () => {
    const f = await fixture("geo");
    expect(await pgError(`UPDATE site SET latitude = 120 WHERE id = $1`, [f.siteId])).toBe("23514");
    expect(await pgError(`UPDATE site SET radius_meters = 3 WHERE id = $1`, [f.siteId])).toBe("23514");
  });

  it("permite un solo QR vigente por sede", async () => {
    const f = await fixture("qr");
    const qr = (v: number) =>
      pgError(`INSERT INTO site_qr_code (id, company_id, site_id, public_code, version) VALUES ($1, $2, $3, $4, $5)`, [randomUUID(), f.companyId, f.siteId, randomUUID(), v]);
    expect(await qr(1)).toBeNull();
    expect(await qr(2)).toBe("23505");
  });
});
