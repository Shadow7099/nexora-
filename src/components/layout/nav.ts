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
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Última fase entregada y probada. Las secciones de fases posteriores se muestran deshabilitadas. */
export const CURRENT_PHASE = 1;

export type NavItem = { href: string; label: string; icon: LucideIcon; phase: number };

/** Fase en la que cada sección queda funcional (para no anunciar lo que aún no existe). */
export const adminNav: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard, phase: 7 },
  { href: "/admin/asistencia", label: "Asistencia", icon: ClipboardCheck, phase: 4 },
  { href: "/admin/empleados", label: "Empleados", icon: Users, phase: 2 },
  { href: "/admin/sedes", label: "Sedes y QR", icon: Building2, phase: 3 },
  { href: "/admin/horarios", label: "Horarios", icon: CalendarClock, phase: 3 },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: Inbox, phase: 5 },
  { href: "/admin/pre-nomina", label: "Pre-nómina", icon: Wallet, phase: 6 },
  { href: "/admin/reportes", label: "Reportes", icon: FileSpreadsheet, phase: 7 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings, phase: 2 },
];

export const employeeNav: NavItem[] = [
  { href: "/app", label: "Inicio", icon: Home, phase: 4 },
  { href: "/app/historial", label: "Historial", icon: BarChart3, phase: 4 },
  { href: "/app/solicitudes", label: "Solicitudes", icon: ListChecks, phase: 5 },
];

export function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(`${href}/`);
}
