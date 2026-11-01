import type { MetadataRoute } from "next";

// Permite "Agregar a la pantalla de inicio". display "browser": el ícono abre
// Nexora en el navegador. Con "standalone", iPhone le da al ícono cookies
// separadas de Safari (donde abre el QR al escanearlo) y el empleado tenía que
// ingresar y vincular el celular otra vez cada vez que cambiaba de uno a otro.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexora · Asistencia",
    short_name: "Nexora",
    description: "Marcación de asistencia con QR por sede.",
    lang: "es-CO",
    start_url: "/app",
    scope: "/",
    display: "browser",
    orientation: "portrait",
    background_color: "#121318",
    theme_color: "#2546b8",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
