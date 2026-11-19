/**
 * Un solo dominio: las passkeys (huella o rostro) y las cookies quedan
 * amarradas al dominio exacto donde se crean. Si Nexora se abre desde otra
 * dirección (p. ej. la URL de un despliegue de Vercel), se redirige a la de
 * APP_URL. Las rutas /api no se redirigen: los avisos de Meta deben llegar.
 */
export function canonicalRedirect(requestUrl: string, requestHost: string | null, appUrl: string | undefined): string | null {
  if (!appUrl || !requestHost) return null;
  let canonical: URL;
  try {
    canonical = new URL(appUrl);
  } catch {
    return null;
  }
  const host = requestHost.split(",")[0]!.trim().toLowerCase();
  if (host === canonical.host.toLowerCase()) return null;
  const url = new URL(requestUrl);
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return null;
  return `${canonical.origin}${url.pathname}${url.search}`;
}
