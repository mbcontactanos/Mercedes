import { useEffect, useMemo, useRef, useState } from "react";
import Peer from "peerjs";
import { Camera, LoaderCircle, Video, VideoOff, WandSparkles } from "lucide-react";
import { sileo } from "sileo";
import { ADMIN_PEER_ID } from "../../config/realtime.js";
import { insforge } from "../../lib/insforge.js";

function createDatabaseUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

const COPY = {
  es: {
    title: "Consola del operario",
    subtitle: "Abre la app en el movil del operario, toca conectar y el admin recibira la camara sin pegar URLs.",
    start: "Conectar y emitir",
    stop: "Detener emision",
    request: "Pedir asistencia al admin",
    requestSuccess: "Solicitud enviada al admin",
    connected: "Conexion activa con el admin",
    disconnected: "Sin emision",
    autoStopped: "Modo de trabajo desconectado al ocultarse o bloquearse la app",
    ready: "Preparado para enviar video al panel central",
    denied: "Solicitud denegada por el admin",
    approved: "Solicitud aprobada por el admin",
    permissionError: "No se pudo abrir la camara del movil.",
    unsupported: "Este dispositivo no expone una camara compatible en navegador.",
    videoTitle: "Preview local del operario",
    cardTitle: "Movil conectado",
    connecting: "Conectando",
    supervised: "Supervision obligatoria",
    flexible: "Permisos operativos",
    inboxTitle: "Solicitudes del admin",
    inboxSubtitle: "Acepta o rechaza instrucciones antes de operar cuando tu rol lo requiera.",
    emptyInbox: "No hay solicitudes pendientes del admin.",
    accept: "Aceptar",
    reject: "Rechazar",
    acceptedUser: "Solicitud aceptada por el operario",
    rejectedUser: "Solicitud rechazada por el operario",
    incomingRequest: "Nueva solicitud del admin",
  },
  en: {
    title: "Operator console",
    subtitle: "Open the app on the operator phone, tap connect, and the admin will receive the camera without pasting URLs.",
    start: "Connect and broadcast",
    stop: "Stop broadcast",
    request: "Ask admin for help",
    requestSuccess: "Request sent to admin",
    connected: "Connected to admin",
    disconnected: "No broadcast",
    autoStopped: "Work mode disconnected when the app was hidden or locked",
    ready: "Ready to send video to the central panel",
    denied: "Request denied by admin",
    approved: "Request approved by admin",
    permissionError: "The phone camera could not be opened.",
    unsupported: "This device does not expose a compatible browser camera.",
    videoTitle: "Operator local preview",
    cardTitle: "Connected mobile",
    connecting: "Connecting",
    supervised: "Mandatory supervision",
    flexible: "Operational permissions",
    inboxTitle: "Admin requests",
    inboxSubtitle: "Accept or reject instructions before acting when your role requires it.",
    emptyInbox: "There are no pending admin requests.",
    accept: "Accept",
    reject: "Reject",
    acceptedUser: "Request accepted by the operator",
    rejectedUser: "Request rejected by the operator",
    incomingRequest: "New admin request",
  },
};

export default function ConsolaOperarioMovil({
  lang,
  onStatusChange,
  onSubmitApprovalRequest,
  operators,
  roleConfig,
  roleKey,
  selectedOperatorId,
}) {
  const copy = COPY[lang];
  const activeOperator = useMemo(
    () => operators.find((operator) => operator.id === selectedOperatorId) ?? operators[0],
    [operators, selectedOperatorId],
  );
  const previewRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);
  const connectionRef = useRef(null);
  const streamRef = useRef(null);
  const heartbeatRef = useRef(0);
  const wakeLockRef = useRef(null);
  const isBroadcastingRef = useRef(false);
  const activeOperatorRef = useRef(activeOperator);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [incomingRequests, setIncomingRequests] = useState([]);

  useEffect(() => {
    if (previewRef.current && streamRef.current && previewRef.current.srcObject !== streamRef.current) {
      previewRef.current.srcObject = streamRef.current;
    }
  }, [isBroadcasting]);

  useEffect(() => {
    isBroadcastingRef.current = isBroadcasting;
  }, [isBroadcasting]);

  useEffect(() => {
    activeOperatorRef.current = activeOperator;
  }, [activeOperator]);

  useEffect(() => {
    let ignore = false;

    const loadPendingRequests = async () => {
      const { data } = await insforge.database
        .from("approval_requests")
        .select("*")
        .eq("assigned_operator_id", activeOperator.id)
        .eq("status", "pending_user")
        .order("requested_at", { ascending: false });

      if (!ignore && data) {
        setIncomingRequests(data);
      }
    };

    void loadPendingRequests();

    return () => {
      ignore = true;
    };
  }, [activeOperator.id]);

  const sendToAdmin = (payload) => {
    if (connectionRef.current?.open) {
      connectionRef.current.send({
        operatorId: activeOperatorRef.current?.id,
        operatorName: activeOperatorRef.current?.name,
        shift: activeOperatorRef.current?.shift,
        timestamp: Date.now(),
        ...payload,
      });
    }
  };

  const clearTransport = () => {
    window.clearInterval(heartbeatRef.current);
    heartbeatRef.current = 0;
    callRef.current?.close();
    connectionRef.current?.close();
    peerRef.current?.destroy();
    callRef.current = null;
    connectionRef.current = null;
    peerRef.current = null;
  };

  const logSystemEvent = async (type, detail) => {
    try {
      await insforge.database.from("system_logs").insert({
        id: `${type}-${Date.now()}`,
        level: "INFO",
        title: activeOperatorRef.current?.name ?? "Operator mobile",
        detail,
        timestamp_label: new Date().toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        category: "camera",
      });
    } catch {
      // Best-effort logging only.
    }
  };

  const persistApprovalRequest = async (detail, transcript = "") => {
    try {
      await insforge.database.from("approval_requests").insert({
        id: createDatabaseUuid(),
        requester_user_id: activeOperatorRef.current?.id ?? "mobile-operator",
        requester_name: activeOperatorRef.current?.name ?? "Operario",
        requester_role: roleKey,
        assigned_operator_id: activeOperatorRef.current?.id ?? "",
        request_type: "manual_assistance",
        transcript,
        detail,
        approval_policy: roleConfig.approvalPolicy ?? "guided",
        metadata: {
          shift: activeOperatorRef.current?.shift ?? "",
          source: "mobile-console",
        },
      });
    } catch {
      // If persistence fails, the real-time request still reaches the admin hub.
    }
  };

  const respondToAdminRequest = async (requestId, accepted) => {
    const status = accepted ? "accepted_user" : "rejected_user";
    const detail = accepted
      ? lang === "es"
        ? `${activeOperatorRef.current?.name ?? "El operario"} ha aceptado la solicitud del admin.`
        : `${activeOperatorRef.current?.name ?? "The operator"} accepted the admin request.`
      : lang === "es"
        ? `${activeOperatorRef.current?.name ?? "El operario"} ha rechazado la solicitud del admin.`
        : `${activeOperatorRef.current?.name ?? "The operator"} rejected the admin request.`;

    try {
      await insforge.database
        .from("approval_requests")
        .update({
          status,
          decided_at: new Date().toISOString(),
          decision_note: detail,
        })
        .eq("id", requestId);
    } catch {
      // Keep the real-time admin response even if persistence fails.
    }

    setIncomingRequests((currentRequests) => currentRequests.filter((request) => request.id !== requestId));
    sendToAdmin({
      type: "operator:response",
      requestId,
      accepted,
      detail,
    });

    sileo.info({
      title: accepted ? copy.acceptedUser : copy.rejectedUser,
      description: activeOperatorRef.current?.name ?? copy.title,
    });
  };

  const releaseWakeLock = async () => {
    if (!wakeLockRef.current) {
      return;
    }

    try {
      await wakeLockRef.current.release();
    } catch {
      // Ignore release failures; the sentinel may already be unavailable.
    } finally {
      wakeLockRef.current = null;
    }
  };

  const requestWakeLock = async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
      });
    } catch {
      // Wake Lock may be denied by the device, battery saver, or browser policy.
    }
  };

  const stopBroadcast = async ({ reason = "manual", notify = false } = {}) => {
    sendToAdmin({ type: "operator:stopped", reason });
    clearTransport();
    await releaseWakeLock();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }

    setIsBroadcasting(false);
    setIsConnecting(false);

    const statusMessage = reason === "hidden" ? copy.autoStopped : copy.disconnected;
    onStatusChange(statusMessage);

    await logSystemEvent(
      reason === "hidden" ? "operator:auto-stop" : "operator:stopped",
      reason === "hidden"
        ? `${activeOperatorRef.current?.name ?? "Operator"} hidden or locked the app, so the work mode was disconnected automatically.`
        : `${activeOperatorRef.current?.name ?? "Operator"} stopped the work mode.`,
    );

    if (notify && reason === "hidden") {
      sileo.info({
        title: copy.disconnected,
        description: copy.autoStopped,
      });
    }
  };

  useEffect(() => {
    return () => {
      void stopBroadcast();
    };
  }, []);

  useEffect(() => {
    const handleAppHidden = () => {
      if (!isBroadcastingRef.current) {
        return;
      }

      void stopBroadcast({ reason: "hidden", notify: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleAppHidden();
      } else if (isBroadcastingRef.current) {
        void requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleAppHidden);
    window.addEventListener("freeze", handleAppHidden);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleAppHidden);
      window.removeEventListener("freeze", handleAppHidden);
    };
  }, []);

  useEffect(() => {
    if (isBroadcasting) {
      void requestWakeLock();
    } else {
      void releaseWakeLock();
    }
  }, [isBroadcasting]);

  const handleAdminMessage = (message) => {
    if (message.type === "admin:request") {
      setIncomingRequests((currentRequests) => [
        {
          id: message.requestId,
          detail: message.detail,
          transcript: message.transcript ?? "",
          request_type: "admin_instruction",
          requested_at: new Date().toISOString(),
        },
        ...currentRequests.filter((request) => request.id !== message.requestId),
      ]);
      // Use a non-blocking info toast instead of sileo.show() with duration:null.
      // sileo.show + duration:null creates a persistent overlay with pointer-event capture
      // that blocks the admin Approve/Deny buttons in PanelMonitoreoAdmin and BarraSuperior.
      // The actual accept/reject UI is already handled by the incomingRequests inbox panel below.
      sileo.info({
        title: copy.incomingRequest,
        description: message.detail,
      });
    }

    if (message.type === "admin:approval") {
      if (message.approved) {
        sileo.success({ title: copy.approved, description: message.detail });
      } else {
        sileo.error({ title: copy.denied, description: message.detail });
      }
    }
  };

  const startBroadcast = async () => {
    if (isConnecting || isBroadcasting) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(copy.unsupported);
      onStatusChange(copy.unsupported);
      return;
    }

    setErrorMessage("");
    setIsConnecting(true);
    onStatusChange(copy.connecting);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      if (previewRef.current) {
        previewRef.current.srcObject = stream;
      }

      const peer = new Peer();
      peerRef.current = peer;

      peer.on("open", () => {
        const connection = peer.connect(ADMIN_PEER_ID, {
          metadata: {
            operatorId: activeOperator.id,
            operatorName: activeOperator.name,
            shift: activeOperator.shift,
            role: roleKey,
          },
        });

        connectionRef.current = connection;

        connection.on("open", () => {
          connection.on("data", handleAdminMessage);

          sendToAdmin({
            type: "operator:ready",
            activity: lang === "es" ? "Revisando expediciones en movil" : "Reviewing outbound flow on mobile",
            deviceName: navigator.userAgent,
            role: roleKey,
          });

          heartbeatRef.current = window.setInterval(() => {
            sendToAdmin({
              type: "operator:heartbeat",
              activity: lang === "es" ? "Camara movil activa" : "Mobile camera active",
            });
          }, 8000);

          callRef.current = peer.call(ADMIN_PEER_ID, stream, {
            metadata: {
              operatorId: activeOperator.id,
              operatorName: activeOperator.name,
              shift: activeOperator.shift,
              role: roleKey,
            },
          });

          setIsBroadcasting(true);
          setIsConnecting(false);
          onStatusChange(copy.connected);
          void requestWakeLock();
          void logSystemEvent(
            "operator:started",
            `${activeOperator.name} started the work mode from the mobile console.`,
          );
          sileo.success({
            title: copy.connected,
            description: `${activeOperator.name} · ${activeOperator.shift}`,
          });
        });

        connection.on("error", () => {
          setErrorMessage(copy.permissionError);
          setIsConnecting(false);
          onStatusChange(copy.permissionError);
        });

        connection.on("close", () => {
          setIsBroadcasting(false);
          setIsConnecting(false);
          void releaseWakeLock();
        });
      });

      peer.on("error", () => {
        setErrorMessage(copy.permissionError);
        setIsConnecting(false);
        onStatusChange(copy.permissionError);
      });
    } catch {
      setErrorMessage(copy.permissionError);
      setIsConnecting(false);
      onStatusChange(copy.permissionError);
    }
  };

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[24px] border border-[#dee2e6] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        <div className="flex items-center justify-between border-b border-[#dee2e6] px-5 py-4 dark:border-[#2c3440]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.cardTitle}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a1a] dark:text-white">{copy.videoTitle}</h3>
          </div>
          <span className="rounded-full bg-[#f3f4f6] px-3 py-2 text-xs font-bold text-[#1a1a1a] dark:bg-[#1d242e] dark:text-white">
            {isBroadcasting ? copy.connected : copy.ready}
          </span>
        </div>

        <div className="relative bg-black">
          <video autoPlay className="aspect-[9/14] w-full object-cover" muted playsInline ref={previewRef} />
          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-black">
            <Camera size={14} />
            {activeOperator.name}
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-4 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-[#dbe4ef]"
            onClick={() => {
              if (isBroadcasting) {
                void stopBroadcast();
              } else {
                void startBroadcast();
              }
            }}
            type="button"
          >
            {isConnecting ? <LoaderCircle className="animate-spin" size={16} /> : isBroadcasting ? <VideoOff size={16} /> : <Video size={16} />}
            {isBroadcasting ? copy.stop : copy.start}
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dee2e6] px-4 py-4 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f3f4f6] dark:border-[#2c3440] dark:text-white dark:hover:bg-[#1d242e]"
            disabled={!isBroadcasting}
            onClick={() => {
              const detail =
                lang === "es"
                  ? `${activeOperator.name} necesita confirmar una salida prioritaria desde el movil.`
                  : `${activeOperator.name} needs to confirm a priority outbound movement from mobile.`;
              sendToAdmin({
                type: "operator:request",
                title: lang === "es" ? "Aprobacion de movimiento especial" : "Special movement approval",
                detail,
              });
              void persistApprovalRequest(detail);
              onSubmitApprovalRequest(activeOperator.id);
              sileo.info({
                title: copy.requestSuccess,
                description: `${activeOperator.name} · ${activeOperator.shift}`,
              });
            }}
            type="button"
          >
            <WandSparkles size={16} />
            {copy.request}
          </button>

          {errorMessage ? <p className="text-sm text-rose-500">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
