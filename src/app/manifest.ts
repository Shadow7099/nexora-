import type { MetadataRoute } from "next";

// Permite "Agregar a la pantalla de inicio": el empleado abre Nexora como una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexora · Asistencia",
    short_name: "Nexora",
    description: "Marcación de asistencia con QR por sede.",
    lang: "es-CO",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#121318",
    theme_color: "#2546b8",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
