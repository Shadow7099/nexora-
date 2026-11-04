/** Texto de la autorización de datos, compartido por /autorizacion y /registro. */
// TEXTO BORRADOR: debe revisarlo un abogado antes del piloto (Ley 1581 de 2012 y Decreto 1377 de 2013).
export const CONSENT_ITEMS = [
  ["Qué datos", "Nombre, documento, cargo, correo, teléfono, horarios, marcaciones de entrada y salida, y la ubicación del celular en el momento de marcar."],
  ["Para qué", "Controlar la asistencia, calcular la jornada y las horas extra, y preparar la estimación de nómina de tu empleador."],
  ["Ubicación", "Solo se toma cuando tú marcas entrada o salida. No hay rastreo continuo."],
  ["Biometría", "No se recogen huellas ni fotos. Si usas huella o rostro en tu celular, lo verifica el propio celular; Nexora no los recibe."],
  ["Tus derechos", "Conocer, actualizar, rectificar y pedir la supresión de tus datos, y revocar esta autorización, escribiendo al responsable del tratamiento (tu empleador)."],
] as const;
