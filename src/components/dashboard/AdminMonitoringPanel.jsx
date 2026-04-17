import { useEffect, useMemo, useRef } from "react";
import { Check, MonitorSmartphone, ShieldCheck, Video, X } from "lucide-react";
import { identifyPieceElement, sampleDetectionColor } from "../../lib/piece-detection.js";

const COPY = {
  es: {
    title: "Monitorizacion de operarios",
    subtitle: "El desktop admin recibe las camaras moviles activas y no usa la webcam local del puesto.",
    ready: "Hub admin listo",
    waiting: "Esperando operarios",
    live: "Emitiendo",
    offline: "Sin conexion",
    noSignal: "Todavia no hay una senal remota publicada por este operario.",
    requests: "Solicitudes pendientes",
    approve: "Aprobar",
    deny: "Denegar",
    camera: "Camara remota",
    updated: "Ultima actividad",
    detector: "TensorFlow activo",
    sizes: {
      tiny: "Muy pequeno",
      small: "Pequeno",
      medium: "Medio",
      large: "Grande",
    },
  },
  en: {
    title: "Operator monitoring",
    subtitle: "The desktop admin receives active mobile cameras and never uses the local workstation webcam.",
    ready: "Admin hub ready",
    waiting: "Waiting for operators",
    live: "Live",
    offline: "Offline",
    noSignal: "There is no remote signal published by this operator yet.",
    requests: "Pending requests",
    approve: "Approve",
    deny: "Deny",
    camera: "Remote camera",
    updated: "Last activity",
    detector: "TensorFlow active",
    sizes: {
      tiny: "Tiny",
      small: "Small",
      medium: "Medium",
      large: "Large",
    },
  },
};

const DETECTION_INTERVAL_MS = 700;
const MAX_BOXES = 12;
const FULL_FRAME_MIN_SCORE = 0.2;
const ZOOM_FRAME_MIN_SCORE = 0.1;
const ZOOM_CROP_RATIO = 0.68;

function formatTimestamp(timestamp, lang) {
  if (!timestamp) {
    return lang === "es" ? "Sin actividad" : "No activity";
  }

  return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function normalizeDetection(rawDetection, frameWidth, frameHeight, copy, source) {
  const [x, y, width, height] = rawDetection.bbox;
  const area = width * height;
  const frameArea = frameWidth * frameHeight;
  const areaRatio = frameArea ? area / frameArea : 0;
  const longestSideRatio = Math.max(width / frameWidth, height / frameHeight);
  const aspectRatio = width / Math.max(height, 1);
  const elongation = Math.max(aspectRatio, 1 / Math.max(aspectRatio, 0.0001));
  const axisDirection = width >= height * 1.18 ? "horizontal" : height >= width * 1.18 ? "vertical" : "diagonal";

  let shapeHint = "compacta";
  if (elongation >= 3) {
    shapeHint = "muy-fina";
  } else if (elongation >= 2) {
    shapeHint = "alargada";
  } else if (elongation >= 1.25) {
    shapeHint = "oblicua";
  }

  let sizeKey = "large";
  if (areaRatio < 0.012 || longestSideRatio < 0.12) {
    sizeKey = "tiny";
  } else if (areaRatio < 0.03 || longestSideRatio < 0.2) {
    sizeKey = "small";
  } else if (areaRatio < 0.11) {
    sizeKey = "medium";
  }

  return {
    bbox: [x, y, width, height],
    class: rawDetection.class,
    score: rawDetection.score,
    sizeKey,
    sizeLabel: copy.sizes[sizeKey],
    coverage: `${Math.max(areaRatio * 100, 0.1).toFixed(1)}%`,
    areaRatio,
    longestSideRatio,
    aspectRatio,
    elongation,
    axisDirection,
    shapeHint,
    majorSidePx: Math.max(width, height),
    minorSidePx: Math.max(Math.min(width, height), 1),
    source,
  };
}

function computeIoU(boxA, boxB) {
  const [ax, ay, aw, ah] = boxA;
  const [bx, by, bw, bh] = boxB;
  const left = Math.max(ax, bx);
  const top = Math.max(ay, by);
  const right = Math.min(ax + aw, bx + bw);
  const bottom = Math.min(ay + ah, by + bh);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);

  if (!intersection) {
    return 0;
  }

  const union = aw * ah + bw * bh - intersection;
  return union ? intersection / union : 0;
}

function mergeDetections(detections) {
  const sortedDetections = [...detections].sort((left, right) => right.score - left.score);
  const merged = [];

  sortedDetections.forEach((candidate) => {
    const duplicate = merged.find(
      (current) => current.class === candidate.class && computeIoU(current.bbox, candidate.bbox) > 0.42,
    );

    if (!duplicate) {
      merged.push(candidate);
    }
  });

  return merged.slice(0, MAX_BOXES);
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVisualBoundingBox(detection) {
  const [x, y, width, height] = detection.bbox;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const longSide = Math.max(width, height);
  const shortSide = Math.max(Math.min(width, height), 1);
  const extraLongSide = clampValue(longSide * 0.045, 2, 12);
  const extraShortSide = clampValue(shortSide * 0.08, 2, 10);
  const visualWidth = width + extraLongSide * 2;
  const visualHeight = height + extraShortSide * 2;

  return [
    clampValue(centerX - visualWidth / 2, 0, detection.frameWidth - 1),
    clampValue(centerY - visualHeight / 2, 0, detection.frameHeight - 1),
    clampValue(visualWidth, 1, detection.frameWidth),
    clampValue(visualHeight, 1, detection.frameHeight),
  ];
}

function getOverlayTheme(detection) {
  if (detection.elementType === "pieza") {
    return {
      border: "border-[#ffd400]",
      fill: "bg-[#ffd400]/14",
      glow: "shadow-[0_0_0_1px_rgba(255,212,0,0.28),0_0_20px_rgba(255,212,0,0.18)]",
      label: "bg-[#ffd400] text-black",
      marker: "bg-[#ffd400] text-black",
      axis: "bg-[#0f141a]",
      innerBorder: "border-[#fff4bf]/45",
    };
  }

  return {
    border: "border-[#ffc940]",
    fill: "bg-[#ffc940]/10",
    glow: "shadow-[0_0_0_1px_rgba(255,201,64,0.24),0_0_16px_rgba(255,201,64,0.14)]",
    label: "bg-[#151a20] text-[#ffd86b]",
    marker: "bg-[#151a20] text-[#ffd86b]",
    axis: "bg-[#ffd86b]",
    innerBorder: "border-[#ffd86b]/28",
  };
}

function getOverlayLabel(detection) {
  const baseLabel = detection.displayLabel ?? detection.class;
  const directionLabel =
    detection.elementType === "pieza"
      ? `${detection.axisDirection ?? "diagonal"} · ${detection.shapeHint ?? detection.sizeLabel}`
      : detection.sizeLabel;
  const sizeLabel = `${Math.round(detection.majorSidePx ?? 0)}x${Math.round(detection.minorSidePx ?? 0)} px`;
  const confidenceLabel = detection.pieceConfidence ? `${Math.round(detection.pieceConfidence * 100)}%` : null;
  const coverageLabel = detection.coverage ?? null;

  return {
    baseLabel,
    directionLabel,
    sizeLabel,
    confidenceLabel,
    coverageLabel,
  };
}

async function detectZoomedObjects(model, video, canvas, copy) {
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  const cropWidth = frameWidth * ZOOM_CROP_RATIO;
  const cropHeight = frameHeight * ZOOM_CROP_RATIO;
  const cropX = (frameWidth - cropWidth) / 2;
  const cropY = (frameHeight - cropHeight) / 2;

  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  context.clearRect(0, 0, frameWidth, frameHeight);
  context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, frameWidth, frameHeight);

  const predictions = await model.detect(canvas, MAX_BOXES, ZOOM_FRAME_MIN_SCORE);

  return predictions.map((prediction) => {
    const [x, y, width, height] = prediction.bbox;
    return normalizeDetection(
      {
        ...prediction,
        bbox: [
          cropX + x * (cropWidth / frameWidth),
          cropY + y * (cropHeight / frameHeight),
          width * (cropWidth / frameWidth),
          height * (cropHeight / frameHeight),
        ],
      },
      frameWidth,
      frameHeight,
      copy,
      "zoom",
    );
  });
}

async function detectTileObjects(model, video, canvas, copy) {
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  const tileWidth = frameWidth * 0.56;
  const tileHeight = frameHeight * 0.56;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  const tiles = [
    [0, 0],
    [frameWidth - tileWidth, 0],
    [0, frameHeight - tileHeight],
    [frameWidth - tileWidth, frameHeight - tileHeight],
    [(frameWidth - tileWidth) / 2, (frameHeight - tileHeight) / 2],
  ];
  const detections = [];

  canvas.width = frameWidth;
  canvas.height = frameHeight;

  for (const [tileX, tileY] of tiles) {
    context.clearRect(0, 0, frameWidth, frameHeight);
    context.filter = "contrast(1.08) saturate(1.05) brightness(1.02)";
    context.drawImage(video, tileX, tileY, tileWidth, tileHeight, 0, 0, frameWidth, frameHeight);
    context.filter = "none";

    const predictions = await model.detect(canvas, MAX_BOXES, ZOOM_FRAME_MIN_SCORE);

    detections.push(
      ...predictions.map((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        return normalizeDetection(
          {
            ...prediction,
            bbox: [
              tileX + x * (tileWidth / frameWidth),
              tileY + y * (tileHeight / frameHeight),
              width * (tileWidth / frameWidth),
              height * (tileHeight / frameHeight),
            ],
          },
          frameWidth,
          frameHeight,
          copy,
          "tile",
        );
      }),
    );
  }

  return detections;
}

export default function PanelMonitoreoAdmin({
  adminHubReady,
  detections,
  lang,
  mobileOperators,
  onApproveRequest,
  onDenyRequest,
  onDetectionsChange,
  operatorStreams,
  pendingRequests,
  videoRefs,
}) {
  const copy = COPY[lang];
  const modelRef = useRef(null);
  const detectorTimerRef = useRef(null);
  const detectorCanvasRef = useRef(null);
  const isDetectingRef = useRef(false);
  const cubosOperarios = useMemo(() => {
    const slots = [...mobileOperators];

    while (slots.length < 4) {
      slots.push({
        id: `slot-${slots.length + 1}`,
        name: lang === "es" ? "Slot libre" : "Free slot",
        shift: lang === "es" ? "Preparado para mas operarios" : "Ready for more operators",
        connected: false,
        activity: lang === "es" ? "Esperando conexion" : "Waiting for connection",
        lastSeen: null,
        esMarcador: true,
      });
    }

    return slots;
  }, [lang, mobileOperators]);

  useEffect(() => {
    if (!adminHubReady) {
      onDetectionsChange([]);
      return undefined;
    }

    let cancelled = false;

    const ensureModel = async () => {
      if (modelRef.current) {
        return modelRef.current;
      }

      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      modelRef.current = await cocoSsd.load({
        base: "mobilenet_v2",
      });
      return modelRef.current;
    };

    const runDetection = async () => {
      if (cancelled || isDetectingRef.current) {
        return;
      }

      const liveEntries = cubosOperarios.filter((operator) => operatorStreams[operator.id]?.stream && !operator.esMarcador);

      if (!liveEntries.length) {
        onDetectionsChange([]);
        return;
      }

      isDetectingRef.current = true;

      try {
        const model = await ensureModel();
        if (cancelled) {
          return;
        }

        if (!detectorCanvasRef.current) {
          detectorCanvasRef.current = document.createElement("canvas");
        }

        const nextDetections = [];

        for (const operator of liveEntries) {
          const video = videoRefs.current[operator.id];

          if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
            continue;
          }

          const fullFrame = await model.detect(video, MAX_BOXES, FULL_FRAME_MIN_SCORE);
          const normalizedFullFrame = fullFrame.map((prediction) =>
            normalizeDetection(prediction, video.videoWidth, video.videoHeight, copy, "full"),
          );
          const zoomFrame = await detectZoomedObjects(model, video, detectorCanvasRef.current, copy);
          const tiledFrame = await detectTileObjects(model, video, detectorCanvasRef.current, copy);
          const mergedDetections = mergeDetections([...normalizedFullFrame, ...zoomFrame, ...tiledFrame]).map((prediction) => ({
            ...prediction,
            operatorId: operator.id,
            operatorName: operator.name,
            frameWidth: video.videoWidth,
            frameHeight: video.videoHeight,
            id: `${operator.id}-${prediction.class}-${prediction.bbox.map((value) => Math.round(value)).join("-")}`,
          }));

          const analysisCanvas = detectorCanvasRef.current;
          analysisCanvas.width = video.videoWidth;
          analysisCanvas.height = video.videoHeight;
          const analysisContext = analysisCanvas.getContext("2d", { willReadFrequently: true });

          if (analysisContext) {
            analysisContext.clearRect(0, 0, video.videoWidth, video.videoHeight);
            analysisContext.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          }

          const enrichedDetections = mergedDetections.map((prediction) => {
            if (!analysisContext) {
              return prediction;
            }

            const colorFeatures = sampleDetectionColor(
              analysisContext,
              prediction.bbox,
              prediction.frameWidth,
              prediction.frameHeight,
            );
            const pieceMatch = identifyPieceElement(prediction, colorFeatures);

            return pieceMatch
              ? {
                  ...prediction,
                  ...pieceMatch,
                  displayLabel: pieceMatch.elementLabel,
                  visualBbox: getVisualBoundingBox({
                    ...prediction,
                    ...pieceMatch,
                  }),
                }
              : {
                  ...prediction,
                  toneLabel: colorFeatures.toneLabel,
                  displayLabel: prediction.class,
                  visualBbox: prediction.bbox,
                };
          });

          nextDetections.push(...enrichedDetections);
        }

        if (!cancelled) {
          onDetectionsChange(nextDetections);
        }
      } catch {
        if (!cancelled) {
          onDetectionsChange([]);
        }
      } finally {
        isDetectingRef.current = false;
      }
    };

    void runDetection();
    detectorTimerRef.current = window.setInterval(() => {
      void runDetection();
    }, DETECTION_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(detectorTimerRef.current);
      detectorTimerRef.current = null;
      isDetectingRef.current = false;
    };
  }, [adminHubReady, copy, cubosOperarios, onDetectionsChange, operatorStreams, videoRefs]);

  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Remote Ops</p>
            <h2 className="mt-2 text-xl font-semibold text-[#1a1a1a] dark:text-white">{copy.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dee2e6] bg-[#f8f9fa] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white">
              <ShieldCheck size={15} />
              {adminHubReady ? copy.ready : copy.waiting}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white dark:bg-white dark:text-black">
              <Video size={15} />
              {copy.detector}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cubosOperarios.map((operator) => {
          const streamEntry = operatorStreams[operator.id];
          const isLive = !operator.esMarcador && Boolean(streamEntry?.stream) && operator.connected;
          const operatorDetections = detections.filter((item) => item.operatorId === operator.id);

          return (
            <article
              className="overflow-hidden rounded-[24px] border border-[#dee2e6] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]"
              key={operator.id}
            >
              <div className="flex items-center justify-between border-b border-[#dee2e6] px-5 py-4 dark:border-[#2c3440]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f3f4f6] text-[#1a1a1a] dark:bg-[#1d242e] dark:text-white">
                    <MonitorSmartphone size={18} />
                  </div>
                  <div>
                    <p className="font-['Space_Grotesk'] text-base font-bold text-[#1a1a1a] dark:text-white">{operator.name}</p>
                    <p className="text-xs text-[#64748b] dark:text-[#8ea0b7]">{operator.shift}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    isLive
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-[#e9ecef] text-[#495057] dark:bg-[#1d242e] dark:text-[#aab6c6]"
                  }`}
                >
                  {isLive ? copy.live : copy.offline}
                </span>
              </div>

              <div className="relative bg-black">
                {isLive ? (
                  <>
                    <video
                      autoPlay
                      className="aspect-square w-full object-cover"
                      muted
                      playsInline
                      ref={(node) => {
                        if (node) {
                          videoRefs.current[operator.id] = node;
                        }
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0">
                      {operatorDetections.map((detection) => {
                        const box = detection.visualBbox ?? detection.bbox;
                        const left = `${(box[0] / detection.frameWidth) * 100}%`;
                        const top = `${(box[1] / detection.frameHeight) * 100}%`;
                        const width = `${(box[2] / detection.frameWidth) * 100}%`;
                        const height = `${(box[3] / detection.frameHeight) * 100}%`;
                        const theme = getOverlayTheme(detection);
                        const label = getOverlayLabel(detection);
                        const axisDirection = detection.axisDirection ?? "horizontal";
                        const axisClass =
                          axisDirection === "vertical"
                            ? "top-3 bottom-3 left-1/2 w-[2px] -translate-x-1/2"
                            : axisDirection === "diagonal"
                              ? "left-2 right-2 top-1/2 h-[2px] -translate-y-1/2 rotate-12"
                              : "left-3 right-3 top-1/2 h-[2px] -translate-y-1/2";

                        return (
                          <div
                            className={`absolute rounded-[18px] border-2 ${theme.border} ${theme.fill} ${theme.glow}`}
                            key={detection.id}
                            style={{ left, top, width, height }}
                          >
                            <div className={`absolute inset-1 rounded-[14px] border ${theme.innerBorder}`} />
                            <div
                              className={`absolute ${axisClass} rounded-full ${theme.axis} origin-center`}
                              style={{
                                opacity: detection.elementType === "pieza" ? 0.92 : 0.68,
                              }}
                            />
                            <span className={`absolute left-0 top-0 h-3.5 w-3.5 rounded-[5px] border border-white/25 ${theme.marker}`} />
                            <span className={`absolute right-0 top-0 h-3.5 w-3.5 rounded-[5px] border border-white/25 ${theme.marker}`} />
                            <span className={`absolute left-0 bottom-0 h-3.5 w-3.5 rounded-[5px] border border-white/25 ${theme.marker}`} />
                            <span className={`absolute right-0 bottom-0 h-3.5 w-3.5 rounded-[5px] border border-white/25 ${theme.marker}`} />
                            <div className={`absolute left-2 top-2 rounded-2xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${theme.label}`}>
                              <div>{label.baseLabel}</div>
                              <div className="mt-1 flex items-center gap-2 text-[9px] font-semibold tracking-[0.08em] opacity-90">
                                <span>{label.directionLabel}</span>
                                <span aria-hidden="true">&middot;</span>
                                <span>{label.sizeLabel}</span>
                                {label.confidenceLabel ? (
                                  <>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{label.confidenceLabel}</span>
                                  </>
                                ) : null}
                                {label.coverageLabel ? (
                                  <>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{label.coverageLabel}</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center gap-3 px-8 text-center text-sm leading-6 text-white/75">
                    <MonitorSmartphone size={30} />
                    <span>{operator.esMarcador ? operator.shift : copy.noSignal}</span>
                  </div>
                )}
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-black">
                  <Video size={14} />
                  {copy.camera}
                </div>
                <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/92 px-4 py-3 text-left text-[#1a1a1a]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b]">{copy.updated}</p>
                  <p className="mt-1 text-sm font-semibold">{formatTimestamp(operator.lastSeen, lang)}</p>
                  <p className="mt-2 text-xs text-[#495057]">{operator.activity}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-[24px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Workflow</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a1a] dark:text-white">{copy.requests}</h3>
          </div>
          <span className="rounded-full bg-[#f3f4f6] px-3 py-2 text-xs font-bold text-[#1a1a1a] dark:bg-[#1d242e] dark:text-white">
            {pendingRequests.length}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {pendingRequests.length ? (
            pendingRequests.map((request) => (
              <article
                className="rounded-[22px] border border-[#dee2e6] bg-[#f8f9fa] p-4 dark:border-[#2c3440] dark:bg-[#191f27]"
                key={request.id}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-['Space_Grotesk'] text-base font-bold text-[#1a1a1a] dark:text-white">{request.title}</p>
                    <p className="mt-1 text-sm text-[#64748b] dark:text-[#aab6c6]">{request.detail}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-[#64748b] dark:text-[#8ea0b7]">
                      <span>{request.operatorName}</span>
                      <span>· {request.requesterRoleLabel ?? request.requesterRole}</span>
                      <span>· {request.approvalPolicy}</span>
                    </div>
                    {request.transcript ? (
                      <p className="mt-3 rounded-2xl border border-[#dee2e6] bg-white px-3 py-3 text-sm text-[#334155] dark:border-[#2c3440] dark:bg-[#11161d] dark:text-[#dbe4ef]">
                        {request.transcript}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-[#dbe4ef]"
                      onClick={() => onApproveRequest(request.id)}
                      type="button"
                    >
                      <Check size={15} />
                      {copy.approve}
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-[#dee2e6] px-4 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f3f4f6] dark:border-[#2c3440] dark:text-white dark:hover:bg-[#1d242e]"
                      onClick={() => onDenyRequest(request.id)}
                      type="button"
                    >
                      <X size={15} />
                      {copy.deny}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#dee2e6] px-4 py-8 text-center text-sm text-[#64748b] dark:border-[#2c3440] dark:text-[#8ea0b7]">
              {lang === "es" ? "No hay solicitudes pendientes ahora mismo." : "There are no pending requests right now."}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
