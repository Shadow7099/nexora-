import { NextResponse, type NextRequest } from "next/server";

// Comprobación optimista: sin cookie de sesión no tiene sentido renderizar una
// zona privada. La verificación real (sesión en BD, rol, empresa) ocurre en el servidor.
const PRIVATE = ["/admin", "/app", "/plataforma", "/autorizacion", "/cambiar-clave"];
const COOKIES = ["__Host-nexora_session", "nexora_session"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !COOKIES.some((c) => req.cookies.has(c))) {
    const url = new URL("/ingresar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
