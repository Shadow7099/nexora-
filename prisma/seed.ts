/**
 * Datos de demostración de Nexora.
 *
 * Empresa ficticia con 4 sedes en el Meta y 8 empleados. Ningún dato
 * corresponde a personas reales. Las coordenadas son aproximadas al centro
 * de cada municipio/barrio y deben reemplazarse por las reales de cada sede.
 *
 * Fase 1: empresa, usuarios, sedes, QR, contratos y horarios.
 * Las marcaciones simuladas se agregan en las fases 4–5 (cuando existe la
 * lógica que las valida), para no sembrar datos que el sistema no sabría producir.
 *
 * Ejecutar:  npx prisma db seed
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_SLUG = "el-trigal-demo";
// Contraseña de demostración. Solo para el entorno demo; se obliga a cambiarla en producción.
const DEMO_PASSWORD = "Nexora-Demo-2026";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const hm = (h: number, m = 0) => h * 60 + m;
const publicCode = () => randomBytes(9).toString("base64url");

async function main() {
  if (await db.company.findUnique({ where: { slug: DEMO_SLUG } })) {
    console.log("La empresa demo ya existe; no se modifica. Para reiniciar: dropear la BD y migrar de nuevo.");
    return;
  }
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await db.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { email: "plataforma@nexora.test" },
      update: {},
      create: { email: "plataforma@nexora.test", name: "Equipo Nexora", passwordHash, role: "SUPERADMIN" },
    });

    const company = await tx.company.create({
      data: {
        name: "Panadería El Trigal",
        legalName: "Panadería El Trigal S.A.S. (ficticia)",
        nit: "900000000-0",
        slug: DEMO_SLUG,
        status: "TRIAL",
        planCode: "piloto",
        maxEmployees: 15,
        maxSites: 4,
      },
    });
    const companyId = company.id;

    const admin = await tx.user.create({
      data: { companyId, email: "admin@eltrigal.test", name: "María Fernanda Ruiz", passwordHash, role: "COMPANY_ADMIN" },
    });

    // ── Sedes ──
    const siteDefs = [
      { key: "centro", name: "Villavicencio Centro", address: "Cra. 31 # 38-15 (ficticia)", city: "Villavicencio", lat: 4.142, lng: -73.6266, open: [hm(6), hm(20)] },
      { key: "primavera", name: "Villavicencio Primavera", address: "Cl. 15 # 40-22 (ficticia)", city: "Villavicencio", lat: 4.1336, lng: -73.6342, open: [hm(5, 30), hm(21)] },
      { key: "acacias", name: "Acacías", address: "Cl. 13 # 17-40 (ficticia)", city: "Acacías", lat: 3.9878, lng: -73.7577, open: [hm(6), hm(20)] },
      { key: "restrepo", name: "Restrepo", address: "Cra. 6 # 7-10 (ficticia)", city: "Restrepo", lat: 4.2617, lng: -73.5611, open: [hm(22), hm(30)] }, // planta de horneado nocturno
    ] as const;

    const sites: Record<string, string> = {};
    for (const s of siteDefs) {
      const site = await tx.site.create({
        data: {
          companyId,
          name: s.name,
          address: s.address,
          city: s.city,
          latitude: s.lat,
          longitude: s.lng,
          radiusMeters: 80,
          managerUserId: admin.id,
          openingHours: { create: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensMin: s.open[0], closesMin: s.open[1] })) },
        },
      });
      await tx.siteQrCode.create({ data: { companyId, siteId: site.id, publicCode: publicCode(), version: 1 } });
      sites[s.key] = site.id;
    }

    // ── Plantillas de turno ──
    const tpl = async (name: string, startMin: number, endMin: number, breakMinutes: number, color: string) =>
      (await tx.shiftTemplate.create({ data: { companyId, name, startMin, endMin, breakMinutes, color } })).id;
    const T = {
      oficina: await tpl("Diurno 8–5", hm(8), hm(17), 60, "blue"),
      madrugada: await tpl("Madrugada 6–2", hm(6), hm(14), 30, "violet"),
      tarde: await tpl("Tarde 1–9", hm(13), hm(21), 30, "amber"),
      nocturno: await tpl("Nocturno 10–6", hm(22), hm(30), 30, "indigo"), // termina al día siguiente
      partidoAm: await tpl("Partido mañana 7–11", hm(7), hm(11), 0, "teal"),
      partidoPm: await tpl("Partido tarde 3–7", hm(15), hm(19), 0, "teal"),
    };

    // ── Empleados ──
    // Salarios ≥ SMMLV 2026 ($1.750.905, Decreto 0159 de 2026). Jornada semanal 42 h
    // (Ley 2466 de 2025, vigente desde julio de 2026). Verificar ambos en la fase 6.
    const people = [
      { first: "Juan", last: "Pérez Castro", doc: "1000000001", pos: "Panadero", site: "centro", salary: 1_900_000, pattern: "oficina" },
      { first: "Laura", last: "Gómez Ríos", doc: "1000000002", pos: "Cajera", site: "centro", salary: 1_750_905, pattern: "oficina" },
      { first: "Andrés", last: "Rojas León", doc: "1000000003", pos: "Panadero", site: "primavera", salary: 1_950_000, pattern: "madrugada" },
      { first: "Valentina", last: "Suárez Mora", doc: "1000000004", pos: "Vendedora", site: "primavera", salary: 1_750_905, pattern: "partido" },
      { first: "Camila", last: "Torres Vega", doc: "1000000005", pos: "Administradora de punto", site: "acacias", salary: 2_600_000, pattern: "oficina" },
      { first: "Santiago", last: "Herrera Díaz", doc: "1000000006", pos: "Auxiliar de despacho", site: "acacias", salary: 1_800_000, pattern: "rotativo" },
      { first: "Diego", last: "Martínez Silva", doc: "1000000007", pos: "Hornero", site: "restrepo", salary: 2_100_000, pattern: "nocturno" },
      { first: "Paula", last: "Ramírez Ortiz", doc: "1000000008", pos: "Supervisora de producción", site: "restrepo", salary: 3_400_000, pattern: "nocturno" },
    ] as const;

    const anchor = d("2026-10-05"); // lunes
    for (const [i, p] of people.entries()) {
      const user = await tx.user.create({
        data: {
          companyId,
          email: `${p.first.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")}@eltrigal.test`,
          name: `${p.first} ${p.last}`,
          passwordHash,
          role: "EMPLOYEE",
        },
      });
      const employee = await tx.employee.create({
        data: {
          companyId,
          userId: user.id,
          documentType: "CC",
          documentNumber: p.doc,
          firstName: p.first,
          lastName: p.last,
          phone: `300000000${i + 1}`,
          position: p.pos,
          defaultSiteId: sites[p.site],
          hireDate: d("2025-02-03"),
        },
      });
      await tx.employeeContract.create({
        data: {
          companyId,
          employeeId: employee.id,
          contractType: i === 5 ? "FIJO" : "INDEFINIDO",
          monthlySalary: p.salary,
          weeklyHours: 42,
          payFrequency: "QUINCENAL",
          arlRiskClass: p.site === "restrepo" ? "II" : "I",
          startDate: d("2025-02-03"),
        },
      });

      // Patrón de turnos: índice de día 0 = lunes (anchor).
      const siteId = sites[p.site]!;
      let cycleDays = 7;
      let days: { dayIndex: number; templateId: string; siteId: string }[] = [];
      const weekdays = (templateId: string, idx: number[]) => idx.map((dayIndex) => ({ dayIndex, templateId, siteId }));
      switch (p.pattern) {
        case "oficina":
          days = weekdays(T.oficina, [0, 1, 2, 3, 4]); // L–V, sáb y dom descanso
          break;
        case "madrugada":
          days = weekdays(T.madrugada, [0, 1, 2, 3, 4, 5]); // L–S
          break;
        case "partido":
          days = [...weekdays(T.partidoAm, [1, 2, 3, 4, 5]), ...weekdays(T.partidoPm, [1, 2, 3, 4, 5])]; // M–S
          break;
        case "nocturno":
          days = weekdays(T.nocturno, [0, 1, 2, 3, 4]); // noches de L a V
          break;
        case "rotativo":
          // Ciclo de 14 días: semana de mañana y semana de tarde; apoya Primavera los sábados.
          cycleDays = 14;
          days = [
            ...weekdays(T.madrugada, [0, 1, 2, 3, 4]),
            { dayIndex: 5, templateId: T.madrugada, siteId: sites.primavera! },
            ...weekdays(T.tarde, [7, 8, 9, 10, 11]),
          ];
          break;
      }
      await tx.schedulePattern.create({
        data: {
          companyId,
          employeeId: employee.id,
          name: p.pattern === "rotativo" ? "Rotativo mañana/tarde" : "Horario base",
          cycleDays,
          anchorDate: anchor,
          effectiveFrom: anchor,
          days: { create: days },
        },
      });
    }

    await tx.auditLog.create({
      data: { companyId, action: "demo.seed", entityType: "company", entityId: companyId, after: { sites: 4, employees: people.length } },
    });
  });

  console.log("Demo creada: 1 empresa, 4 sedes, 8 empleados.");
  console.log(`Acceso demo (contraseña: ${DEMO_PASSWORD}): admin@eltrigal.test · juan@eltrigal.test · plataforma@nexora.test`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
