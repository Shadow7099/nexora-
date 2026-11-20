import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de los tokens y llaves de las integraciones (AES-256-GCM).
 *
 * La clave vive SOLO en la variable de entorno NEXORA_SECRETS_KEY (32 bytes en
 * base64), nunca en la base de datos: quien obtenga una copia de la base no
 * puede leer los tokens. Cada valor se cifra con un IV aleatorio y queda
 * "atado" a su fila (dato asociado = empresa|proveedor), así no se puede
 * copiar el token cifrado de una empresa a otra.
 *
 * Formato: v1.<iv>.<tag>.<texto cifrado> (base64url).
 */

const VERSION = "v1";

export class SecretsKeyMissing extends Error {
  constructor() {
    super("Falta configurar la clave de cifrado (NEXORA_SECRETS_KEY) en el servidor.");
  }
}

function key(): Buffer {
  // Tolera espacios, saltos de línea o comillas pegados por error alrededor del valor.
  const raw = process.env.NEXORA_SECRETS_KEY?.trim().replace(/^["']|["']$/g, "").trim();
  if (!raw) throw new SecretsKeyMissing();
  // 32 bytes: en base64 (44 caracteres, p. ej. openssl rand -base64 32) o en hexadecimal (64 caracteres).
  const k = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error(`NEXORA_SECRETS_KEY debe ser de 32 bytes: 44 caracteres en base64 o 64 en hexadecimal (el valor guardado tiene ${raw.length} caracteres).`);
  return k;
}

export const secretsConfigured = () => {
  try {
    key();
    return true;
  } catch {
    return false;
  }
};

export function encryptSecret(plain: string, associated: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(associated, "utf8"));
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [VERSION, iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(token: string, associated: string): string {
  const [v, iv, tag, data] = token.split(".");
  if (v !== VERSION || !iv || !tag || data === undefined) throw new Error("Secreto con formato desconocido.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(associated, "utf8"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
