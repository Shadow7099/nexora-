/**
 * Genera el SQL de inserción de los parámetros laborales nacionales a partir de
 * prisma/labor-parameters.ts (fuente única). Uso: npx tsx scripts/labor-parameters-sql.ts
 */
import { LABOR_PARAMETERS } from "../prisma/labor-parameters";

const q = (v: string | null | undefined) => (v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const rows = LABOR_PARAMETERS.map(
  (p) =>
    `  (gen_random_uuid(), NULL, ${q(p.key)}, ${p.value}, '${p.unit}', DATE ${q(p.validFrom)}, ${p.validTo ? `DATE ${q(p.validTo)}` : "NULL"}, ${q(p.legalSource)}, ${q(p.sourceUrl)}, NULL, ${q(p.notes)})`,
);
console.log(
  `INSERT INTO "labor_parameter" ("id", "company_id", "key", "value", "unit", "valid_from", "valid_to", "legal_source", "source_url", "verified_at", "notes") VALUES\n${rows.join(",\n")}\nON CONFLICT DO NOTHING;`,
);
