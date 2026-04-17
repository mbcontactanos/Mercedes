import { useMemo } from "react";
import { Activity, ArrowUpRight, Clock, PieChart, TrendingUp, Zap } from "lucide-react";
import AnalysisChart from "../../components/dashboard/AnalysisChart.jsx";
import { useAppContext } from "../../context/useAppContext.js";

const COPY = {
  es: {
    heroTitle: "Centro de Analisis Operativo",
    heroSubtitle: "Monitorizacion avanzada de flujo, demanda y rendimiento de linea en tiempo real.",
    kpis: {
      efficiency: "Eficiencia General",
      output: "Salida de Linea",
      downtime: "Tiempo de Parada",
      prediction: "Prediccion Turno",
    },
    sections: {
      flow: "Analisis de Flujo y Demanda",
      flowSub: "Lectura de demanda, ritmo de linea y recomendaciones operativas.",
      distribution: "Distribucion de Carga",
      distributionSub: "Carga de trabajo actual por sector y muelle de carga.",
      alerts: "Alertas Operativas",
      alertsSub: "Resumen compacto de los eventos que afectan al turno actual.",
    },
  },
  en: {
    heroTitle: "Operational Analytics Center",
    heroSubtitle: "Advanced monitoring of flow, demand, and line performance in real-time.",
    kpis: {
      efficiency: "Overall Efficiency",
      output: "Line Output",
      downtime: "Downtime",
      prediction: "Shift Prediction",
    },
    sections: {
      flow: "Flow and Demand Analytics",
      flowSub: "Demand reading, line rhythm, and operational recommendations.",
      distribution: "Load Distribution",
      distributionSub: "Current workload by sector and loading dock.",
      alerts: "Operational Alerts",
      alertsSub: "Compact summary of events affecting the current shift.",
    },
  },
};

export default function AnalisisPage() {
  const { detections, inventoryItems, lang, mobileOperators, pendingRequests, systemLogs } = useAppContext();
  const copy = COPY[lang];

  const derivedMetrics = useMemo(() => {
    const connectedOperators = mobileOperators.filter((operator) => operator.connected).length;
    const activeStreams = connectedOperators > 0 ? connectedOperators : 0;
    const logLevels = systemLogs.reduce(
      (accumulator, entry) => {
        const key = String(entry.level ?? "INFO").toUpperCase();
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
      },
      { INFO: 0, WARN: 0, ERROR: 0 },
    );

    return {
      activeStreams,
      detectionsCount: detections.length,
      inventoryLoaded: inventoryItems.filter((item) => Number(item.stock) > 0).length,
      logLevels,
      pendingRequests: pendingRequests.length,
    };
  }, [detections.length, inventoryItems, mobileOperators, pendingRequests.length, systemLogs]);

  const chartSeries = useMemo(
    () => [
      { label: lang === "es" ? "Logs" : "Logs", value: derivedMetrics.logLevels.INFO + derivedMetrics.logLevels.WARN + derivedMetrics.logLevels.ERROR },
      { label: lang === "es" ? "Solicitudes" : "Requests", value: derivedMetrics.pendingRequests },
      { label: lang === "es" ? "Piezas" : "Pieces", value: derivedMetrics.detectionsCount },
      { label: lang === "es" ? "Operarios" : "Operators", value: derivedMetrics.activeStreams },
      { label: lang === "es" ? "Inventario" : "Inventory", value: derivedMetrics.inventoryLoaded },
      { label: lang === "es" ? "Errores" : "Errors", value: derivedMetrics.logLevels.ERROR },
    ],
    [derivedMetrics, lang],
  );

  const operationalCards = useMemo(() => {
    const cards = systemLogs.slice(0, 3).map((entry) => ({
      eyebrow: entry.category?.toUpperCase?.() ?? entry.level,
      title: entry.title,
      detail: entry.detail,
      meta: entry.timestamp,
    }));

    if (cards.length) {
      return cards;
    }

    return [
      {
        eyebrow: lang === "es" ? "Sin datos" : "No data",
        title: lang === "es" ? "Aun no hay logs reales" : "No real logs yet",
        detail:
          lang === "es"
            ? "Cuando la base cargue eventos, este bloque mostrara actividad real del turno."
            : "When the database loads events, this block will show real shift activity.",
        meta: "0",
      },
    ];
  }, [lang, systemLogs]);

  const distributionBars = useMemo(() => {
    const bars = [
      { label: lang === "es" ? "Solicitudes pendientes" : "Pending requests", value: derivedMetrics.pendingRequests, color: "bg-[#111827]" },
      { label: lang === "es" ? "Operarios conectados" : "Connected operators", value: derivedMetrics.activeStreams, color: "bg-[#eab308]" },
      { label: lang === "es" ? "Piezas detectadas" : "Detected pieces", value: derivedMetrics.detectionsCount, color: "bg-[#10b981]" },
      { label: lang === "es" ? "Inventario con stock" : "Inventory with stock", value: derivedMetrics.inventoryLoaded, color: "bg-[#3b82f6]" },
    ];
    const peakValue = Math.max(1, ...bars.map((item) => item.value));

    return bars.map((item) => ({
      ...item,
      fill: item.value === 0 ? 0 : Math.max(12, (item.value / peakValue) * 100),
    }));
  }, [derivedMetrics.activeStreams, derivedMetrics.detectionsCount, derivedMetrics.inventoryLoaded, derivedMetrics.pendingRequests, lang]);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="space-y-2">
        <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.4em] text-[#64748b] dark:text-[#8ea0b7]">
          Mercedes Vitoria · Data Engine
        </p>
        <h1 className="font-['Space_Grotesk'] text-[32px] font-bold text-[#1a1a1a] dark:text-white sm:text-[40px]">
          {copy.heroTitle}
        </h1>
        <p className="max-w-2xl text-base text-[#64748b] dark:text-[#aab6c6]">{copy.heroSubtitle}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Activity, label: lang === "es" ? "Eventos del turno" : "Shift events", value: `${systemLogs.length}`, change: "real", trend: "up" },
          { icon: Zap, label: lang === "es" ? "Solicitudes activas" : "Active requests", value: `${derivedMetrics.pendingRequests}`, change: "real", trend: "up" },
          { icon: Clock, label: lang === "es" ? "Piezas detectadas" : "Detected pieces", value: `${derivedMetrics.detectionsCount}`, change: "real", trend: "down" },
          { icon: TrendingUp, label: lang === "es" ? "Errores de log" : "Log errors", value: `${derivedMetrics.logLevels.ERROR}`, change: "real", trend: "neutral" },
        ].map((kpi) => (
          <article
            className="group relative overflow-hidden rounded-[26px] border border-[#d7dde4] bg-[#eef2f5] p-6 transition-all hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] dark:border-[#2c3440] dark:bg-[#13171d]"
            key={kpi.label}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dde4ea] text-[#1a1a1a] dark:bg-[#191f27] dark:text-white">
                <kpi.icon size={20} />
              </div>
              <span className={`text-xs font-bold ${kpi.trend === "up" ? "text-emerald-600" : kpi.trend === "down" ? "text-amber-600" : "text-[#64748b] dark:text-[#8ea0b7]"}`}>
                {kpi.change}
              </span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.1em] text-[#64748b] dark:text-[#8ea0b7]">{kpi.label}</p>
            <p className="mt-1 font-['Space_Grotesk'] text-[24px] font-bold text-[#1a1a1a] dark:text-white">{kpi.value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="rounded-[24px] border border-[#d7dde4] bg-[#f5f7f9] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-[#2c3440] dark:bg-[#13171d]">
            <div className="flex flex-col gap-3 border-b border-[#d7dde4] pb-5 dark:border-[#2c3440] md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Mercedes Vitoria OPS</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white">{copy.sections.flow}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{copy.sections.flowSub}</p>
              </div>
              <div className="rounded-full border border-[#d7dde4] bg-white px-3 py-2 text-xs font-semibold text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#151b22] dark:text-white">
                {lang === "es" ? "Basado en logs, solicitudes y detecciones" : "Based on logs, requests and detections"}
              </div>
            </div>
            <div className="mt-6">
              <AnalysisChart series={chartSeries} />
            </div>
          </section>
        </div>

        <section className="rounded-[24px] border border-[#d7dde4] bg-[#f5f7f9] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-[#2c3440] dark:bg-[#13171d]">
          <div className="flex flex-col gap-3 border-b border-[#d7dde4] pb-5 dark:border-[#2c3440]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Mercedes Vitoria OPS</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white">{copy.sections.distribution}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{copy.sections.distributionSub}</p>
          </div>
          <div className="flex h-full flex-col gap-6 py-4">
            {distributionBars.map((bar) => (
              <div className="space-y-2" key={bar.label}>
                <div className="flex justify-between text-xs font-bold uppercase tracking-[0.1em] text-[#64748b] dark:text-[#8ea0b7]">
                  <span>{bar.label}</span>
                  <span>{bar.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#dde4ea] dark:bg-[#191f27]">
                  <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${bar.fill}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-auto rounded-2xl border border-[#d7dde4] bg-white p-4 dark:border-[#2c3440] dark:bg-[#151b22]">
              <div className="flex items-center gap-3">
                <PieChart className="text-[#1a1a1a] dark:text-white" size={18} />
                <span className="text-sm font-bold text-[#1a1a1a] dark:text-white">
                  {lang === "es" ? "Lectura sectorial real" : "Real sector reading"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#64748b] dark:text-[#aab6c6]">
                {lang === "es"
                  ? "Las barras se recalculan con datos del turno: logs, solicitudes, detecciones e inventario."
                  : "Bars recalculate from shift data: logs, requests, detections and inventory."}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-['Space_Grotesk'] text-[24px] font-bold text-[#1a1a1a] dark:text-white">
              {copy.sections.alerts}
            </h2>
            <p className="text-sm text-[#64748b] dark:text-[#aab6c6]">{copy.sections.alertsSub}</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-[#dee2e6] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[#1a1a1a] hover:bg-[#f8f9fa] dark:border-[#2c3440] dark:text-white dark:hover:bg-[#191f27]">
            Ver todo <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {operationalCards.map((alert, index) => (
            <article
              className={`rounded-[26px] border p-6 shadow-[0_16px_34px_rgba(15,23,42,0.06)] ${
                index === 0
                  ? "border-[#111827] bg-[#111827] text-white dark:border-[#f3f4f6] dark:bg-[#f3f4f6] dark:text-black"
                  : "border-[#d7dde4] bg-[#eef2f5] dark:border-[#2c3440] dark:bg-[#13171d]"
              }`}
              key={`${alert.title}-${index}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-white dark:bg-black" : "bg-[#111827] dark:bg-white"}`} />
                <p className={`text-[10px] font-bold uppercase tracking-[0.3em] ${index === 0 ? "text-white/60 dark:text-black/60" : "text-[#64748b] dark:text-[#8ea0b7]"}`}>
                  {alert.eyebrow}
                </p>
              </div>
              <h3 className={`mt-4 font-['Space_Grotesk'] text-lg font-bold ${index === 0 ? "text-white dark:text-black" : "text-[#1a1a1a] dark:text-white"}`}>
                {alert.title}
              </h3>
              <p className={`mt-3 text-sm leading-6 ${index === 0 ? "text-white/80 dark:text-black/80" : "text-[#64748b] dark:text-[#aab6c6]"}`}>
                {alert.detail}
              </p>
              <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.18em] ${index === 0 ? "text-white/60 dark:text-black/60" : "text-[#64748b] dark:text-[#8ea0b7]"}`}>
                {alert.meta}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
