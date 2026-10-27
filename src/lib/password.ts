import { hash, verify } from "@node-rs/argon2";

// Argon2id con los parámetros mínimos recomendados por OWASP (19 MiB, 2 iteraciones).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(plain: string) {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(storedHash: string, plain: string) {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}
