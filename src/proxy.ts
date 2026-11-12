import { NextResponse, type NextRequest } from "next/server";

// Comprobación optimista: sin cookie de sesión no tiene sentido renderizar una
// zona privada. La verificación real (sesión en BD, rol, empresa) ocurre en el servidor.
const PRIVATE = ["/admin", "/app", "/m", "/imprimir", "/plataforma", "/autorizacion", "/cambiar-clave"];
const COOKIES = ["__Host-nexora_session", "nexora_session"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = COOKIES.some((c) => req.cookies.has(c));
  // Con sesión, la dirección principal lleva a la cuenta (no a la página de ventas).
  // ?ver=inicio deja ver la página de ventas igual.
  if (pathname === "/" && hasSession && req.nextUrl.searchParams.get("ver") !== "inicio") {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }
  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !hasSession) {
    const url = new URL("/ingresar", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
