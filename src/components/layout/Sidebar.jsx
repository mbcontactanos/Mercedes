import { Boxes, Camera, ClipboardList, Images, LogOut, Settings } from "lucide-react";
import MercedesLogo from "../common/MercedesLogo.jsx";
import { NAV_ITEMS, SHELL_COPY } from "../../config/ui-copy.js";

/**
 * Componente Sidebar
 *
 * Flujo:
 * - Muestra la navegación principal de la aplicación.
 * - Se integra con AppContext para navegación y cierre de sesión.
 * - Recibe página actual y perfil para marcar la ruta activa.
 */
const ICONS = {
  inventory: Boxes,
  pieces: Images,
  logs: ClipboardList,
  camera: Camera,
};

export default function Sidebar({ currentPage, lang, onNavigate, onSignOut, theme, userEmail, userName, userRole }) {
  const etiquetaTema =
    theme === "dark"
      ? lang === "es"
        ? `${SHELL_COPY.settings[lang]} · Noche`
        : `${SHELL_COPY.settings[lang]} · Dark`
      : lang === "en"
        ? `${SHELL_COPY.settings[lang]} · Light`
        : SHELL_COPY.settings[lang];

  const dockItems = [
    ...NAV_ITEMS.map((item) => ({
      key: item.key,
      label: item.label[lang],
      icon: ICONS[item.key],
    })),
    {
      key: "settings",
      label: etiquetaTema,
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden h-screen w-[96px] shrink-0 px-2 py-5 lg:sticky lg:top-0 lg:flex lg:flex-col lg:items-center lg:justify-center">
      <div className="flex w-full max-w-[72px] flex-col items-center rounded-[20px] border border-[#dee2e6] bg-white/95 px-2 py-3 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur-sm lg:translate-y-6 dark:border-[#2c3440] dark:bg-[#13171d]/95">
        <div className="flex items-center justify-center">
        <MercedesLogo theme={theme} />
      </div>

        <nav className="mt-4 flex flex-col items-center gap-2">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;

          return (
            <button
              aria-label={item.label}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl border transition ${
                isActive
                  ? "border-[#b8c0cc] bg-[#e9edf2] text-[#1a1a1a] shadow-[0_8px_20px_rgba(15,23,42,0.12)] dark:border-[#3b4655] dark:bg-[#e5e7eb] dark:text-black"
                  : "border-[#dee2e6] bg-[#f8f9fa] text-[#6c757d] hover:-translate-y-0.5 hover:border-[#cfd4da] hover:bg-white hover:text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-[#8ea0b7] dark:hover:border-[#3a4658] dark:hover:bg-[#222a35] dark:hover:text-white"
              }`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              title={item.label}
              type="button"
            >
              <Icon size={18} />
              <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#dee2e6] bg-white px-2 py-1 text-[11px] font-semibold text-[#1a1a1a] opacity-0 shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition group-hover:opacity-100 lg:block dark:border-[#2c3440] dark:bg-[#13171d] dark:text-white">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ced4da] bg-[#2a2a2a] text-xs font-bold text-white dark:border-[#2c3440] dark:bg-white dark:text-black">
            {(userName ?? "J").slice(0, 1).toUpperCase()}
          </div>
        <button
          aria-label={`Cerrar sesion ${userEmail ?? ""}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dee2e6] bg-[#f8f9fa] text-[#6c757d] transition hover:-translate-y-0.5 hover:bg-white hover:text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-[#8ea0b7] dark:hover:bg-[#222a35] dark:hover:text-white"
          onClick={onSignOut}
          title={lang === "es" ? "Cerrar sesion" : "Sign out"}
          type="button"
        >
          <LogOut size={16} />
        </button>
      </div>
      </div>
    </aside>
  );
}
