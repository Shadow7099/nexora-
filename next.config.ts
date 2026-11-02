import type { NextConfig } from "next";

// Cabeceras de seguridad para todas las rutas.
// La geolocalización y la cámara solo se permiten en el propio origen.
// CSP: todo se sirve desde el propio origen (sin CDN ni scripts de terceros).
// Next.js y el selector de tema usan scripts en línea para arrancar, por eso
// 'unsafe-inline' en scripts; aun así se bloquea cualquier script externo, los
// iframes, los plugins y el envío de formularios a otros sitios.
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Casi todas las páginas dependen del usuario y la empresa: renderizado dinámico
  // sin Cache Components, más simple de razonar y sin riesgo de cachear datos de otro tenant.
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
