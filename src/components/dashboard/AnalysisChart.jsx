export default function AnalysisChart({ series }) {
  const peak = Math.max(1, ...series.map((entry) => entry.value));
  const palette = [
    "from-[#1a1a1a] to-[#606a75]",
    "from-[#0f172a] to-[#1d4ed8]",
    "from-[#3b2f0f] to-[#eab308]",
    "from-[#123524] to-[#10b981]",
    "from-[#2a1a12] to-[#fb923c]",
    "from-[#3f3f46] to-[#a1a1aa]",
  ];

  return (
    <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-[20px] border border-[#d7dde4] bg-[#eef2f5] p-4 dark:border-[#2c3440] dark:bg-[#0f141a]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#64748b] dark:text-[#8ea0b7]">Datos reales</p>
          <p className="text-xs font-semibold text-[#1a1a1a] dark:text-white">Lectura por evento y solicitud</p>
        </div>
        <div className="flex h-44 items-end gap-2">
          {series.map((entry, index) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={entry.label}>
              <div className="flex h-32 w-full items-end rounded-[16px] border border-[#d7dde4] bg-[#dde4ea] p-1.5 dark:border-[#22303c] dark:bg-[#151c24]">
                <div
                  className={`w-full rounded-[10px] bg-gradient-to-t ${palette[index % palette.length]}`}
                  style={{ height: `${Math.max(16, (entry.value / peak) * 100)}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-[#1a1a1a] dark:text-white">{entry.label}</p>
                <p className="text-xs text-[#64748b] dark:text-[#8ea0b7]">{entry.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[20px] border border-[#d7dde4] bg-[#eef2f5] p-4 dark:border-[#2c3440] dark:bg-[#0f141a]">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Lectura</p>
        <h3 className="mt-2 text-base font-semibold text-[#1a1a1a] dark:text-white">Resumen del turno</h3>
        <ul className="mt-3 space-y-2 text-xs leading-5 text-[#334155] dark:text-[#aab6c6]">
          <li>Datos reales del contexto operativo.</li>
          <li>Barras de logs, solicitudes, detecciones y operarios.</li>
          <li>Sin valores inventados cuando no hay datos.</li>
        </ul>
        <div className="mt-3 rounded-[14px] border border-[#d7dde4] bg-[#dde4ea] px-3 py-2 text-[11px] text-[#334155] dark:border-[#22303c] dark:bg-[#151c24] dark:text-[#dbe4ef]">
          Este panel se alimenta de datos del contexto real del proyecto y no de mocks de interfaz.
        </div>
      </div>
    </div>
  );
}
