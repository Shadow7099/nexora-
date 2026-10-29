export const documentTypeLabel = { CC: "Cédula de ciudadanía", CE: "Cédula de extranjería", PPT: "Permiso por protección temporal", PASAPORTE: "Pasaporte", TI: "Tarjeta de identidad" } as const;
export const contractTypeLabel = { INDEFINIDO: "Término indefinido", FIJO: "Término fijo", OBRA_LABOR: "Obra o labor", APRENDIZAJE: "Aprendizaje", PRESTACION_SERVICIOS: "Prestación de servicios" } as const;
export const salaryTypeLabel = { ORDINARIO: "Ordinario", INTEGRAL: "Integral" } as const;
export const payFrequencyLabel = { QUINCENAL: "Quincenal", MENSUAL: "Mensual" } as const;
export const roleLabel = { SUPERADMIN: "Plataforma", COMPANY_ADMIN: "Administrador", EMPLOYEE: "Empleado" } as const;

export const auditActionLabel: Record<string, string> = {
  "auth.login": "Inicio de sesión",
  "auth.login_failed": "Intento de ingreso fallido",
  "auth.locked": "Cuenta bloqueada por intentos fallidos",
  "auth.password_changed": "Cambio de contraseña",
  "privacy.consent": "Aceptó la autorización de datos",
  "employee.create": "Creó un empleado",
  "employee.update": "Editó un empleado",
  "employee.contract_change": "Cambió condiciones de contrato",
  "employee.deactivate": "Desactivó un empleado",
  "employee.reactivate": "Reactivó un empleado",
  "employee.password_reset": "Restableció una contraseña",
  "company.settings_update": "Cambió la configuración",
  "demo.seed": "Datos de demostración",
};
