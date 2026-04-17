export default function AvisoInstalacion({ installSupport, visible, onInstall }) {
  const showManualInstall = installSupport?.needsManualInstall;

  if (!visible && !showManualInstall) {
    return null;
  }

  return (
    <div className="mb-6 rounded-[28px] border border-[#dee2e6] bg-[#f8f9fa] px-5 py-4 text-sm text-[#1a1a1a] shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Instalacion</p>
          <p className="mt-2 text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">
            {showManualInstall
              ? "En iPhone o iPad, abre Compartir y usa 'Anadir a pantalla de inicio' para instalar esta PWA en modo operador."
              : "La interfaz ya esta lista como PWA para usarla a pantalla completa y seguir operando aunque la conectividad baje."}
          </p>
        </div>
        {visible ? (
          <button
            className="rounded-[18px] bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black"
            onClick={onInstall}
            type="button"
          >
            Instalar ahora
          </button>
        ) : (
          <span className="rounded-[18px] border border-[#dee2e6] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:border-[#2c3440] dark:text-[#aab6c6]">
            Manual
          </span>
        )}
      </div>
    </div>
  );
}
