/**
 * Ilustraciones del punto de venta, dibujadas en SVG (nítidas en cualquier
 * pantalla, sin subir fotos): ovillo del color exacto de cada variante y un
 * dibujo por tipo de categoría.
 */

/** Oscurece o aclara un color hex (factor < 1 oscurece). */
function shade(hex: string, f: number) {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)} ${c((n >> 8) & 255)} ${c(n & 255)})`;
}

/** Ovillo de hilo del color indicado. */
export function YarnBall({ hex = "#EC4899", className }: { hex?: string; className?: string }) {
  const line = shade(hex, 0.72);
  const light = hex.toUpperCase() === "#FFFFFF" || hex.toUpperCase() === "#F3E9D2";
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="44" fill={hex} stroke={light ? "#CBD5E1" : line} strokeWidth="3" />
      <g fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <path d="M22 48c22-10 52-8 74 6" />
        <path d="M18 64c26-12 58-8 82 8" />
        <path d="M24 82c20-12 48-10 68 2" />
        <path d="M44 18c-10 22-8 54 8 82" />
        <path d="M62 16c-12 24-8 60 10 86" />
        <path d="M82 22c-8 18-6 44 6 70" />
      </g>
      <ellipse cx="44" cy="38" rx="10" ry="6" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 44 38)" />
      <path d="M96 80c10 8 14 16 12 24" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Crochet({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-full">
      <YarnShape hex={color} cx={46} cy={70} r={30} />
      <g transform="rotate(35 70 60)">
        <rect x="64" y="8" width="10" height="92" rx="5" fill="#94A3B8" />
        <rect x="62" y="56" width="14" height="30" rx="5" fill={shade(color, 0.7)} />
        <path d="M69 8c-6 0-9 6-6 10" fill="none" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Needles({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-full">
      <YarnShape hex={color} cx={60} cy={74} r={32} />
      <g strokeLinecap="round">
        <line x1="22" y1="16" x2="92" y2="104" stroke="#B45309" strokeWidth="7" />
        <line x1="98" y1="16" x2="28" y2="104" stroke="#B45309" strokeWidth="7" />
        <circle cx="22" cy="16" r="7" fill="#78350F" />
        <circle cx="98" cy="16" r="7" fill="#78350F" />
      </g>
    </svg>
  );
}

function Embroidery({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-full">
      <circle cx="60" cy="62" r="42" fill="#FEF3C7" stroke="#B45309" strokeWidth="8" />
      <circle cx="60" cy="62" r="34" fill="none" stroke="#D97706" strokeWidth="2" />
      <g fill={color}>
        <circle cx="52" cy="54" r="8" /><circle cx="68" cy="54" r="8" /><circle cx="52" cy="70" r="8" /><circle cx="68" cy="70" r="8" />
      </g>
      <circle cx="60" cy="62" r="5" fill="#FACC15" />
      <rect x="54" y="10" width="12" height="12" rx="3" fill="#B45309" />
    </svg>
  );
}

function Accessories({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-full">
      <g fill="none" stroke={shade(color, 0.6)} strokeWidth="7" strokeLinecap="round">
        <circle cx="38" cy="86" r="14" /><circle cx="70" cy="92" r="14" />
        <line x1="46" y1="74" x2="92" y2="16" /><line x1="62" y1="80" x2="34" y2="18" />
      </g>
      <circle cx="96" cy="70" r="12" fill={color} />
    </svg>
  );
}

function Box({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="size-full">
      <path d="M20 42 60 22l40 20v46L60 108 20 88Z" fill={color} opacity="0.85" />
      <path d="M20 42 60 62l40-20M60 62v46" fill="none" stroke={shade(color, 0.6)} strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

function YarnShape({ hex, cx, cy, r }: { hex: string; cx: number; cy: number; r: number }) {
  const line = shade(hex, 0.7);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={hex} stroke={line} strokeWidth="3" />
      <g fill="none" stroke={line} strokeWidth="2.5" opacity="0.85">
        <path d={`M${cx - r + 4} ${cy - 6}c${r * 0.6}-${r * 0.3} ${r * 1.3}-${r * 0.2} ${r * 1.9} ${r * 0.2}`} />
        <path d={`M${cx - r + 6} ${cy + 10}c${r * 0.6}-${r * 0.3} ${r * 1.2}-${r * 0.2} ${r * 1.7} ${r * 0.2}`} />
        <path d={`M${cx - 6} ${cy - r + 2}c-${r * 0.3} ${r * 0.6}-${r * 0.2} ${r * 1.3} ${r * 0.2} ${r * 1.9}`} />
      </g>
    </g>
  );
}

/** Dibujo de una categoría del POS según su ícono. */
export function CategoryArt({ icon, color, className }: { icon: string; color: string; className?: string }) {
  return (
    <span className={className}>
      {icon === "yarn" ? <YarnBall hex={color} className="size-full" />
        : icon === "crochet" ? <Crochet color={color} />
        : icon === "needles" ? <Needles color={color} />
        : icon === "embroidery" ? <Embroidery color={color} />
        : icon === "accessories" ? <Accessories color={color} />
        : <Box color={color} />}
    </span>
  );
}
