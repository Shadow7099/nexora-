import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileSpreadsheet,
  Home,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Rocket,
  Scale,
  Send,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Última fase entregada y probada. Las secciones de fases posteriores se abren en modo vista previa. */
export const CURRENT_PHASE = 8;

export type NavItem = { href: string; label: string; icon: LucideIcon; phase: number };

/**
 * Fase en la que cada sección queda completa; antes se muestra como vista previa honesta.
 * Hechas: 1 a 8.
 */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, phase: 2 },
  { href: "/admin/primeros-pasos", label: "Primeros pasos", icon: Rocket, phase: 8 },
  { href: "/admin/asistencia", label: "Asistencia", icon: ClipboardCheck, phase: 2 },
  { href: "/admin/empleados", label: "Empleados", icon: Users, phase: 2 },
  { href: "/admin/sedes", label: "Sedes y QR", icon: Building2, phase: 2 },
  { href: "/admin/horarios", label: "Horarios", icon: CalendarClock, phase: 2 },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: Inbox, phase: 2 },
  { href: "/admin/pre-nomina", label: "Pre-nómina", icon: Wallet, phase: 6 },
  { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet, phase: 7 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings, phase: 2 },
];

export const employeeNav: NavItem[] = [
  { href: "/app", label: "Inicio", icon: Home, phase: 2 },
  { href: "/app/historial", label: "Historial", icon: BarChart3, phase: 2 },
  { href: "/app/solicitudes", label: "Solicitudes", icon: ListChecks, phase: 2 },
];

export function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}

export const platformNav: NavItem[] = [
  { href: "/plataforma", label: "Empresas", icon: Building2, phase: 2 },
  { href: "/plataforma/solicitudes", label: "Solicitudes", icon: Inbox, phase: 8 },
  { href: "/plataforma/invitaciones", label: "Invitaciones", icon: Send, phase: 8 },
  { href: "/plataforma/parametros", label: "Parámetros laborales", icon: Scale, phase: 6 },
];
