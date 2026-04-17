import { Activity, Boxes, Camera, ClipboardList, LogOut, Settings } from "lucide-react";
import MercedesLogo from "../common/MercedesLogo.jsx";
import { NAV_ITEMS, SHELL_COPY } from "../../config/ui-copy.js";

/**
 * Sidebar Component
 * 
 * Flow:
 * - Displays the main navigation for the warehouse management system.
 * - Integration: Interacts with AppContext to handle navigation and sign-out.
 * - Data: Receives user profile and current page from parent to highlight active routes.
 */
const ICONS = {
  inventory: Boxes,
  analysis: Activity,
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

  return (
    <aside className="hidden w-[256px] shrink-0 border-r border-[#dee2e6] bg-white px-6 py-6 lg:flex lg:flex-col dark:border-[#2c3440] dark:bg-[#13171d]">
      <div className="flex items-center gap-4">
        <MercedesLogo theme={theme} />
        <div>
          <p className="font-['Space_Grotesk'] text-[20px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] dark:text-white">MERCEDES</p>
          <p className="font-['Space_Grotesk'] text-[20px] font-bold uppercase tracking-[0.2em] text-[#1a1a1a] dark:text-white">VITORIA</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icono = ICONS[item.key];
          const isActive = currentPage === item.key;

          return (
            <button
              className={`flex items-center gap-3 rounded-[22px] px-4 py-3 text-left transition ${
                isActive
                  ? "border border-[#dee2e6] bg-[#dee2e6] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#e5e7eb] dark:text-black"
                  : "text-[#6c757d] hover:bg-[#f8f9fa] hover:text-[#1a1a1a] dark:text-[#8ea0b7] dark:hover:bg-[#191f27] dark:hover:text-white"
              }`}
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <Icono size={18} />
              <span className="block font-['Space_Grotesk'] text-base font-medium">{item.label[lang]}</span>
            </button>
          );
        })}
      </nav>

      <button
        className="mt-2 flex items-center gap-4 rounded-2xl px-4 py-3 text-left text-[#6c757d] transition hover:bg-[#f8f9fa] hover:text-[#1a1a1a] dark:text-[#8ea0b7] dark:hover:bg-[#191f27] dark:hover:text-white"
        onClick={() => onNavigate("settings")}
        type="button"
      >
        <Settings size={18} />
        <span className="font-['Space_Grotesk'] text-base font-medium">{etiquetaTema}</span>
      </button>

      <div className="mt-4 h-px bg-[#dee2e6] dark:bg-[#2c3440]" />

      <div className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ced4da] bg-[#2a2a2a] text-white dark:border-[#2c3440] dark:bg-white dark:text-black">
          {(userName ?? "J").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-['Space_Grotesk'] text-sm font-bold text-[#1a1a1a] dark:text-white">{userName}</p>
          <p className="truncate font-['Space_Grotesk'] text-[10px] font-medium tracking-[0.08em] text-[#6c757d] dark:text-[#8ea0b7]">
            {(userRole ?? SHELL_COPY.opsChief[lang]).toUpperCase()} · {userEmail}
          </p>
        </div>
        <button className="text-[#6c757d] dark:text-[#8ea0b7]" onClick={onSignOut} type="button">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
