import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** URL pública del sitio (APP_URL si está definida; si no, el dominio de la solicitud). */
export async function publicBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function qrSvg(publicCode: string) {
  const url = `${await publicBaseUrl()}/m/${publicCode}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1020", light: "#ffffff" } });
  return { url, svg };
}
