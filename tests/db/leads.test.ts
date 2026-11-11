/** Solicitudes desde la página pública: validación, campo trampa, límite por red y acceso solo del superadministrador. */
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { AppError } from "@/server/errors";
import { listLeads, MAX_LEADS_PER_IP_PER_HOUR, setLeadStatus, submitLead } from "@/server/leads";
import { login, makeCompany, PASSWORD } from "../support/fixtures";

const input = (over: Record<string, unknown> = {}) => ({
  businessName: "Droguería Central", contactName: "Rosa Díaz", email: "ROSA@test.local", phone: "300 123 4567", employees: "6-15", sites: "2", city: "Villavicencio", consent: true, ...over,
});
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

describe("solicitudes de la página pública", () => {
  it("guarda la solicitud normalizada y sin la IP en claro", async () => {
    const name = `Negocio ${Date.now()}`;
    await submitLead(input({ businessName: name }), "198.51.100.10");
    const l = await db.lead.findFirstOrThrow({ where: { businessName: name } });
    expect(l).toMatchObject({ email: "rosa@test.local", employees: "6-15", sites: 2, status: "NEW" });
    expect(l.ipHash).not.toContain("198.51.100.10");
  });

  it("valida los campos y exige la autorización de contacto", async () => {
    await expect(submitLead({ businessName: "", email: "x", phone: "abc", employees: "mil" })).rejects.toMatchObject({
      code: "VALIDATION", fieldErrors: { businessName: expect.any(String), email: expect.any(String), phone: expect.any(String), employees: expect.any(String), consent: expect.any(String) },
    });
  });

  it("ignora a los robots que llenan el campo trampa", async () => {
    const name = `Robot ${Date.now()}`;
    expect(await submitLead(input({ businessName: name, website: "http://spam" }))).toEqual({ ok: true });
    expect(await db.lead.count({ where: { businessName: name } })).toBe(0);
  });

  it("limita los envíos por red", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < MAX_LEADS_PER_IP_PER_HOUR; i++) await submitLead(input({ businessName: `Spam ${i}` }), ip);
    expect(await code(submitLead(input(), ip))).toBe("LIMIT");
    expect(await code(submitLead(input(), "198.51.100.99"))).toBe("OK");
  });

  it("solo el superadministrador las ve y cambia su estado", async () => {
    const f = await makeCompany("lead1");
    const admin = await login(f.admin.email);
    expect(await code(listLeads(admin.actor))).toBe("FORBIDDEN");
    const email = `sa-lead-${Date.now()}@test.local`;
    await db.user.create({ data: { email, name: "SA", passwordHash: await hashPassword(PASSWORD), role: "SUPERADMIN" } });
    const sa = (await login(email)).actor;
    const [first] = await listLeads(sa);
    expect(first).not.toHaveProperty("ipHash");
    await setLeadStatus(sa, first!.id, "INVITED");
    expect((await db.lead.findUniqueOrThrow({ where: { id: first!.id } })).status).toBe("INVITED");
    expect(await code(setLeadStatus(sa, first!.id, "BORRADA"))).toBe("VALIDATION");
    expect(await code(setLeadStatus(admin.actor, first!.id, "NEW"))).toBe("FORBIDDEN");
  });
});
