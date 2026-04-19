import React from "react";
import { useAppContext } from "../../context/useAppContext.js";
import ActivityFeed from "../../components/dashboard/ActivityFeed.jsx";
import { PAGE_COPY } from "../../config/ui-copy.js";

/**
 * RegistrosPage — Visor de auditoría y eventos del sistema
 * 
 * Muestra una lista cronológica de logs del sistema (INFO, WARN, ERROR)
 * consumidos directamente desde el AppContext. Utiliza el componente
 * ActivityFeed para mantener la consistencia visual con el resto del dashboard.
 */
export default function RegistrosPage() {
  const { systemLogs, lang } = useAppContext();
  
  // Obtenemos los textos traducidos para la página desde la configuración global
  const copy = PAGE_COPY.logs?.[lang] || PAGE_COPY.logs?.es || {
    title: "Registros del Sistema",
    subtitle: "AUDITORIA Y EVENTOS"
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Encabezado de la página */}
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {copy.subtitle}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {copy.title}
        </h1>
      </div>

      {/* Feed de actividades/logs */}
      <div className="max-w-4xl">
        <ActivityFeed entries={systemLogs} />
      </div>
    </div>
  );
}
