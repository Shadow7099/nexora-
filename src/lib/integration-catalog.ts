/**
 * Catálogo de integraciones: qué pide cada plataforma. Lo usan el servidor
 * (validar y probar) y la pantalla (formulario). No contiene secretos.
 *
 * Marca blanca: cada empresa conecta SUS propias cuentas (su página de
 * Facebook, su TikTok, su número de WhatsApp, su facturador, su llave de
 * Claude). La plataforma solo tiene la llave de Claude del asistente de la
 * página de inicio de Nexora.
 */

export type IntegrationField = {
  key: string;
  label: string;
  /** Token, llave o contraseña: se cifra y nunca se vuelve a mostrar. */
  secret?: boolean;
  optional?: boolean;
  placeholder?: string;
  help?: string;
};

export type IntegrationProvider = {
  id: string;
  name: string;
  group: "Redes sociales y mensajería" | "Facturación electrónica" | "Correo" | "Inteligencia artificial";
  description: string;
  fields: IntegrationField[];
  /** Pasos para conseguir los datos. */
  howTo: string[];
  docsUrl: string;
  /** Dónde se configura: en cada empresa o en la plataforma. */
  scope: "company" | "platform" | "both";
  /** Solo una conexión del grupo puede estar activa (p. ej. un facturador). */
  exclusiveGroup?: string;
};

export const INTEGRATIONS: IntegrationProvider[] = [
  {
    id: "META",
    name: "Facebook e Instagram (Meta)",
    group: "Redes sociales y mensajería",
    description: "Tu página de Facebook y la cuenta de Instagram unida a ella: mensajes, comentarios y clientes potenciales de formularios de anuncios.",
    fields: [
      { key: "pageId", label: "ID de la página de Facebook", placeholder: "123456789012345" },
      { key: "instagramId", label: "ID de la cuenta de Instagram (opcional)", optional: true, placeholder: "17841400000000000" },
      { key: "pageAccessToken", label: "Token de acceso de la página", secret: true, help: "Token de larga duración con pages_messaging, pages_manage_metadata, pages_read_engagement, leads_retrieval e instagram_basic." },
      { key: "appSecret", label: "Clave secreta de la app de Meta", secret: true, optional: true, help: "Sirve para verificar que los avisos (webhooks) vienen de Meta." },
    ],
    howTo: [
      "En developers.facebook.com crea una app de tipo Empresa y agrega los productos Messenger, Instagram y Webhooks.",
      "En Meta Business Suite → Configuración → Usuarios del sistema, genera un token para tu página con los permisos indicados.",
      "El ID de la página está en Facebook → tu página → Información → Transparencia de la página.",
    ],
    docsUrl: "https://developers.facebook.com/docs/graph-api/get-started",
    scope: "company",
  },
  {
    id: "TIKTOK",
    name: "TikTok for Business",
    group: "Redes sociales y mensajería",
    description: "Tu cuenta publicitaria de TikTok: clientes potenciales de formularios de anuncios y métricas de campañas.",
    fields: [
      { key: "advertiserId", label: "ID de la cuenta publicitaria (Advertiser ID)", placeholder: "7000000000000000000" },
      { key: "appId", label: "App ID de TikTok for Developers", optional: true },
      { key: "accessToken", label: "Access token de la Marketing API", secret: true, help: "Se obtiene al autorizar tu app en TikTok for Business (permiso de lectura de anuncios y leads)." },
      { key: "appSecret", label: "Secret de la app", secret: true, optional: true },
    ],
    howTo: [
      "En business-api.tiktok.com crea una app de desarrollador y pide acceso a la Marketing API.",
      "Autoriza la app con tu cuenta publicitaria y copia el access token de larga duración.",
      "El Advertiser ID aparece en TikTok Ads Manager, arriba a la derecha.",
    ],
    docsUrl: "https://business-api.tiktok.com/portal/docs",
    scope: "company",
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp Business (Cloud API)",
    group: "Redes sociales y mensajería",
    description: "Tu número de WhatsApp Business para recibir mensajes y enviar plantillas aprobadas por Meta.",
    fields: [
      { key: "phoneNumberId", label: "ID del número de teléfono", placeholder: "100000000000000" },
      { key: "businessAccountId", label: "ID de la cuenta de WhatsApp Business (WABA)", placeholder: "100000000000000" },
      { key: "accessToken", label: "Token de acceso permanente", secret: true, help: "Token de un usuario del sistema con whatsapp_business_messaging y whatsapp_business_management." },
      { key: "appSecret", label: "Clave secreta de la app de Meta", secret: true, optional: true, help: "Necesaria para recibir los mensajes en el CRM: verifica que los avisos vienen de Meta." },
    ],
    howTo: [
      "En developers.facebook.com agrega el producto WhatsApp a tu app de Meta.",
      "En WhatsApp → Configuración de la API copia el ID del número y el de la cuenta.",
      "Genera un token permanente desde Meta Business Suite → Usuarios del sistema.",
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    scope: "company",
  },
  {
    id: "LEADS",
    name: "Entrada de leads (TikTok, formularios web, Zapier o Make)",
    group: "Redes sociales y mensajería",
    description: "Una dirección privada que recibe clientes potenciales y los crea en el CRM. Úsala con los formularios de TikTok (vía Zapier o Make) o el formulario de tu página web.",
    fields: [],
    howTo: [
      "Toca «Guardar» para crear tu dirección privada y cópiala.",
      "En Zapier o Make: disparador «TikTok Lead Generation → New lead» y acción «Webhook → POST» a esa dirección, con un JSON {\"name\", \"phone\", \"email\", \"message\", \"campaign\", \"source\": \"TIKTOK\"}.",
      "Desde tu página web, envía el mismo JSON con \"source\": \"WEB\". No compartas la dirección: quien la tenga puede crear leads.",
    ],
    docsUrl: "https://business-api.tiktok.com/portal/docs?id=1739088223290369",
    scope: "company",
  },
  {
    id: "SIIGO",
    name: "Siigo Nube",
    group: "Facturación electrónica",
    description: "Factura electrónica ante la DIAN a través de tu cuenta de Siigo.",
    fields: [
      { key: "username", label: "Usuario de la API (correo)", placeholder: "facturacion@tuempresa.com" },
      { key: "partnerId", label: "Partner-Id", placeholder: "NombreDeTuIntegracion" },
      { key: "accessKey", label: "Access Key", secret: true },
    ],
    howTo: ["En Siigo Nube → Configuración → Alianzas → Credenciales de integración, genera el Access Key.", "El Partner-Id es el nombre de tu integración (sin espacios)."],
    docsUrl: "https://siigoapi.docs.apiary.io/",
    scope: "company",
    exclusiveGroup: "einvoice",
  },
  {
    id: "ALEGRA",
    name: "Alegra",
    group: "Facturación electrónica",
    description: "Factura electrónica ante la DIAN a través de tu cuenta de Alegra.",
    fields: [
      { key: "email", label: "Correo de tu cuenta de Alegra" },
      { key: "token", label: "Token de la API", secret: true },
    ],
    howTo: ["En Alegra → Configuración → Integraciones → API, copia el token."],
    docsUrl: "https://developer.alegra.com/",
    scope: "company",
    exclusiveGroup: "einvoice",
  },
  {
    id: "RESEND",
    name: "Correo (Resend)",
    group: "Correo",
    description: "Envía correos desde tu propio dominio: facturas, recordatorios y avisos a clientes.",
    fields: [
      { key: "fromEmail", label: "Correo remitente", placeholder: "hola@tuempresa.com" },
      { key: "fromName", label: "Nombre del remitente", placeholder: "Tu empresa" },
      { key: "apiKey", label: "API key", secret: true },
    ],
    howTo: ["En resend.com verifica tu dominio y crea una API key con permiso de envío."],
    docsUrl: "https://resend.com/docs",
    scope: "company",
  },
  {
    id: "CLAUDE",
    name: "Claude (Anthropic)",
    group: "Inteligencia artificial",
    description: "Llave de la API de Claude para el asistente: responde con tu información y nunca inventa datos.",
    fields: [{ key: "apiKey", label: "API key de Anthropic", secret: true, placeholder: "sk-ant-…", help: "El uso se cobra en tu cuenta de Anthropic según los mensajes." }],
    howTo: ["En console.anthropic.com → API keys, crea una llave y cópiala aquí.", "Define un límite de gasto mensual en Plans & Billing."],
    docsUrl: "https://docs.anthropic.com/",
    scope: "both",
  },
];

export const integrationById = (id: string) => INTEGRATIONS.find((p) => p.id === id);
export const companyIntegrations = INTEGRATIONS.filter((p) => p.scope !== "platform");
export const platformIntegrations = INTEGRATIONS.filter((p) => p.scope !== "company");
