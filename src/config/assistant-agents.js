import { ROLE_KEYS } from "./roles.js";

export const AGENT_PROFILES = {
  [ROLE_KEYS.ADMIN]: {
    key: "controller",
    name: {
      es: "Agente controlador",
      en: "Controller agent",
    },
    tone: {
      es: "directo, ejecutivo y orientado a aprobaciones, riesgos y seguimiento",
      en: "direct, executive, and focused on approvals, risks, and supervision",
    },
    supervisionWeight: "maximum",
  },
  [ROLE_KEYS.OPERATOR]: {
    key: "technical",
    name: {
      es: "Agente tecnico",
      en: "Technical agent",
    },
    tone: {
      es: "practico, operativo y centrado en pasos accionables",
      en: "practical, operational, and focused on actionable steps",
    },
    supervisionWeight: "medium",
  },
  [ROLE_KEYS.BACHILLER]: {
    key: "educational",
    name: {
      es: "Agente educativo",
      en: "Educational agent",
    },
    tone: {
      es: "didactico, gradual y con supervision intensiva",
      en: "didactic, gradual, and heavily supervised",
    },
    supervisionWeight: "high",
  },
  [ROLE_KEYS.FP]: {
    key: "advanced",
    name: {
      es: "Agente avanzado",
      en: "Advanced agent",
    },
    tone: {
      es: "tecnico, mas profundo que bachiller y con autonomia parcial",
      en: "technical, deeper than bachiller, and with partial autonomy",
    },
    supervisionWeight: "medium-high",
  },
};

const SENSITIVE_PATTERNS = [
  /cu[aá]nt(a|o)s?.*piezas?/i,
  /stock/i,
  /inventario/i,
  /cu[aá]ndo.*lleg/i,
  /\beta\b/i,
  /llegada/i,
  /reposici[oó]n/i,
  /d[oó]nde.*instal/i,
  /instal/i,
  /monta/i,
  /ubica/i,
  /d[oó]nde.*va/i,
  /qu[eé] operador/i,
  /qu[eé] zona/i,
  /qu[eé] pieza/i,
];

const CONVERSATIONAL_PATTERNS = [
  /hola/i,
  /gracias/i,
  /ay[uú]dame/i,
  /expl[ií]ca/i,
  /qu[eé] ves/i,
  /resumen/i,
  /estado/i,
  /c[aá]mara/i,
  /visi[oó]n/i,
  /aprend/i,
];

export function classifyAssistantIntent(prompt) {
  const normalizedPrompt = String(prompt ?? "").trim();

  if (!normalizedPrompt) {
    return {
      key: "empty",
      requiresApproval: false,
      workflowType: "conversation",
    };
  }

  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalizedPrompt))) {
    return {
      key: "sensitive_operation",
      requiresApproval: true,
      workflowType: "approval",
    };
  }

  if (CONVERSATIONAL_PATTERNS.some((pattern) => pattern.test(normalizedPrompt))) {
    return {
      key: "free_conversation",
      requiresApproval: false,
      workflowType: "conversation",
    };
  }

  return {
    key: "guided_consultation",
    requiresApproval: false,
    workflowType: "conversation",
  };
}

function describeDetections(detections, fallback) {
  return detections.length
    ? [...new Set(detections.map((item) => item.elementLabel ?? item.class))].join(", ")
    : fallback;
}

export function createRoleAwareReply({
  detections,
  inventoryItems,
  lang,
  messages,
  prompt,
  role,
}) {
  const agent = AGENT_PROFILES[role] ?? AGENT_PROFILES[ROLE_KEYS.BACHILLER];
  const detectionSummary = describeDetections(
    detections,
    lang === "es" ? "sin detecciones nuevas" : "no fresh detections",
  );
  const latestMessage = messages.at(-1)?.content ?? "";
  const intent = classifyAssistantIntent(prompt);
  const lowStockItem = inventoryItems.find((item) => Number(item.stock) <= 2);

  if (lang === "en") {
    if (role === ROLE_KEYS.ADMIN) {
      return `Controller status: intent ${intent.key}. Visual context: ${detectionSummary}. ${lowStockItem ? `Critical stock candidate: ${lowStockItem.family} in ${lowStockItem.zone}.` : "No critical stock entry loaded."}`;
    }

    if (role === ROLE_KEYS.OPERATOR) {
      return `Technical guidance: ${intent.requiresApproval ? "this request touches stock, ETA, or installation, so admin approval is required before execution." : "this is a free consultation and does not need prior approval."} Visual context: ${detectionSummary}. Last exchange: ${latestMessage || "none"}.`;
    }

    if (role === ROLE_KEYS.FP) {
      return `Advanced guidance: ${intent.requiresApproval ? "you can inspect the case, but the final decision stays gated for admin review." : "you may continue with guided reasoning without blocking the chat."} Current visual context: ${detectionSummary}.`;
    }

    return `Educational guidance: ${intent.requiresApproval ? "the topic is sensitive, so the system will ask for admin supervision before acting." : "this is a learning conversation and the assistant can answer directly."} Current visual context: ${detectionSummary}.`;
  }

  if (role === ROLE_KEYS.ADMIN) {
    return `Cerebro controlador: intencion ${intent.key}. Contexto visual: ${detectionSummary}. ${lowStockItem ? `Posible criticidad en ${lowStockItem.family} de ${lowStockItem.zone}.` : "Sin criticidad de stock cargada ahora mismo."}`;
  }

  if (role === ROLE_KEYS.OPERATOR) {
    return `Agente tecnico: ${intent.requiresApproval ? "esta consulta toca stock, llegada o instalacion, asi que requiere validacion del admin antes de ejecutar nada." : "esto es una conversacion libre y no necesita aprobacion previa."} Contexto visual actual: ${detectionSummary}.`;
  }

  if (role === ROLE_KEYS.FP) {
    return `Agente avanzado: ${intent.requiresApproval ? "puedes analizar el caso, pero la confirmacion final queda supervisada por admin." : "puedes continuar con razonamiento guiado sin bloquear la conversacion."} Contexto visual actual: ${detectionSummary}.`;
  }

  return `Agente educativo: ${intent.requiresApproval ? "el tema es sensible y se elevara al admin antes de autorizar una accion." : "esto es una consulta de aprendizaje y puedo responder directamente."} Contexto visual actual: ${detectionSummary}.`;
}
