import { ImageResponse } from "next/og";

// Ícono de la app (pestaña del navegador y app instalada en el celular).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<Mark size={512} />, size);
}

export function Mark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #2546b8 0%, #7a4fd6 100%)",
        borderRadius: size * 0.22,
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32">
        <path d="M10 22V10l12 12V10" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
