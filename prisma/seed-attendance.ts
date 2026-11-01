/**
 * Marcaciones SIMULADAS de demostración (últimas dos semanas hábiles).
 *
 * Coherentes con el horario de cada empleado: la mayoría a tiempo, algunas
 * llegadas tarde, horas extra ocasionales, una salida olvidada y algunos
 * intentos rechazados. Se marcan con source = SYSTEM para que nunca se
 * confundan con marcaciones reales (que siempre son QR o ADMIN_MANUAL).
 *
 * Determinista (semilla fija): siempre genera los mismos datos para las mismas fechas.
 * No crea dispositivos: así, cuando un empleado demo pruebe la app en su
 * celular, su primer celular queda activo de inmediato.
 *
 * Ejecutar: npx tsx prisma/seed-attendance.ts   (también lo llama seed.ts)
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { localDate, shiftsOn, type PatternInput } from "../src/lib/schedule";

const DAY_MS = 86_400_000;
const METERS_PER_DEG = 111_195;

/** Generador pseudoaleatorio con semilla (mulberry32). */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function seedAttendance(db: PrismaClient, slug: string, now = new Date()) {
  const company = await db.company.findUnique({ where: { slug }, select: { id: true, timezone: true } });
  if (!company) throw new Error(`No existe la empresa ${slug}`);
  if ((await db.attendanceEvent.count({ where: { companyId: company.id } })) > 0) {
    console.log("La empresa ya tiene marcaciones; no se generan simuladas.");
    return { sessions: 0, attempts: 0 };
  }
  const tz = company.timezone;
  const employees = await db.employee.findMany({
    where: { companyId: company.id, status: "ACTIVE" },
    orderBy: { documentNumber: "asc" },
    select: { id: true, userId: true, firstName: true },
  });
  const rows = await db.schedulePattern.findMany({
    where: { companyId: company.id },
    include: { days: { include: { template: true, site: { include: { qrCodes: { where: { revokedAt: null } } } } } } },
  });
  const sites = new Map(rows.flatMap((r) => r.days.map((d) => [d.site.id, d.site] as const)));
  const patternsOf = (employeeId: string): PatternInput[] =>
    rows
      .filter((r) => r.employeeId === employeeId)
      .map((r) => ({
        cycleDays: r.cycleDays,
        anchorDate: r.anchorDate,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        days: r.days.map((d) => ({ dayIndex: d.dayIndex, siteId: d.siteId, siteName: d.site.name, template: d.template })),
      }));

  const today = localDate(now, tz);
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.parse(`${today}T00:00:00Z`) - (14 - i) * DAY_MS).toISOString().slice(0, 10));
  const rand = prng(20261101);
  const between = (a: number, b: number) => a + rand() * (b - a);
  const minutes = (m: number) => m * 60_000;

  let sessions = 0;
  let attempts = 0;
  let forgotOutUsed = false;

  for (const e of employees) {
    const lateProb = e.firstName === "Laura" ? 0.35 : 0.08;
    const overtimeProb = e.firstName === "Diego" || e.firstName === "Paula" ? 0.3 : 0.12;
    for (const day of days) {
      const shifts = shiftsOn(patternsOf(e.id), day, tz);
      if (shifts.length === 0) continue;
      if (rand() < 0.03) continue; // ausencia sin marcar
      for (const [i, s] of shifts.entries()) {
        const site = sites.get(s.siteId)!;
        const qr = site.qrCodes[0];
        const point = (meters: number, accuracy: number) => {
          const angle = rand() * 2 * Math.PI;
          return {
            latitude: Number(site.latitude) + (meters * Math.sin(angle)) / METERS_PER_DEG,
            longitude: Number(site.longitude) + (meters * Math.cos(angle)) / (METERS_PER_DEG * Math.cos((Number(site.latitude) * Math.PI) / 180)),
            accuracyMeters: Math.round(accuracy),
            distanceMeters: Math.round(meters),
          };
        };

        const late = rand() < lateProb;
        const inAt = new Date(s.start.getTime() + minutes(late ? between(8, 28) : between(-9, 3)));
        const overtime = i === shifts.length - 1 && rand() < overtimeProb;
        const outAt = new Date(s.end.getTime() + minutes(overtime ? between(35, 95) : between(0, 9)));
        const forgotOut = !forgotOutUsed && e.firstName === "Santiago" && day === days[9];
        if (forgotOut) forgotOutUsed = true;

        // Algunos intentos rechazados antes de marcar bien (lejos de la sede o GPS impreciso).
        if (rand() < 0.05) {
          const far = rand() < 0.6;
          await db.attendanceAttempt.create({
            data: {
              companyId: company.id,
              userId: e.userId,
              siteId: site.id,
              reason: far ? "OUTSIDE_RADIUS" : "LOW_ACCURACY",
              detail: far ? { distance: Math.round(between(250, 900)), accuracy: 20, radius: site.radiusMeters, simulated: true } : { distance: 30, accuracy: 340, simulated: true },
              occurredAt: new Date(inAt.getTime() - minutes(between(2, 6))),
            },
          });
          attempts++;
        }

        const flaggedIn = rand() < 0.03;
        const base = {
          companyId: company.id,
          employeeId: e.id,
          siteId: site.id,
          source: "SYSTEM" as const,
          verification: "DEVICE_TOKEN" as const,
          geoStatus: "INSIDE" as const,
          qrCodeId: qr?.id ?? null,
          reason: "Dato simulado de demostración",
        };
        const inEv = await db.attendanceEvent.create({
          data: {
            ...base,
            type: "IN",
            occurredAt: inAt,
            status: flaggedIn ? "FLAGGED" : "ACCEPTED",
            ...point(flaggedIn ? between(85, 100) : between(4, 55), flaggedIn ? 35 : between(6, 30)),
            idempotencyKey: `demo-${randomUUID()}`,
          },
        });
        if (forgotOut) {
          await db.workSession.create({
            data: { companyId: company.id, employeeId: e.id, siteId: site.id, inEventId: inEv.id, startAt: inAt, status: "NEEDS_REVIEW", reviewNote: "Sin salida registrada después de 16 h" },
          });
        } else {
          const outEv = await db.attendanceEvent.create({
            data: { ...base, type: "OUT", occurredAt: outAt, status: "ACCEPTED", ...point(between(4, 55), between(6, 30)), idempotencyKey: `demo-${randomUUID()}` },
          });
          await db.workSession.create({
            data: { companyId: company.id, employeeId: e.id, siteId: site.id, inEventId: inEv.id, outEventId: outEv.id, startAt: inAt, endAt: outAt, status: "CLOSED", breakMinutes: s.breakMinutes },
          });
        }
        sessions++;
      }
    }
  }
  await db.auditLog.create({
    data: { companyId: company.id, action: "demo.attendance_seed", entityType: "company", entityId: company.id, after: { sessions, attempts, from: days[0], to: days.at(-1) } },
  });
  console.log(`Marcaciones simuladas: ${sessions} jornadas y ${attempts} intentos rechazados (${days[0]} a ${days.at(-1)}).`);
  return { sessions, attempts };
}

if (process.argv[1]?.endsWith("seed-attendance.ts")) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  seedAttendance(db, process.argv[2] ?? "el-trigal-demo")
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
