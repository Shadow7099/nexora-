import "server-only";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireEmployee } from "@/server/authz";
import { findBinding } from "@/server/devices";
import { AppError } from "@/server/errors";
import type { Actor } from "@/server/sessions";

/**
 * Passkeys (WebAuthn): el celular confirma con huella, rostro o PIN que quien
 * marca es su dueño. Nexora no recibe biometría: solo una firma criptográfica
 * verificada con la llave pública guardada al registrar.
 */

export type RelyingParty = { rpID: string; origin: string };

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function saveChallenge(sessionId: string, challenge: string) {
  await db.session.update({
    where: { id: sessionId },
    data: { webauthnChallenge: challenge, webauthnChallengeExpires: new Date(Date.now() + CHALLENGE_TTL_MS) },
  });
}

/** Lee y BORRA el desafío (un solo uso). */
async function takeChallenge(sessionId: string) {
  const s = await db.session.findUnique({ where: { id: sessionId }, select: { webauthnChallenge: true, webauthnChallengeExpires: true } });
  await db.session.update({ where: { id: sessionId }, data: { webauthnChallenge: null, webauthnChallengeExpires: null } });
  if (!s?.webauthnChallenge || !s.webauthnChallengeExpires || s.webauthnChallengeExpires.getTime() < Date.now()) return null;
  return s.webauthnChallenge;
}

async function activeBinding(actor: Actor, deviceToken: string | undefined) {
  const { employeeId } = requireEmployee(actor);
  const binding = await findBinding(employeeId, deviceToken);
  if (!binding || binding.status !== "ACTIVE") throw new AppError("FORBIDDEN", "Primero vincula este celular para poder activar la huella.");
  return binding;
}

export async function passkeyRegistrationOptions(actor: Actor, deviceToken: string | undefined, rp: RelyingParty) {
  const binding = await activeBinding(actor, deviceToken);
  const existing = await db.passkeyCredential.findMany({ where: { userId: actor.userId }, select: { credentialId: true, transports: true } });
  const options = await generateRegistrationOptions({
    rpName: "Nexora",
    rpID: rp.rpID,
    userName: actor.email,
    userDisplayName: actor.name,
    userID: new TextEncoder().encode(actor.userId),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.credentialId, transports: c.transports })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" },
  });
  await saveChallenge(actor.sessionId, options.challenge);
  return { options, bindingId: binding.id };
}

export async function registerPasskey(actor: Actor, deviceToken: string | undefined, response: RegistrationResponseJSON, rp: RelyingParty) {
  const binding = await activeBinding(actor, deviceToken);
  const challenge = await takeChallenge(actor.sessionId);
  if (!challenge) throw new AppError("VALIDATION", "La solicitud venció. Intenta de nuevo.");
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
  } catch {
    throw new AppError("VALIDATION", "No pudimos verificar la huella. Intenta de nuevo.");
  }
  if (!verification.verified) throw new AppError("VALIDATION", "No pudimos verificar la huella. Intenta de nuevo.");
  const { credential } = verification.registrationInfo;
  await db.passkeyCredential.create({
    data: {
      userId: actor.userId,
      deviceBindingId: binding.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports ?? [],
      name: binding.label,
    },
  });
  await audit({ companyId: actor.companyId, actorUserId: actor.userId, action: "passkey.register", entityType: "device", entityId: binding.id });
}

/** Passkeys vinculadas a este celular. Si hay alguna, marcar exige usarla. */
export async function passkeysForBinding(userId: string, bindingId: string) {
  return db.passkeyCredential.findMany({ where: { userId, deviceBindingId: bindingId } });
}

export async function passkeyAuthenticationOptions(actor: Actor, bindingId: string, rp: RelyingParty) {
  const creds = await passkeysForBinding(actor.userId, bindingId);
  if (creds.length === 0) return null;
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: creds.map((c) => ({ id: c.credentialId, transports: c.transports })),
    userVerification: "required",
  });
  await saveChallenge(actor.sessionId, options.challenge);
  return options;
}

/** Verifica la firma de la passkey para una marcación. */
export async function verifyPasskeyAssertion(actor: Actor, bindingId: string, response: AuthenticationResponseJSON | undefined, rp: RelyingParty) {
  if (!response) return false;
  const challenge = await takeChallenge(actor.sessionId);
  if (!challenge) return false;
  const cred = await db.passkeyCredential.findFirst({ where: { credentialId: response.id, userId: actor.userId, deviceBindingId: bindingId } });
  if (!cred) return false;
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: { id: cred.credentialId, publicKey: new Uint8Array(cred.publicKey), counter: Number(cred.counter), transports: cred.transports },
      requireUserVerification: true,
    });
    if (!v.verified) return false;
    await db.passkeyCredential.update({ where: { id: cred.id }, data: { counter: BigInt(v.authenticationInfo.newCounter), lastUsedAt: new Date() } });
    return true;
  } catch {
    return false;
  }
}
