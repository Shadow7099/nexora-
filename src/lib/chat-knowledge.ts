/**
 * Base de conocimiento del asistente de la página de inicio. Es la única
 * fuente de verdad: las respuestas sin IA salen de aquí y el modo con IA
 * (Claude) la recibe como contexto y no puede afirmar nada que no esté aquí.
 */

export type ChatLink = { label: string; href: string };
export type Intent = { key: string; keywords: string[]; answer: string; links?: ChatLink[]; suggestions?: string[] };

export const REGISTER: ChatLink = { label: "Crear mi cuenta", href: "/registro" };
export const CONTACT: ChatLink = { label: "Prefiero que me contacten", href: "/#solicitar" };
export const PRICES: ChatLink = { label: "Ver precios", href: "/#precios" };
export const LOGIN: ChatLink = { label: "Ingresar", href: "/ingresar" };

export const STARTERS = ["¿Cuánto cuesta?", "¿Cómo marcan los empleados?", "¿Necesito comprar equipos?", "¿Cómo me registro?"];

export const INTENTS: Intent[] = [
  {
    key: "greeting",
    keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "saludos"],
    answer: "¡Hola! Soy el asistente de Nexora. Te ayudo con dudas sobre el control de asistencia con QR, la pre-nómina, los precios o cómo registrarte. ¿Qué quieres saber?",
    suggestions: STARTERS,
  },
  {
    key: "prices",
    keywords: ["precio", "precios", "cuesta", "cuanto vale", "valor", "plan", "planes", "tarifa", "pagar", "cobran", "mensualidad", "costo"],
    answer:
      "Hay tres planes mensuales en pesos colombianos, con todas las funciones incluidas:\n• Básico: $59.900, hasta 5 empleados.\n• Empresa: $99.900, hasta 15 empleados.\n• Negocios: $149.900, hasta 30 empleados.\nNo cobramos por sede ni hay equipos que comprar. Empiezas en modo prueba. ¿Más de 30 empleados? Déjanos tus datos y te hacemos una propuesta.",
    links: [PRICES, REGISTER],
    suggestions: ["¿Qué incluye cada plan?", "¿Cómo me registro?"],
  },
  {
    key: "how",
    keywords: ["como funciona", "como marcan", "marcar", "marcacion", "qr", "escanear", "entrada", "salida", "registrar entrada"],
    answer:
      "Así funciona:\n1. Imprimes desde Nexora un código QR por sede y lo pegas en la entrada.\n2. El empleado lo escanea con la cámara de su celular y toca «Registrar entrada» (o salida). Nexora verifica que el QR esté vigente, que sea su propio celular, que esté dentro de la sede y, si la activó, su huella.\n3. Tú ves la asistencia en tiempo real, apruebas horas extra y calculas la pre-nómina.\nLa hora la pone el servidor, no el celular.",
    links: [REGISTER],
    suggestions: ["¿Pueden marcar desde la casa?", "¿Y si no tienen celular?"],
  },
  {
    key: "hardware",
    keywords: ["equipo", "equipos", "reloj", "biometrico", "lector", "hardware", "instalar", "app", "aplicacion", "descargar"],
    answer:
      "No necesitas comprar equipos: solo un QR impreso por sede y el celular que el empleado ya tiene. Tampoco hay que instalar ninguna app; Nexora funciona en el navegador del celular o del computador.",
    links: [REGISTER],
    suggestions: ["¿Cómo marcan los empleados?", "¿Cuánto cuesta?"],
  },
  {
    key: "location",
    keywords: ["casa", "desde la casa", "desde casa", "desde mi casa", "desde otro lado", "ubicacion", "gps", "lejos", "trampa", "hacer trampa", "otro lugar", "rastreo", "rastrear", "radio"],
    answer:
      "Nexora compara la ubicación del celular con el área de la sede solo en el momento de marcar (no hay rastreo continuo). Si está lejos, la marcación se rechaza y tú ves el intento. Cada sede tiene su radio permitido, por defecto 80 metros, y lo puedes ajustar.",
    suggestions: ["¿Alguien puede marcar por otro?", "¿Qué pasa con los datos?"],
  },
  {
    key: "impersonation",
    keywords: ["por otro", "suplantar", "suplantacion", "amigo", "companero", "huella", "rostro", "passkey", "su celular", "vincular"],
    answer:
      "Cada empleado marca solo desde su propio celular: la primera vez queda vinculado y un celular nuevo necesita tu aprobación. Además puede activar su huella o rostro (lo verifica el propio celular; Nexora no guarda la huella), así nadie marca por él aunque tenga su celular.",
    suggestions: ["¿Pueden marcar desde la casa?", "¿Y si no tienen celular?"],
  },
  {
    key: "no_phone",
    keywords: ["no tiene celular", "sin celular", "sin datos", "no tiene datos", "internet", "sin internet", "no tienen celular"],
    answer:
      "Si un empleado no tiene celular o datos, puedes desactivar la exigencia de celular vinculado, o el administrador registra su jornada a mano con un motivo, que queda en la auditoría.",
    suggestions: ["¿Cómo marcan los empleados?"],
  },
  {
    key: "payroll",
    keywords: ["nomina", "pre-nomina", "prenomina", "liquidar", "liquidacion", "contador", "dian", "electronica", "salario", "prestaciones", "aportes", "seguridad social"],
    answer:
      "Nexora calcula una pre-nómina estimada por quincena o mes: salario, recargos nocturnos, dominicales y festivos, horas extra aprobadas, aportes y prestaciones, cada línea con su explicación y la norma de donde sale. Es una estimación para tu contador: no hace la nómina electrónica ante la DIAN ni reemplaza la revisión de un profesional.",
    suggestions: ["¿Qué reglas laborales aplica?", "¿Cuánto cuesta?"],
  },
  {
    key: "rules",
    keywords: ["ley", "recargo", "recargos", "dominical", "festivo", "nocturno", "nocturna", "42 horas", "jornada", "2466", "horas extra", "extras"],
    answer:
      "Nexora aplica a cada minuto trabajado la regla vigente ese día: el recargo nocturno (35 %) desde las 7:00 p. m. por la Ley 2466 de 2025; el recargo dominical y festivo, que es del 90 % desde el 1 de julio de 2026 y sube al 100 % en julio de 2027; y la jornada máxima de 42 horas semanales desde el 15 de julio de 2026. Las horas extra se detectan solas y tú decides cuántas autorizas; el tiempo registrado nunca se borra.",
    suggestions: ["¿Cómo funciona la pre-nómina?"],
  },
  {
    key: "data",
    keywords: ["datos", "privacidad", "seguridad", "seguro", "proteccion", "1581", "habeas", "informacion"],
    answer:
      "Cada empleado autoriza el tratamiento de sus datos en su primer ingreso (Ley 1581 de 2012). La ubicación solo se toma al marcar, la huella nunca sale de su celular y cada empresa ve únicamente sus propios datos. Las marcaciones no se pueden editar ni borrar: las correcciones quedan aparte, con autor y motivo.",
    suggestions: ["¿Cómo me registro?"],
  },
  {
    key: "register",
    keywords: ["registr", "crear cuenta", "empezar", "comenzar", "inscribir", "probar", "prueba", "demo", "como empiezo", "abrir cuenta"],
    answer:
      "Registrarte toma un minuto: toca «Crear mi cuenta», escribe el nombre de tu negocio, tu nombre, correo y una contraseña. Entras en modo prueba y una guía de primeros pasos te lleva por la configuración: reglas, sedes, turnos, empleados, horarios y QR (unos 20 minutos).",
    links: [REGISTER, CONTACT],
    suggestions: ["¿Cuánto cuesta?", "¿Necesito comprar equipos?"],
  },
  {
    key: "features",
    keywords: ["funciones", "que hace", "que incluye", "incluye", "caracteristicas", "reportes", "excel", "pdf", "turnos", "horarios", "sedes", "novedades", "vacaciones", "incapacidad"],
    answer:
      "Incluye: sedes con su QR, turnos (madrugada, nocturnos, partidos y rotativos), marcación con celular y huella, asistencia en tiempo real, horas extra con aprobación, novedades (vacaciones, incapacidades, permisos), pre-nómina estimada y reportes en Excel, CSV y PDF. Todos los planes tienen todas las funciones.",
    links: [REGISTER],
    suggestions: ["¿Cuánto cuesta?", "¿Cómo marcan los empleados?"],
  },
  {
    key: "contact",
    keywords: ["humano", "persona", "asesor", "contacto", "contactar", "llamar", "whatsapp", "telefono", "hablar con", "soporte", "ayuda"],
    answer: "Con gusto te contactamos. Déjanos tus datos en el formulario «Prefiero que me contacten» y te escribimos muy pronto.",
    links: [CONTACT],
  },
  {
    key: "login",
    keywords: ["ingresar", "iniciar sesion", "entrar", "olvide", "contrasena", "clave", "login"],
    answer:
      "Si ya tienes cuenta, ingresa con tu correo y contraseña. ¿Olvidaste la contraseña? Si eres empleado, tu administrador te da una temporal; si eres administrador, escríbenos y te ayudamos.",
    links: [LOGIN, CONTACT],
  },
];

export const FALLBACK: Intent = {
  key: "fallback",
  keywords: [],
  answer:
    "No estoy seguro de haberte entendido. Puedo ayudarte con precios, cómo marcan los empleados, la pre-nómina, las reglas laborales colombianas, la seguridad de los datos o cómo registrarte. Si prefieres, te contactamos.",
  links: [CONTACT],
  suggestions: STARTERS,
};

/** Texto que recibe el modelo como base de conocimiento (todas las respuestas aprobadas). */
export const KNOWLEDGE_TEXT = INTENTS.filter((i) => i.key !== "greeting")
  .map((i) => `- ${i.answer.replace(/\n/g, " ")}`)
  .join("\n");
