/** Error de negocio con mensaje apto para mostrar al usuario (en español). */
export class AppError extends Error {
  constructor(
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "LIMIT",
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const forbidden = () => new AppError("FORBIDDEN", "No tienes permiso para esta acción.");
// Un recurso de otra empresa responde igual que uno inexistente: no revela que existe.
export const notFound = (what = "El registro") => new AppError("NOT_FOUND", `${what} no existe.`);

/** Resultado serializable para formularios con useActionState. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, string>;
} | null;

export function toActionState(e: unknown): ActionState {
  if (e instanceof AppError) return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
  console.error(e);
  return { ok: false, message: "Ocurrió un error inesperado. Intenta de nuevo." };
}
