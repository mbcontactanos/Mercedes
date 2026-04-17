import { createContext, useEffect, useMemo, useRef, useState } from "react";
import Peer from "peerjs";
import { sileo } from "sileo";
import {
  AGENT_PROFILES,
  classifyAssistantIntent,
  createRoleAwareReply,
} from "../config/assistant-agents.js";
import { DEFAULT_ROLE, ROLE_DEFINITIONS, ROLE_KEYS, getRoleLabel, normalizeRole } from "../config/roles.js";
import {
  INVENTORY_ITEMS,
  OPERATORS,
  QUICK_FILTERS,
  SYSTEM_LOGS,
} from "../config/mercedes-data.js";
import { ADMIN_PEER_ID } from "../config/realtime.js";
import { PART_REFERENCE_CATALOG } from "../config/parts-catalog.js";
import { insforge, insforgeAdmin } from "../lib/insforge.js";

export const AppContext = createContext(null);

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    content: "Camara lista para revisar stock, incidencias y llegadas previstas del turno actual.",
  },
];

const INITIAL_NOTIFICATIONS = {
  es: [
    {
      id: "notif-inicio",
      title: "Sistema preparado",
      description: "El hub de operaciones esta listo para recibir camaras moviles y solicitudes.",
      time: "Hace unos segundos",
      read: false,
    },
  ],
  en: [
    {
      id: "notif-initial",
      title: "System ready",
      description: "The operations hub is ready to receive mobile cameras and requests.",
      time: "A few seconds ago",
      read: false,
    },
  ],
};

const INITIAL_ACTIVITY_ITEMS = {
  es: [
    {
      id: "activity-1",
      category: "all",
      title: "Caja 84 localizada en el pasillo A3",
      time: "Hace 3 min",
      detail: "Verificacion por lector de inventario y confirmacion del sistema de picking.",
      source: "ORIGEN: OPERADOR_02",
      dot: "bg-black",
      highlighted: true,
    },
    {
      id: "activity-2",
      category: "alerts",
      title: "Pico de rendimiento detectado en Sector 7",
      time: "Hace 12 min",
      detail: "IA redirigiendo 4 agentes de clasificacion para compensar carga.",
      dot: "bg-slate-400",
    },
    {
      id: "activity-3",
      category: "logs",
      title: "Nuevo envio de alta prioridad llego al Muelle 03",
      time: "Hace 28 min",
      detail: "Prioridad Mercedes-AMG con confirmacion de escaneo y etiqueta roja.",
      chips: ["MUELLE 03", "PRIORIDAD"],
      dot: "bg-neutral-500",
    },
  ],
  en: [
    {
      id: "activity-1",
      category: "all",
      title: "Box 84 located in aisle A3",
      time: "3 min ago",
      detail: "Verified by inventory scanner and confirmed by the picking system.",
      source: "SOURCE: OPERATOR_02",
      dot: "bg-black",
      highlighted: true,
    },
    {
      id: "activity-2",
      category: "alerts",
      title: "Performance spike detected in Sector 7",
      time: "12 min ago",
      detail: "AI is redirecting 4 sorting agents to balance the load.",
      dot: "bg-slate-400",
    },
    {
      id: "activity-3",
      category: "logs",
      title: "New high-priority shipment reached Dock 03",
      time: "28 min ago",
      detail: "Mercedes-AMG priority order with scan confirmation and red tag.",
      chips: ["DOCK 03", "PRIORITY"],
      dot: "bg-neutral-500",
    },
  ],
};

const INITIAL_MOBILE_OPERATORS = [
  {
    id: "op-operator-01",
    name: "Laura Gomez",
    shift: "Operario",
    connected: false,
    activity: "Esperando emision desde movil",
    lastSeen: null,
    deviceName: "",
  },
  {
    id: "op-student-bach-01",
    name: "Alumno Bachiller",
    shift: "Bachiller",
    connected: false,
    activity: "Esperando emision desde movil",
    lastSeen: null,
    deviceName: "",
  },
  {
    id: "op-student-fp-01",
    name: "Alumno FP",
    shift: "Formacion Profesional",
    connected: false,
    activity: "Esperando emision desde movil",
    lastSeen: null,
    deviceName: "",
  },
];

const ADMIN_EMAILS = new Set(["admin@example.com", "mounirbella32@gmail.com"]);
const N8N_APPROVAL_WEBHOOK_URL = "https://n8n.servidor.dpdns.org/webhook/mercedes-voice-approval";
const KOKORO_TTS_ENDPOINT = "https://audio.servidor.dpdns.org/v1/audio/speech";

function createDatabaseUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function normalizeWakeWordTranscript(transcript) {
  const cleanedTranscript = String(transcript ?? "")
    .normalize("NFKC")
    .replace(/[.,;:!?¡¿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const loweredTranscript = cleanedTranscript.toLowerCase();
  const wakeWordMatch = loweredTranscript.match(/^(omar|o mar)\b\s*(.*)$/i);

  if (!wakeWordMatch) {
    return {
      cleanedTranscript,
      commandTranscript: cleanedTranscript,
      wakeWordDetected: false,
    };
  }

  return {
    cleanedTranscript,
    commandTranscript: wakeWordMatch[2]?.trim() ?? "",
    wakeWordDetected: true,
  };
}

function resolveKokoroEndpoint(voiceEndpoint) {
  if (!voiceEndpoint) {
    return KOKORO_TTS_ENDPOINT;
  }

  if (voiceEndpoint.endsWith("/web")) {
    return voiceEndpoint.replace(/\/web$/, "/v1/audio/speech");
  }

  return voiceEndpoint;
}

function mapApprovalRequest(row, lang) {
  return {
    id: row.id,
    operatorId: row.assigned_operator_id ?? row.requester_user_id,
    operatorName: row.requester_name ?? row.requester_user_id,
    requesterRole: row.requester_role,
    requesterRoleLabel: getRoleLabel(row.requester_role, lang),
    title:
      row.request_type === "voice_assistance"
        ? lang === "es"
          ? "Solicitud del asistente de voz"
          : "Voice assistant request"
        : lang === "es"
          ? "Solicitud de aprobacion"
          : "Approval request",
    detail: row.detail,
    transcript: row.transcript ?? "",
    approvalPolicy: row.approval_policy,
    status: row.status,
    requestedAt: row.requested_at,
  };
}

function mapAdminRequestStatus(status, lang) {
  const labels = {
    pending_user: lang === "es" ? "Pendiente del usuario" : "Pending user response",
    accepted_user: lang === "es" ? "Aceptada por el usuario" : "Accepted by user",
    rejected_user: lang === "es" ? "Rechazada por el usuario" : "Rejected by user",
  };

  return labels[status] ?? status;
}

function detectMobileContext() {
  if (typeof window === "undefined") {
    return false;
  }

  const isTouchDevice = navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  const isMobileUserAgent = /android|iphone|ipad|mobile/i.test(window.navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  return window.matchMedia("(max-width: 1024px)").matches || isMobileUserAgent || (isTouchDevice && isStandalone);
}

function hasInsforgeSessionHint() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie.includes("insforge_csrf_token=");
}

function detectInstallSupport() {
  if (typeof window === "undefined") {
    return {
      isAppleMobile: false,
      isMobileBrowser: false,
      needsManualInstall: false,
      shouldSuggestInstall: false,
      isStandalone: false,
    };
  }

  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isMobileBrowser =
    /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent) ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  return {
    isAppleMobile,
    isMobileBrowser,
    needsManualInstall: isAppleMobile && !isStandalone,
    shouldSuggestInstall: isMobileBrowser && !isStandalone,
    isStandalone,
  };
}

function normalizeOperators(rows) {
  if (!rows?.length) {
    return INITIAL_MOBILE_OPERATORS;
  }

  return rows.map((operator) => ({
    id: operator.id,
    name: operator.name,
    shift: operator.shift,
    connected: operator.connected ?? false,
    activity: operator.activity ?? "Esperando emision desde movil",
    lastSeen: operator.last_seen ?? null,
    deviceName: operator.device_name ?? "",
    status: operator.status,
  }));
}

function normalizeInventoryItems(rows, catalogRows = []) {
  if (!rows?.length) {
    return INVENTORY_ITEMS;
  }

  const catalogById = new Map(catalogRows.map((entry) => [entry.id, entry]));

  return rows.map((item) => {
    const catalogEntry = catalogById.get(item.id);

    return {
      ...item,
      family: item.family ?? catalogEntry?.name ?? item.id,
      category: item.category ?? catalogEntry?.category ?? "",
      estimated_length_mm: item.estimated_length_mm ?? catalogEntry?.estimated_length_mm ?? null,
      estimated_head_diameter_mm:
        item.estimated_head_diameter_mm ?? catalogEntry?.estimated_head_diameter_mm ?? null,
    };
  });
}

function normalizeSystemLogs(rows) {
  if (!rows?.length) {
    return SYSTEM_LOGS;
  }

  return rows.map((entry) => ({
    id: entry.id,
    level: entry.level,
    title: entry.title,
    detail: entry.detail,
    timestamp: entry.timestamp_label,
    category: entry.category ?? "logs",
  }));
}

function buildInventorySnapshot(rows = []) {
  return rows.map((item) => ({
    id: item.id,
    family: item.family,
    category: item.category ?? "",
    zone: item.zone ?? "",
    stock: Number(item.stock ?? 0),
    eta: item.eta ?? "",
    status: item.status ?? "",
    trend: item.trend ?? "",
    estimated_length_mm: item.estimated_length_mm ?? null,
    estimated_head_diameter_mm: item.estimated_head_diameter_mm ?? null,
  }));
}

function buildReferenceCatalogSnapshot(rows = []) {
  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    aliases: item.aliases ?? [],
    material: item.material ?? "",
    finish: item.finish ?? "",
    category: item.category ?? "",
    dimensionsMm: item.dimensionsMm ?? {},
    referenceImages: item.referenceImages ?? [],
    visualCues: item.visualCues ?? {},
  }));
}

function resolveInventoryItemFromPrompt(prompt, inventoryRows = []) {
  const normalizedPrompt = String(prompt ?? "").trim().toLowerCase();

  if (!normalizedPrompt || !inventoryRows.length) {
    return null;
  }

  const exactIdMatch = inventoryRows.find((item) => normalizedPrompt.includes(String(item.id ?? "").toLowerCase()));

  if (exactIdMatch) {
    return exactIdMatch;
  }

  const scored = inventoryRows
    .map((item) => {
      const searchableParts = [
        item.id,
        item.family,
        item.category,
        item.zone,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const score = searchableParts.reduce((currentScore, value) => {
        if (!value) {
          return currentScore;
        }

        if (normalizedPrompt.includes(value)) {
          return currentScore + 5;
        }

        const parts = value.split(/[\s-_/]+/).filter((entry) => entry.length > 2);
        return (
          currentScore +
          parts.reduce((partialScore, part) => partialScore + (normalizedPrompt.includes(part) ? 1 : 0), 0)
        );
      }, 0);

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.item ?? null;
}

function buildRealtimeInventoryReply({ item, lang, prompt, role, summary }) {
  const normalizedPrompt = String(prompt ?? "").toLowerCase();

  if (!item) {
    if (/\b(almacen|inventario|stock|piezas)\b/i.test(normalizedPrompt)) {
      return lang === "es"
        ? `Ahora mismo hay ${summary.totalUnits} unidades repartidas en ${summary.totalReferences} referencias del almacen. ${summary.lowStockReferences ? `${summary.lowStockReferences} referencias estan en stock bajo.` : "No hay referencias en stock bajo."}`
        : `There are currently ${summary.totalUnits} units across ${summary.totalReferences} warehouse references. ${summary.lowStockReferences ? `${summary.lowStockReferences} references are low on stock.` : "There are no low-stock references."}`;
    }

    return "";
  }

  if (role !== ROLE_KEYS.ADMIN) {
    if (/\b(stock|inventario|cu[aá]nt|eta|llega|reposici|d[oó]nde|ubic|instal|pieza)\b/i.test(normalizedPrompt)) {
      return lang === "es"
        ? `He identificado la referencia ${item.id}, ${item.family}, pero esta consulta requiere validacion del admin antes de mostrar stock, zona o llegada exactos.`
        : `I identified reference ${item.id}, ${item.family}, but this request needs admin validation before showing exact stock, zone, or arrival details.`;
    }

    return "";
  }

  if (/\b(cu[aá]nt|stock|quedan|inventario)\b/i.test(normalizedPrompt)) {
    return lang === "es"
      ? `Quedan ${item.stock} unidades de ${item.family} (${item.id}) en ${item.zone}. Estado: ${item.status}. ETA: ${item.eta}.`
      : `There are ${item.stock} units of ${item.family} (${item.id}) in ${item.zone}. Status: ${item.status}. ETA: ${item.eta}.`;
  }

  if (/\b(cu[aá]ndo|eta|llega|reposici)\b/i.test(normalizedPrompt)) {
    return lang === "es"
      ? `${item.family} (${item.id}) tiene como siguiente disponibilidad: ${item.eta}. Estado actual: ${item.status}.`
      : `${item.family} (${item.id}) has its next availability at ${item.eta}. Current status: ${item.status}.`;
  }

  if (/\b(d[oó]nde|ubic|zona|pasillo|muelle)\b/i.test(normalizedPrompt)) {
    return lang === "es"
      ? `${item.family} (${item.id}) esta ubicada en ${item.zone}. Stock actual: ${item.stock}. Estado: ${item.status}.`
      : `${item.family} (${item.id}) is located in ${item.zone}. Current stock: ${item.stock}. Status: ${item.status}.`;
  }

  if (/\b(qu[eé] pieza|identifica|nombre)\b/i.test(normalizedPrompt)) {
    return lang === "es"
      ? `La referencia detectada es ${item.family} (${item.id}), categoria ${item.category || "sin categoria"}, ubicada en ${item.zone}.`
      : `The detected reference is ${item.family} (${item.id}), category ${item.category || "uncategorized"}, located in ${item.zone}.`;
  }

  return lang === "es"
    ? `${item.family} (${item.id}) tiene ${item.stock} unidades en ${item.zone}. Estado: ${item.status}. ETA: ${item.eta}.`
    : `${item.family} (${item.id}) has ${item.stock} units in ${item.zone}. Status: ${item.status}. ETA: ${item.eta}.`;
}

function shouldPreferInventoryReply(workflowAnswer, item, role) {
  if (!item) {
    return false;
  }

  if (!workflowAnswer) {
    return true;
  }

  if (role !== ROLE_KEYS.ADMIN) {
    return false;
  }

  const normalizedAnswer = String(workflowAnswer).toLowerCase();
  const mentionsId = normalizedAnswer.includes(String(item.id).toLowerCase());
  const mentionsFamily = normalizedAnswer.includes(String(item.family).toLowerCase());
  const mentionsStock = normalizedAnswer.includes(String(item.stock));

  return !(mentionsId || mentionsFamily || mentionsStock);
}

function createRoleBoundOperator(profile, lang) {
  const role = normalizeRole(profile?.role);
  const roleLabel = getRoleLabel(role, lang);
  const displayName = profile?.display_name ?? roleLabel;
  const operatorIdByRole = {
    [ROLE_KEYS.OPERATOR]: "op-operator-01",
    [ROLE_KEYS.BACHILLER]: "op-student-bach-01",
    [ROLE_KEYS.FP]: "op-student-fp-01",
  };

  return {
    id: operatorIdByRole[role] ?? `profile-${profile?.user_id ?? "guest"}`,
    name: displayName,
    shift: roleLabel,
    connected: false,
    activity: lang === "es" ? "Esperando emision desde movil" : "Waiting for mobile broadcast",
    lastSeen: null,
    deviceName: "",
    status: role === ROLE_KEYS.BACHILLER ? "Supervision constante" : "Asignado",
    role,
    roleLabel,
  };
}

function buildSessionMemory({ detections, lang, messages, profile, statusMessage }) {
  const normalizedRole = normalizeRole(profile?.role);
  const agentProfile = AGENT_PROFILES[normalizedRole] ?? AGENT_PROFILES[ROLE_KEYS.BACHILLER];

  return {
    actor: profile?.display_name ?? "Operario",
    role: normalizedRole,
    agentProfile: {
      key: agentProfile.key,
      name: agentProfile.name[lang] ?? agentProfile.name.es,
      tone: agentProfile.tone[lang] ?? agentProfile.tone.es,
      supervisionWeight: agentProfile.supervisionWeight,
    },
    lang,
    statusMessage,
    recentMessages: messages.slice(-4).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    recentDetections: detections.slice(0, 6).map((detection) => ({
      type: detection.elementType ?? detection.class,
      orientation: detection.orientation ?? "indefinida",
      confidence: detection.pieceConfidence ?? detection.score ?? 0,
      size: detection.sizeKey,
    })),
  };
}

async function notifyN8nApprovalWorkflow(payload) {
  try {
    const response = await fetch(N8N_APPROVAL_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok) {
      return null;
    }

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();
    return text ? { assistantAnswer: text, kokoroText: text } : null;
  } catch {
    // n8n notification is best-effort and should not block the operator flow.
    return null;
  }
}

/**
 * playWorkflowAudioIfAvailable
 *
 * Attempts to play text-to-speech audio based on the n8n workflow response.
 *
 * ## Audio Resolution Priority ##
 *
 * 1. Pre-built audio URL: If the workflow response contains `audioUrl`, `audio_url`,
 *    `audioBase64`, or `audio`, the audio is played directly without a TTS synthesis call.
 *
 * 2. Kokoro TTS synthesis: If the workflow returns a `kokoroText` field (plain Spanish text),
 *    this function POSTs to the Kokoro endpoint:
 *      POST https://audio.servidor.dpdns.org/v1/audio/speech
 *      Body: { model, input, voice, response_format, stream, lang_code }
 *      Response: raw audio/mpeg or a JSON wrapper with a downloadable URL.
 *
 *    The FastKoko server exposes an OpenAI-compatible TTS API. The `/web` path is only
 *    the player UI, not the synthesis endpoint.
 *
 * ## Image Context (captureUrl) ##
 *
 * The workflow response may also include `captureUrl` — a URL to the JPEG frame captured
 * by the mobile operator's camera at the time of the request. This is used by the admin panel
 * and the n8n "Normalize Request" node to enrich the visual detection context. It is NOT
 * played as audio but is passed to image analysis.
 *
 * @param {object|null} workflowResponse - Parsed JSON from the n8n webhook response
 * @returns {Promise<boolean>} - true if audio was successfully played
 */
async function playWorkflowAudioIfAvailable(workflowResponse) {
  if (typeof window === "undefined" || !workflowResponse) {
    return false;
  }

  // ── Step 1: Check for pre-built audio URL in the workflow response ────────
  // These fields indicate the workflow already produced a synthesized audio file.
  const prebuiltAudioUrl =
    workflowResponse.audioUrl ??
    workflowResponse.audio_url ??
    (workflowResponse.audioBase64 ? `data:audio/mpeg;base64,${workflowResponse.audioBase64}` : null) ??
    workflowResponse.audio;

  if (prebuiltAudioUrl && typeof Audio !== "undefined") {
    try {
      const audioEl = new Audio(prebuiltAudioUrl);
      await audioEl.play();
      return true;
    } catch {
      // Pre-built audio failed — fall through to Kokoro TTS synthesis
    }
  }

  // ── Step 2: Kokoro TTS synthesis ──────────────────────────────────────────
  // The n8n workflow's Auto Response / Escalation nodes emit a `kokoroText` field
  // containing the plain-text Spanish string that should be synthesized into speech.
  // We POST this to the self-hosted Kokoro TTS endpoint and play the result.
  const kokoroText = workflowResponse.kokoroText ?? workflowResponse.assistantAnswer;
  const kokoroEndpoint = resolveKokoroEndpoint(workflowResponse.voiceEndpoint);

  if (!kokoroText || typeof Audio === "undefined") {
    return false;
  }

  // Use an AbortController to enforce an 8-second timeout on the TTS request.
  // Without a timeout, a slow or unavailable Kokoro server would leave the UI
  // hanging indefinitely while waiting for the audio response.
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), 8000);

  try {
    const ttsResponse = await fetch(kokoroEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-raw-response": "true",
      },
      body: JSON.stringify({
        model: "kokoro",
        input: kokoroText,
        voice: workflowResponse.voice ?? "af_heart",
        response_format: "mp3",
        stream: false,
        return_download_link: true,
        lang_code: lang === "es" ? "e" : "a",
      }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutHandle);

    if (!ttsResponse.ok) {
      return false;
    }

    const contentType = ttsResponse.headers.get("content-type") ?? "";

    let audioPlayUrl = null;

    if (contentType.includes("application/json")) {
      // Kokoro returned a JSON wrapper — extract the URL field
      const ttsJson = await ttsResponse.json();
      audioPlayUrl =
        ttsJson.audioUrl ??
        ttsJson.audio_url ??
        ttsJson.url ??
        (ttsJson.download_path ? `https://audio.servidor.dpdns.org${ttsJson.download_path}` : null) ??
        (ttsJson.audioBase64 ? `data:audio/mpeg;base64,${ttsJson.audioBase64}` : null);
    } else if (
      contentType.includes("audio/") ||
      contentType.includes("application/octet-stream")
    ) {
      // Kokoro returned raw binary audio — convert to a Blob URL for playback
      const audioBinary = await ttsResponse.arrayBuffer();
      const mimeType = contentType.includes("audio/") ? contentType.split(";")[0] : "audio/mpeg";
      audioPlayUrl = URL.createObjectURL(new Blob([audioBinary], { type: mimeType }));
    }

    if (audioPlayUrl) {
      const audioEl = new Audio(audioPlayUrl);
      await audioEl.play();
      // Revoke the Blob URL after playback to free memory
      audioEl.addEventListener("ended", () => {
        if (audioPlayUrl.startsWith("blob:")) {
          URL.revokeObjectURL(audioPlayUrl);
        }
      });
      return true;
    }

    return false;
  } catch {
    // TTS request timed out, network error, or audio play blocked by browser policy.
    // This is best-effort: the text response is already shown in the chat UI.
    clearTimeout(timeoutHandle);
    return false;
  }
}

export function AppProvider({ children }) {
  const [toasterOffset, setToasterOffset] = useState({
    top: 16,
    right: 16,
  });
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [lang, setLangState] = useState(() => window.localStorage.getItem("mercedes-lang") ?? "es");
  const [theme, setThemeState] = useState(() => window.localStorage.getItem("mercedes-theme") ?? "light");
  const [isMobileDevice, setIsMobileDevice] = useState(() => detectMobileContext());
  const [inventoryView, setInventoryView] = useState("list");
  const [activityFilter, setActivityFilter] = useState("all");
  const [activeOperatorId, setActiveOperatorId] = useState("op-operator-01");
  const [detections, setDetections] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [mobileOperators, setMobileOperators] = useState(INITIAL_MOBILE_OPERATORS);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Sistema listo");
  const [selectedFilter, setSelectedFilter] = useState("Todos");
  const [searchValue, setSearchValue] = useState("");
  const [installPromptVisible, setInstallPromptVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installSupport, setInstallSupport] = useState(() => detectInstallSupport());
  const [activityItems, setActivityItems] = useState(INITIAL_ACTIVITY_ITEMS.es);
  const [notificationItems, setNotificationItems] = useState(INITIAL_NOTIFICATIONS.es);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [adminHubReady, setAdminHubReady] = useState(false);
  const [operatorStreams, setOperatorStreams] = useState({});
  const [inventoryItems, setInventoryItems] = useState(INVENTORY_ITEMS);
  const [systemLogs, setSystemLogs] = useState(SYSTEM_LOGS);
  const [operators, setOperators] = useState(OPERATORS);
  const [adminUsers, setAdminUsers] = useState([]);
  const recognitionRef = useRef(null);
  const adminPeerRef = useRef(null);
  const operatorConnectionsRef = useRef({});
  const operatorCallsRef = useRef({});
  const approveRequestRef = useRef(null);
  const denyRequestRef = useRef(null);
  const latestPendingToastRef = useRef("");
  const normalizedRole = normalizeRole(profile?.role);
  const roleConfig = ROLE_DEFINITIONS[normalizedRole];

  useEffect(() => {
    if (!profile?.user_id) {
      return;
    }

    const storageKey = `mercedes-session-memory-${profile.user_id}`;
    const savedMemory = window.localStorage.getItem(storageKey);

    if (!savedMemory) {
      return;
    }

    try {
      const parsedMemory = JSON.parse(savedMemory);
      if (Array.isArray(parsedMemory.messages) && parsedMemory.messages.length) {
        setMessages(parsedMemory.messages);
      }
    } catch {
      // Ignore corrupted persisted session memory.
    }
  }, [profile?.user_id]);

  useEffect(() => {
    if (!profile?.user_id) {
      return;
    }

    const storageKey = `mercedes-session-memory-${profile.user_id}`;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        messages: messages.slice(-8),
        detections: detections.slice(0, 10),
        statusMessage,
      }),
    );
  }, [detections, messages, profile?.user_id, statusMessage]);

  const buildVisibleOperators = (operatorRows, currentProfile) => {
    if (normalizeRole(currentProfile?.role) === ROLE_KEYS.ADMIN) {
      return operatorRows?.length ? normalizeOperators(operatorRows) : INITIAL_MOBILE_OPERATORS;
    }

    return [createRoleBoundOperator(currentProfile, lang)];
  };

  const loadAdminUsers = async (currentProfile) => {
    if (normalizeRole(currentProfile?.role) !== ROLE_KEYS.ADMIN) {
      setAdminUsers([]);
      return;
    }

    const { data } = await insforge.database
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setAdminUsers(
        data.map((entry) => ({
          ...entry,
          role: normalizeRole(entry.role),
          user_email: entry.user_email ?? "",
        })),
      );
    }
  };

  const refreshAdminUsers = async (currentProfile) => {
    await loadAdminUsers(currentProfile);
  };

  const loadApprovalRequests = async (currentProfile) => {
    if (normalizeRole(currentProfile?.role) !== ROLE_KEYS.ADMIN) {
      setPendingRequests([]);
      return;
    }

    const { data } = await insforge.database
      .from("approval_requests")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    if (data) {
      setPendingRequests(data.map((entry) => mapApprovalRequest(entry, lang)));
    }
  };

  const loadAppData = async (currentUser, currentProfile = profile) => {
    if (!currentUser) {
      setInventoryItems(INVENTORY_ITEMS);
      setSystemLogs(SYSTEM_LOGS);
      setOperators(OPERATORS);
      setMobileOperators(INITIAL_MOBILE_OPERATORS);
      setAdminUsers([]);
      setPendingRequests([]);
      return;
    }

    const [inventoryResponse, catalogResponse, logsResponse, operatorsResponse] = await Promise.all([
      insforge.database.from("inventory_items").select("*").order("id", { ascending: true }),
      insforge.database.from("part_reference_catalog").select("*").order("id", { ascending: true }),
      insforge.database.from("system_logs").select("*").order("created_at", { ascending: false }),
      insforge.database.from("operators").select("*").order("id", { ascending: true }),
    ]);

    if (inventoryResponse.data?.length) {
      setInventoryItems(normalizeInventoryItems(inventoryResponse.data, catalogResponse.data ?? []));
    }

    if (logsResponse.data?.length) {
      setSystemLogs(normalizeSystemLogs(logsResponse.data));
    }

    if (operatorsResponse.data?.length) {
      setOperators(
        operatorsResponse.data.map((entry) => ({
          name: entry.name,
          shift: entry.shift,
          status: entry.status,
        })),
      );
      setMobileOperators(buildVisibleOperators(operatorsResponse.data, currentProfile));
    }

    await loadAdminUsers(currentProfile);
    await loadApprovalRequests(currentProfile);
  };

  const ensureUserProfile = async (currentUser, preferredName) => {
    const { data: existingProfile } = await insforge.database
      .from("user_profiles")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (existingProfile) {
      const forcedRole = ADMIN_EMAILS.has(currentUser.email ?? "")
        ? ROLE_KEYS.ADMIN
        : normalizeRole(existingProfile.role);
      const shouldRefreshProfile =
        existingProfile.role !== forcedRole ||
        existingProfile.user_email !== (currentUser.email ?? "") ||
        !existingProfile.display_name;

      if (shouldRefreshProfile) {
        const { data: updatedProfile } = await insforge.database
          .from("user_profiles")
          .update({
            display_name:
              existingProfile.display_name ??
              preferredName ??
              currentUser.profile?.name ??
              currentUser.email?.split("@")[0] ??
              "Operario",
            role: forcedRole,
            supervision_level:
              forcedRole === ROLE_KEYS.ADMIN ? "full" : existingProfile.supervision_level ?? "standard",
            user_email: currentUser.email ?? existingProfile.user_email ?? "",
          })
          .eq("user_id", currentUser.id)
          .select()
          .maybeSingle();

        if (updatedProfile) {
          existingProfile.display_name = updatedProfile.display_name;
          existingProfile.role = updatedProfile.role;
          existingProfile.supervision_level = updatedProfile.supervision_level;
          existingProfile.user_email = updatedProfile.user_email;
        }
      }

      const normalizedProfile = {
        ...existingProfile,
        role: forcedRole,
        user_email: currentUser.email ?? existingProfile.user_email ?? "",
      };
      setProfile(normalizedProfile);
      setLangState(normalizedProfile.preferred_lang ?? "es");
      setThemeState(normalizedProfile.theme ?? "light");
      return normalizedProfile;
    }

    if (!ADMIN_EMAILS.has(currentUser.email ?? "")) {
      await insforge.auth.signOut();
      setUser(null);
      setProfile(null);
      setAuthError(
        lang === "es"
          ? "Tu usuario no esta autorizado en el panel. Pide al admin que lo cree de nuevo."
          : "Your user is not authorized in the panel. Ask the admin to recreate it.",
      );
      return null;
    }

    const nextProfile = {
      user_id: currentUser.id,
      display_name: preferredName ?? currentUser.profile?.name ?? currentUser.email?.split("@")[0] ?? "Operario",
      role: ROLE_KEYS.ADMIN,
      preferred_lang: window.localStorage.getItem("mercedes-lang") ?? "es",
      theme: window.localStorage.getItem("mercedes-theme") ?? "light",
      user_email: currentUser.email ?? "",
    };

    const { data } = await insforge.database.from("user_profiles").insert(nextProfile).select().maybeSingle();

    if (data) {
      setProfile({
        ...data,
        role: normalizeRole(data.role),
        user_email: data.user_email ?? currentUser.email ?? "",
      });
    } else {
      setProfile(nextProfile);
    }

    if (preferredName) {
      await insforge.auth.setProfile({ name: preferredName });
    }

    return {
      ...(data ?? nextProfile),
      role: normalizeRole((data ?? nextProfile).role),
    };
  };

  useEffect(() => {
    let ignore = false;

    const initialize = async () => {
      if (!hasInsforgeSessionHint()) {
        if (!ignore) {
          setAuthReady(true);
        }
        return;
      }

      const { data } = await insforge.auth.getCurrentUser();

      if (ignore) {
        return;
      }

      const currentUser = data?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const currentProfile = await ensureUserProfile(currentUser);
        await loadAppData(currentUser, currentProfile);
      }

      setAuthReady(true);
    };

    initialize().catch(() => {
      setAuthReady(true);
    });

    return () => {
      ignore = true;
      recognitionRef.current?.stop?.();
      adminPeerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    window.localStorage.setItem("mercedes-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("mercedes-lang", lang);
    setActivityItems(INITIAL_ACTIVITY_ITEMS[lang]);
    setNotificationItems((currentNotifications) =>
      currentNotifications.length ? currentNotifications : INITIAL_NOTIFICATIONS[lang],
    );
  }, [lang]);

  useEffect(() => {
    if (normalizeRole(profile?.role) === ROLE_KEYS.ADMIN) {
      return;
    }

    const roleOperator = createRoleBoundOperator(profile, lang);
    setMobileOperators([roleOperator]);
    setActiveOperatorId(roleOperator.id);
  }, [lang, profile]);

  useEffect(() => {
    if (!user || normalizedRole !== ROLE_KEYS.ADMIN) {
      return undefined;
    }

    let cancelled = false;

    const syncRequests = async () => {
      const { data } = await insforge.database
        .from("approval_requests")
        .select("*")
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      if (cancelled || !data) {
        return;
      }

      const nextRequests = data.map((entry) => mapApprovalRequest(entry, lang));
      const nextTopRequestId = nextRequests[0]?.id ?? "";

      if (nextTopRequestId && nextTopRequestId !== latestPendingToastRef.current) {
        const latest = nextRequests[0];
        addNotification(latest.title, latest.detail);
        setNotificationsOpen(true);
        latestPendingToastRef.current = nextTopRequestId;
      }

      setPendingRequests(nextRequests);
    };

    void syncRequests();
    const intervalId = window.setInterval(() => {
      void syncRequests();
    }, 7000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [lang, normalizedRole, user]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileDevice(detectMobileContext());
      setInstallSupport(detectInstallSupport());
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setInstallPromptVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) {
      return;
    }

    insforge.database
      .from("user_profiles")
      .update({
        display_name: profile.display_name ?? user.profile?.name ?? user.email?.split("@")[0] ?? "Operario",
        preferred_lang: lang,
        role: profile.role,
        theme,
        user_id: user.id,
        user_email: user.email ?? profile.user_email ?? "",
      })
      .eq("user_id", user.id)
      .select()
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
        }
      })
      .catch(() => {});
  }, [lang, theme, user]);

  const addNotification = (title, description) => {
    setNotificationItems((currentNotifications) => [
      {
        id: `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        description,
        time: lang === "es" ? "Ahora mismo" : "Just now",
        read: false,
      },
      ...currentNotifications,
    ]);
  };

  useEffect(() => {
    if (!user || normalizedRole !== ROLE_KEYS.ADMIN || isMobileDevice) {
      adminPeerRef.current?.destroy();
      adminPeerRef.current = null;
      setAdminHubReady(false);
      return;
    }

    const adminPeer = new Peer(ADMIN_PEER_ID);
    adminPeerRef.current = adminPeer;

    const updateOperator = (operatorId, updates) => {
      setMobileOperators((currentOperators) => {
        const foundOperator = currentOperators.some((operator) => operator.id === operatorId);

        if (!foundOperator) {
          return [
            ...currentOperators,
            {
              id: operatorId,
              name: updates.name ?? updates.operatorName ?? operatorId,
              shift: updates.shift ?? updates.roleLabel ?? updates.role ?? "Mobile",
              connected: Boolean(updates.connected),
              activity: updates.activity ?? "Camara movil activa",
              lastSeen: updates.lastSeen ?? null,
              deviceName: updates.deviceName ?? "",
              status: updates.status ?? "Live",
            },
          ];
        }

        return currentOperators.map((operator) => (operator.id === operatorId ? { ...operator, ...updates } : operator));
      });
    };

    adminPeer.on("open", () => {
      setAdminHubReady(true);
      setStatusMessage(lang === "es" ? "Hub admin conectado" : "Admin hub connected");
      addNotification(lang === "es" ? "Hub admin conectado" : "Admin hub connected", ADMIN_PEER_ID);
    });

    adminPeer.on("connection", (connection) => {
      connection.on("data", (payload) => {
        if (!payload?.operatorId) {
          return;
        }

        operatorConnectionsRef.current[payload.operatorId] = connection;
        updateOperator(payload.operatorId, {
          connected: payload.type !== "operator:stopped",
          activity: payload.activity ?? (lang === "es" ? "Operario conectado" : "Operator connected"),
          lastSeen: payload.timestamp ?? Date.now(),
          deviceName: payload.deviceName ?? "",
          name: payload.operatorName,
          shift: payload.shift,
          role: payload.role,
        });

        if (payload.type === "operator:request") {
          addNotification(payload.title, payload.detail);
          setNotificationsOpen(true);
        }

        if (payload.type === "operator:response") {
          addNotification(
            lang === "es" ? "Respuesta del operario" : "Operator response",
            `${payload.operatorName} · ${payload.detail}`,
          );
        }

        if (payload.type === "operator:stopped") {
          setOperatorStreams((currentStreams) => {
            const nextStreams = { ...currentStreams };
            delete nextStreams[payload.operatorId];
            return nextStreams;
          });
        }
      });
    });

    adminPeer.on("call", (call) => {
      const operatorId = call.metadata?.operatorId;

      if (!operatorId) {
        return;
      }

      operatorCallsRef.current[operatorId] = call;
      call.answer();
      call.on("stream", (stream) => {
        setOperatorStreams((currentStreams) => ({
          ...currentStreams,
          [operatorId]: {
            stream,
            updatedAt: Date.now(),
          },
        }));
        updateOperator(operatorId, {
          connected: true,
          activity: lang === "es" ? "Camara movil en directo" : "Mobile camera live",
          lastSeen: Date.now(),
        });
      });

      call.on("close", () => {
        updateOperator(operatorId, {
          connected: false,
          activity: lang === "es" ? "Emision detenida" : "Broadcast stopped",
          lastSeen: Date.now(),
        });
        setOperatorStreams((currentStreams) => {
          const nextStreams = { ...currentStreams };
          delete nextStreams[operatorId];
          return nextStreams;
        });
      });
    });

    adminPeer.on("error", () => {
      setAdminHubReady(false);
      setStatusMessage(lang === "es" ? "Hub admin con incidencias" : "Admin hub error");
    });

    return () => {
      Object.values(operatorConnectionsRef.current).forEach((connection) => connection?.close?.());
      Object.values(operatorCallsRef.current).forEach((call) => call?.close?.());
      operatorConnectionsRef.current = {};
      operatorCallsRef.current = {};
      adminPeer.destroy();
      adminPeerRef.current = null;
      setAdminHubReady(false);
    };
  }, [isMobileDevice, lang, normalizedRole, user]);

  const metrics = useMemo(() => {
    const detectedPieces = detections.filter(
      (item) => item.elementType === "pieza" || item.class === "pieza" || item.class === "object",
    );
    const inventoryWithStock = inventoryItems.filter((item) => Number(item.stock) > 0);

    return {
      partsCount: inventoryWithStock.length,
      stockCount: inventoryItems.reduce((total, item) => total + Number(item.stock ?? 0), 0),
      detectedPiecesCount: detectedPieces.length,
      connectedOperatorsCount: Object.keys(operatorStreams).length,
      statusMessage,
      syncLabel: lang === "es" ? "Online y sincronizado" : "Online and synced",
    };
  }, [detections, inventoryItems, lang, operatorStreams, statusMessage]);

  const alerts = useMemo(() => {
    const lowStockItems = inventoryItems
      .filter((item) => Number(item.stock ?? 0) > 0 && Number(item.stock ?? 0) <= 10)
      .sort((left, right) => Number(left.stock ?? 0) - Number(right.stock ?? 0));
    const latestError = systemLogs.find((entry) => String(entry.level ?? "").toUpperCase() === "ERROR");
    const latestPendingRequest = pendingRequests[0];
    const derivedAlerts = [];

    if (lowStockItems[0]) {
      derivedAlerts.push({
        eyebrow: lang === "es" ? "Stock" : "Stock",
        title:
          lang === "es"
            ? `${lowStockItems[0].id} en nivel bajo`
            : `${lowStockItems[0].id} is running low`,
        detail:
          lang === "es"
            ? `${lowStockItems[0].family} tiene ${lowStockItems[0].stock} unidades en ${lowStockItems[0].zone}. ETA: ${lowStockItems[0].eta}.`
            : `${lowStockItems[0].family} has ${lowStockItems[0].stock} units in ${lowStockItems[0].zone}. ETA: ${lowStockItems[0].eta}.`,
      });
    }

    if (latestPendingRequest) {
      derivedAlerts.push({
        eyebrow: lang === "es" ? "Aprobacion" : "Approval",
        title:
          lang === "es"
            ? `Solicitud pendiente de ${latestPendingRequest.operatorName}`
            : `Pending request from ${latestPendingRequest.operatorName}`,
        detail: latestPendingRequest.detail,
      });
    }

    if (latestError) {
      derivedAlerts.push({
        eyebrow: latestError.category?.toUpperCase?.() ?? "ERROR",
        title: latestError.title,
        detail: latestError.detail,
      });
    }

    if (derivedAlerts.length) {
      return derivedAlerts.slice(0, 3);
    }

    return [
      {
        eyebrow: lang === "es" ? "Estado" : "Status",
        title: lang === "es" ? "Sin alertas activas" : "No active alerts",
        detail:
          lang === "es"
            ? "No hay incidencias bloqueantes en inventario, aprobaciones o logs."
            : "There are no blocking issues in inventory, approvals, or logs.",
      },
    ];
  }, [inventoryItems, lang, pendingRequests, systemLogs]);

  const series = useMemo(
    () => [
      { label: lang === "es" ? "Logs" : "Logs", value: systemLogs.length },
      { label: lang === "es" ? "Solicitudes" : "Requests", value: pendingRequests.length },
      { label: lang === "es" ? "Operarios" : "Operators", value: operators.length },
      { label: lang === "es" ? "Piezas" : "Pieces", value: metrics.detectedPiecesCount },
      { label: lang === "es" ? "Inventario" : "Inventory", value: metrics.stockCount },
      {
        label: lang === "es" ? "Alertas" : "Alerts",
        value:
          alerts[0]?.title === (lang === "es" ? "Sin alertas activas" : "No active alerts")
            ? 0
            : alerts.length,
      },
    ],
    [alerts, lang, metrics.detectedPiecesCount, metrics.stockCount, operators.length, pendingRequests.length, systemLogs.length],
  );

  const logUserRequest = async (requesterName, detail, transcript) => {
    try {
      await insforge.database.from("system_logs").insert({
        id: `approval-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        level: "INFO",
        title: requesterName,
        detail: transcript ? `${detail} · ${transcript}` : detail,
        timestamp_label: new Date().toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        category: "approval",
      });
    } catch {
      // Requests should not fail if logging is unavailable.
    }
  };

  const buildAssistantContext = (prompt) => {
    const intent = classifyAssistantIntent(prompt);
    const agentProfile = AGENT_PROFILES[normalizedRole] ?? AGENT_PROFILES[ROLE_KEYS.BACHILLER];

    return {
      agentProfile,
      intent,
      requiresApproval: normalizedRole !== ROLE_KEYS.ADMIN && intent.requiresApproval,
    };
  };

  const loadRealtimeInventoryContext = async () => {
    if (!user) {
      return {
        normalizedInventory: inventoryItems,
        inventorySnapshot: buildInventorySnapshot(inventoryItems),
      };
    }

    try {
      const [inventoryResponse, catalogResponse] = await Promise.all([
        insforge.database.from("inventory_items").select("*").order("id", { ascending: true }),
        insforge.database.from("part_reference_catalog").select("*").order("id", { ascending: true }),
      ]);

      const normalizedInventory = inventoryResponse.data?.length
        ? normalizeInventoryItems(inventoryResponse.data, catalogResponse.data ?? [])
        : inventoryItems;

      if (inventoryResponse.data?.length) {
        setInventoryItems(normalizedInventory);
      }

      return {
        normalizedInventory,
        inventorySnapshot: buildInventorySnapshot(normalizedInventory),
      };
    } catch {
      return {
        normalizedInventory: inventoryItems,
        inventorySnapshot: buildInventorySnapshot(inventoryItems),
      };
    }
  };

  const sendAssistantEventToWorkflow = async ({
    detail,
    messageType,
    requestType,
    transcript = "",
  }) => {
    if (!user) {
      return null;
    }

    const { agentProfile, intent, requiresApproval } = buildAssistantContext(transcript || detail);
    const assignedOperatorId = profile?.assigned_operator_id ?? createRoleBoundOperator(profile, lang).id;
    const { normalizedInventory, inventorySnapshot } = await loadRealtimeInventoryContext();
    const resolvedInventoryItem = resolveInventoryItemFromPrompt(transcript || detail, normalizedInventory);
    const sessionMemory = buildSessionMemory({
      detections,
      lang,
      messages,
      profile,
      statusMessage,
    });

    // ── Build the most recent camera capture URL for visual context ──────────
    // The n8n "Normalize Request" node uses captureUrl/imageUrl to detect whether
    // the query is visual (visualRequest=true) and embed a camera frame description
    // into the Groq AI system prompt. Without this field the AI cannot see images.
    //
    // Priority:
    //   1. Most recent detection's sourceImageUrl (set by TensorFlow in AdminMonitoringPanel)
    //   2. Most recent operatorStream's captureFrame (base64 canvas grab)
    //   3. Empty string (text-only request)
    const latestDetection = detections[0];
    const latestCaptureUrl =
      latestDetection?.sourceImageUrl ??
      latestDetection?.captureUrl ??
      Object.values(operatorStreams)[0]?.captureUrl ??
      "";

    const workflowResponse = await notifyN8nApprovalWorkflow({
      requestId: `workflow-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      requesterUserId: user.id,
      requesterName: profile?.display_name ?? user.email?.split("@")[0] ?? "Operario",
      requesterRole: normalizedRole,
      assignedOperatorId,
      transcript,
      detail,
      // imageUrl: aliased as captureUrl in the workflow — both are accepted by Normalize Request
      imageUrl: latestCaptureUrl,
      captureUrl: latestCaptureUrl,
      approvalPolicy: roleConfig.approvalPolicy,
      detections: sessionMemory.recentDetections.filter((entry) => entry.type === "pieza"),
      sessionMemory,
      intent: intent.key,
      intentRequiresApproval: requiresApproval,
      requestType,
      messageType,
      inventorySnapshot,
      resolvedInventoryItem: resolvedInventoryItem
        ? {
            id: resolvedInventoryItem.id,
            family: resolvedInventoryItem.family,
            category: resolvedInventoryItem.category ?? "",
            zone: resolvedInventoryItem.zone ?? "",
            stock: Number(resolvedInventoryItem.stock ?? 0),
            eta: resolvedInventoryItem.eta ?? "",
            status: resolvedInventoryItem.status ?? "",
            trend: resolvedInventoryItem.trend ?? "",
          }
        : null,
      warehouseSummary: {
        totalReferences: inventorySnapshot.length,
        totalUnits: inventorySnapshot.reduce((total, item) => total + Number(item.stock ?? 0), 0),
        lowStockReferences: inventorySnapshot.filter((item) => Number(item.stock ?? 0) <= 5).length,
      },
      referenceCatalogSnapshot: buildReferenceCatalogSnapshot(PART_REFERENCE_CATALOG),
      agentProfileKey: agentProfile.key,
      agentProfileName: agentProfile.name[lang] ?? agentProfile.name.es,
      llm: "groq",
      // Kokoro TTS endpoint — workflow will embed in response as voiceEndpoint so the
      // playWorkflowAudioIfAvailable function can use it for TTS synthesis
      voiceEndpoint: "https://audio.servidor.dpdns.org/web",
    });

    return { intent, requiresApproval, agentProfile, workflowResponse, resolvedInventoryItem, inventorySnapshot };
  };

  const createApprovalRequest = async ({ detail, metadata = {}, requestType = "approval", transcript = "" }) => {
    if (!user || normalizedRole === ROLE_KEYS.ADMIN) {
      return null;
    }

    const assignedOperatorId = profile?.assigned_operator_id ?? createRoleBoundOperator(profile, lang).id;
    const sessionMemory = buildSessionMemory({
      detections,
      lang,
      messages,
      profile,
      statusMessage,
    });
    const payload = {
      id: createDatabaseUuid(),
      requester_user_id: user.id,
      requester_name: profile?.display_name ?? user.email?.split("@")[0] ?? "Operario",
      requester_role: normalizedRole,
      assigned_operator_id: assignedOperatorId,
      request_type: requestType,
      transcript,
      detail,
      approval_policy: roleConfig.approvalPolicy ?? "guided",
      metadata: {
        ...metadata,
        sessionMemory,
      },
    };

    const { data, error } = await insforge.database.from("approval_requests").insert(payload).select().maybeSingle();
    if (error) {
      return null;
    }
    const { agentProfile, intent, requiresApproval } = buildAssistantContext(transcript || detail);
    void notifyN8nApprovalWorkflow({
      requestId: payload.id,
      requesterUserId: payload.requester_user_id,
      requesterName: payload.requester_name,
      requesterRole: payload.requester_role,
      assignedOperatorId: payload.assigned_operator_id,
      transcript: payload.transcript,
      detail: payload.detail,
      approvalPolicy: payload.approval_policy,
      detections: sessionMemory.recentDetections.filter((entry) => entry.type === "pieza"),
      sessionMemory,
      intent: intent.key,
      intentRequiresApproval: requiresApproval,
      requestType,
      messageType: "approval",
      agentProfileKey: agentProfile.key,
      agentProfileName: agentProfile.name[lang] ?? agentProfile.name.es,
      llm: "groq",
      voiceEndpoint: "https://audio.servidor.dpdns.org/web",
    });
    await logUserRequest(payload.requester_name, detail, transcript);
    return data ?? payload;
  };

  const createAdminRequest = async ({ detail, requestType = "admin_instruction", transcript = "" }) => {
    if (!user || normalizedRole !== ROLE_KEYS.ADMIN) {
      return null;
    }

    const targetOperatorId = activeOperatorId;
    const targetOperator = mobileOperators.find((operator) => operator.id === targetOperatorId);
    const payload = {
      id: createDatabaseUuid(),
      requester_user_id: user.id,
      requester_name: profile?.display_name ?? user.email ?? "Admin",
      requester_role: ROLE_KEYS.ADMIN,
      assigned_operator_id: targetOperatorId,
      request_type: requestType,
      transcript,
      detail,
      status: "pending_user",
      approval_policy: "full",
      metadata: {
        source: "admin-assistant",
        target_operator_name: targetOperator?.name ?? targetOperatorId,
      },
    };

    const { data, error } = await insforge.database.from("approval_requests").insert(payload).select().maybeSingle();
    if (error) {
      return null;
    }

    operatorConnectionsRef.current[targetOperatorId]?.send?.({
      type: "admin:request",
      requestId: payload.id,
      title: lang === "es" ? "Nueva solicitud del admin" : "New admin request",
      detail,
      transcript,
    });

    addNotification(
      lang === "es" ? "Solicitud enviada al operario" : "Request sent to operator",
      `${targetOperator?.name ?? targetOperatorId} · ${detail}`,
    );

    return data ?? payload;
  };

  const handleSendMessage = (event) => {
    event.preventDefault();
    const cleanedValue = inputValue.trim();

    if (!cleanedValue) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanedValue,
    };
    const { agentProfile, intent, requiresApproval } = buildAssistantContext(cleanedValue);

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInputValue("");
    setStatusMessage(lang === "es" ? "Consultando workflow..." : "Querying workflow...");

    void (async () => {
      const workflowResult = await sendAssistantEventToWorkflow({
        detail: cleanedValue,
        messageType: "chat",
        requestType: intent.workflowType,
        transcript: cleanedValue,
      });
      const workflowAnswer = workflowResult?.workflowResponse?.assistantAnswer?.trim();
      const inventoryReply = buildRealtimeInventoryReply({
        item: workflowResult?.resolvedInventoryItem ?? null,
        lang,
        prompt: cleanedValue,
        role: normalizedRole,
        summary: workflowResult?.workflowResponse?.warehouseSummary ?? {
          totalReferences: workflowResult?.inventorySnapshot?.length ?? inventoryItems.length,
          totalUnits: (workflowResult?.inventorySnapshot ?? inventoryItems).reduce(
            (total, entry) => total + Number(entry.stock ?? 0),
            0,
          ),
          lowStockReferences: (workflowResult?.inventorySnapshot ?? inventoryItems).filter(
            (entry) => Number(entry.stock ?? 0) <= 5,
          ).length,
        },
      });
      void playWorkflowAudioIfAvailable(workflowResult?.workflowResponse);
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          (shouldPreferInventoryReply(workflowAnswer, workflowResult?.resolvedInventoryItem, normalizedRole)
            ? inventoryReply
            : workflowAnswer) ||
          inventoryReply ||
          createRoleAwareReply({
            detections,
            inventoryItems,
            lang,
            messages: [...messages, userMessage],
            prompt: cleanedValue,
            role: normalizedRole,
          }),
        agentProfileKey: agentProfile.key,
        intentKey: intent.key,
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
      setStatusMessage(lang === "es" ? "Consulta atendida por n8n" : "Request handled by n8n");
    })();

    if (normalizedRole === ROLE_KEYS.ADMIN) {
      const shouldCreateAdminInstruction = /^(envia|solicita|ordena|indica|pide)\b/i.test(cleanedValue);

      if (shouldCreateAdminInstruction) {
        void createAdminRequest({
          detail: cleanedValue,
          requestType: "admin_instruction",
          transcript: cleanedValue,
        });
      }
    } else if (requiresApproval) {
      void createApprovalRequest({
        detail:
          lang === "es"
            ? `${profile?.display_name ?? "Operario"} ha solicitado una consulta sensible al asistente: ${cleanedValue}`
            : `${profile?.display_name ?? "Operator"} requested a sensitive assistant consultation: ${cleanedValue}`,
        requestType: intent.workflowType,
        transcript: cleanedValue,
      });
    }
  };

  const handleVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage(lang === "es" ? "Este navegador no soporta voz" : "This browser does not support voice");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "es" ? "es-ES" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setStatusMessage(lang === "es" ? "No se pudo capturar la voz" : "Voice capture failed");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript || "Resumen de stock";
      const cleanedTranscript = transcript.trim();
      const { agentProfile, intent, requiresApproval } = buildAssistantContext(cleanedTranscript);
      const voiceUserMessage = {
        id: `voice-user-${Date.now()}`,
        role: "user",
        content: cleanedTranscript,
      };

      setMessages((currentMessages) => [...currentMessages, voiceUserMessage]);
      setInputValue(cleanedTranscript);
      setStatusMessage(lang === "es" ? "Enviando audio al workflow..." : "Sending audio to the workflow...");

      void (async () => {
        const workflowResult = await sendAssistantEventToWorkflow({
          detail: cleanedTranscript,
          messageType: "voice",
          requestType: intent.workflowType,
          transcript: cleanedTranscript,
        });
        const workflowAnswer = workflowResult?.workflowResponse?.assistantAnswer?.trim();
        const inventoryReply = buildRealtimeInventoryReply({
          item: workflowResult?.resolvedInventoryItem ?? null,
          lang,
          prompt: cleanedTranscript,
          role: normalizedRole,
          summary: workflowResult?.workflowResponse?.warehouseSummary ?? {
            totalReferences: workflowResult?.inventorySnapshot?.length ?? inventoryItems.length,
            totalUnits: (workflowResult?.inventorySnapshot ?? inventoryItems).reduce(
              (total, entry) => total + Number(entry.stock ?? 0),
              0,
            ),
            lowStockReferences: (workflowResult?.inventorySnapshot ?? inventoryItems).filter(
              (entry) => Number(entry.stock ?? 0) <= 5,
            ).length,
          },
        });
        const playedAudio = await playWorkflowAudioIfAvailable(workflowResult?.workflowResponse);
        const assistantMessage = {
          id: `voice-assistant-${Date.now()}`,
          role: "assistant",
          content:
            (shouldPreferInventoryReply(workflowAnswer, workflowResult?.resolvedInventoryItem, normalizedRole)
              ? inventoryReply
              : workflowAnswer) ||
            inventoryReply ||
            createRoleAwareReply({
              detections,
              inventoryItems,
              lang,
              messages: [...messages, voiceUserMessage],
              prompt: cleanedTranscript,
              role: normalizedRole,
            }),
          agentProfileKey: agentProfile.key,
          intentKey: intent.key,
        };

        setMessages((currentMessages) => [...currentMessages, assistantMessage]);
        setStatusMessage(
          playedAudio
            ? lang === "es"
              ? "Respuesta de voz reproducida desde n8n"
              : "Voice response played from n8n"
            : lang === "es"
              ? "Respuesta de voz recibida desde n8n"
              : "Voice response received from n8n",
        );
      })();

      if (normalizedRole !== ROLE_KEYS.ADMIN && requiresApproval) {
        void createApprovalRequest({
          detail:
            lang === "es"
              ? `${profile?.display_name ?? "Operario"} ha lanzado una consulta de voz sensible: ${cleanedTranscript}`
              : `${profile?.display_name ?? "Operator"} sent a sensitive voice request: ${cleanedTranscript}`,
          requestType: intent.workflowType,
          transcript: cleanedTranscript,
        });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const signIn = async ({ email, password }) => {
    setAuthBusy(true);
    setAuthError("");

    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthBusy(false);
      setAuthError(error.message ?? "No se pudo iniciar sesion");
      return { ok: false };
    }

    setUser(data.user);
    const currentProfile = await ensureUserProfile(data.user);

    if (currentProfile?.disabled) {
      await insforge.auth.signOut();
      setUser(null);
      setProfile(null);
      setAuthBusy(false);
      setAuthError(lang === "es" ? "Tu acceso ha sido bloqueado por el admin." : "Your access has been blocked by admin.");
      return { ok: false };
    }

    await loadAppData(data.user, currentProfile);
    setAuthBusy(false);
    return { ok: true };
  };

  const signOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
    setProfile(null);
    setInventoryItems(INVENTORY_ITEMS);
    setSystemLogs(SYSTEM_LOGS);
    setOperators(OPERATORS);
    setMobileOperators(INITIAL_MOBILE_OPERATORS);
    setAdminUsers([]);
    setPendingRequests([]);
    setOperatorStreams({});
  };

  const updateUserAccess = async (userId, updates) => {
    if (normalizedRole !== ROLE_KEYS.ADMIN) {
      return { ok: false, error: "forbidden" };
    }

    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await insforge.database
      .from("user_profiles")
      .update(payload)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message ?? "save_failed" };
    }

    setAdminUsers((currentUsers) =>
      currentUsers.map((entry) =>
        entry.user_id === userId
          ? {
              ...entry,
              ...(data ?? payload),
              role: normalizeRole(data?.role ?? payload.role ?? entry.role),
            }
          : entry,
      ),
    );

    await refreshAdminUsers(profile);

    if (profile?.user_id === userId) {
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              ...(data ?? payload),
              role: normalizeRole(data?.role ?? payload.role ?? currentProfile.role),
            }
          : currentProfile,
      );
    }

    return { ok: true };
  };

  const createUserAccess = async ({
    assigned_operator_id = "",
    display_name,
    email,
    password,
    role,
    supervision_level = "standard",
  }) => {
    if (normalizedRole !== ROLE_KEYS.ADMIN) {
      return { ok: false, error: "forbidden" };
    }

    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedName = String(display_name ?? "").trim();
    const normalizedPassword = String(password ?? "");
    const normalizedUserRole = normalizeRole(role);

    if (!normalizedEmail || !normalizedName || !normalizedPassword) {
      return { ok: false, error: "missing_fields" };
    }

    const signUpResult = await insforgeAdmin.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      name: normalizedName,
    });

    if (signUpResult.error || !signUpResult.data?.user?.id) {
      return {
        ok: false,
        error: signUpResult.error?.message ?? "signup_failed",
      };
    }

    const userId = signUpResult.data.user.id;
    const upsertPayload = {
      user_id: userId,
      display_name: normalizedName,
      role: normalizedUserRole,
      supervision_level,
      assigned_operator_id,
      preferred_lang: lang,
      theme,
      user_email: normalizedEmail,
      disabled: false,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await insforge.database
      .from("user_profiles")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message ?? "profile_upsert_failed" };
    }

    const createdProfile = {
      ...(data ?? upsertPayload),
      role: normalizeRole((data ?? upsertPayload).role),
    };

    setAdminUsers((currentUsers) => [createdProfile, ...currentUsers.filter((entry) => entry.user_id !== userId)]);

    await refreshAdminUsers(profile);

    return { ok: true, data: createdProfile };
  };

  const deleteUserAccess = async (userId) => {
    if (normalizedRole !== ROLE_KEYS.ADMIN) {
      return { ok: false, error: "forbidden" };
    }

    const { data: profileToDelete } = await insforge.database
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = await insforge.database
      .from("user_profiles")
      .delete()
      .eq("user_id", userId);

    if (error) {
      return { ok: false, error: error.message ?? "delete_failed" };
    }

    await insforge.database.from("approval_requests").delete().eq("requester_user_id", userId);

    if (profileToDelete?.assigned_operator_id) {
      await insforge.database
        .from("approval_requests")
        .delete()
        .eq("assigned_operator_id", profileToDelete.assigned_operator_id);
    }

    setAdminUsers((currentUsers) => currentUsers.filter((entry) => entry.user_id !== userId));

    await refreshAdminUsers(profile);

    return { ok: true };
  };

  const handleInstall = async () => {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    setInstallPromptVisible(false);
    setInstallEvent(null);
  };

  const handleApproveRequest = async (requestId) => {
    const request = pendingRequests.find((item) => item.id === requestId);

    if (!request) {
      return;
    }

    await insforge.database
      .from("approval_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by_user_id: user?.id ?? "",
        decided_by_name: profile?.display_name ?? user?.email ?? "Admin",
        decision_note: lang === "es" ? "Aprobado desde el panel admin." : "Approved from admin panel.",
      })
      .eq("id", requestId);

    addNotification(lang === "es" ? "Solicitud aprobada" : "Request approved", `${request.operatorName} · ${request.title}`);
    operatorConnectionsRef.current[request.operatorId]?.send?.({
      type: "admin:approval",
      approved: true,
      detail: lang === "es" ? "Movimiento aprobado por el admin." : "Movement approved by admin.",
    });
    sileo.success({
      title: lang === "es" ? "Solicitud aprobada" : "Request approved",
      description: request.operatorName,
    });
    setPendingRequests((currentRequests) => currentRequests.filter((item) => item.id !== requestId));
  };

  const handleDenyRequest = async (requestId) => {
    const request = pendingRequests.find((item) => item.id === requestId);

    if (!request) {
      return;
    }

    await insforge.database
      .from("approval_requests")
      .update({
        status: "rejected",
        decided_at: new Date().toISOString(),
        decided_by_user_id: user?.id ?? "",
        decided_by_name: profile?.display_name ?? user?.email ?? "Admin",
        decision_note: lang === "es" ? "Denegado desde el panel admin." : "Rejected from admin panel.",
      })
      .eq("id", requestId);

    addNotification(lang === "es" ? "Solicitud denegada" : "Request denied", `${request.operatorName} · ${request.title}`);
    operatorConnectionsRef.current[request.operatorId]?.send?.({
      type: "admin:approval",
      approved: false,
      detail: lang === "es" ? "Movimiento denegado por el admin." : "Movement denied by admin.",
    });
    sileo.error({
      title: lang === "es" ? "Solicitud denegada" : "Request denied",
      description: request.operatorName,
    });
    setPendingRequests((currentRequests) => currentRequests.filter((item) => item.id !== requestId));
  };

  useEffect(() => {
    approveRequestRef.current = handleApproveRequest;
    denyRequestRef.current = handleDenyRequest;
  }, [handleApproveRequest, handleDenyRequest]);

  const value = {
    activityFilter,
    activityItems,
    activeOperatorId,
    adminHubReady,
    adminUsers,
    alerts,
    authBusy,
    authError,
    authReady,
    detections,
    handleApproveRequest,
    handleDenyRequest,
    handleInstall,
    handleSendMessage,
    handleVoiceCapture,
    inputValue,
    installPromptVisible,
    installSupport,
    installReady: Boolean(installEvent),
    inventoryItems,
    inventoryView,
    isAuthenticated: Boolean(user),
    isListening,
    isMobileDevice,
    lang,
    messages,
    metrics,
    mobileOperators,
    notificationItems,
    notificationsOpen,
    onCloseNotifications: () => setNotificationsOpen(false),
    onInputChange: setInputValue,
    onMarkNotificationsRead: () =>
      setNotificationItems((currentNotifications) =>
        currentNotifications.map((notification) => ({ ...notification, read: true })),
      ),
    onOpenNotifications: () => setNotificationsOpen(true),
    onSearchChange: setSearchValue,
    onSelectFilter: setSelectedFilter,
    onSetInventoryView: setInventoryView,
    onSetOperator: setActiveOperatorId,
    onStatusChange: setStatusMessage,
    operatorStreams,
    operators,
    pendingRequests,
    profile,
    roleConfig,
    roleLabel: getRoleLabel(normalizedRole, lang),
    roleKey: normalizedRole,
    quickFilters: ["Todos", ...QUICK_FILTERS],
    searchValue,
    selectedFilter,
    series,
    setActivityFilter,
    setActivityItems,
    setDetections,
    signIn,
    signOut,
    statusMessage,
    systemLogs,
    theme,
    toasterOffset,
    createUserAccess,
    toggleLang: () => setLangState((currentLang) => (currentLang === "es" ? "en" : "es")),
    toggleTheme: () => setThemeState((currentTheme) => (currentTheme === "light" ? "dark" : "light")),
    user,
    deleteUserAccess,
    updateUserAccess,
    updateToasterOffset: setToasterOffset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
