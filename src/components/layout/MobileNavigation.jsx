import { Activity, Boxes, Camera, ClipboardList } from "lucide-react";
import { NAV_ITEMS } from "../../config/ui-copy.js";

const ICONS = {
  inventory: Boxes,
  analysis: Activity,
  logs: ClipboardList,
  camera: Camera,
};

export default function NavegacionMovil({ currentPage, lang, onNavigate, theme }) {
  const isDark = theme === "dark";

  return (
    <nav className={`fixed inset-x-3 bottom-3 z-40 flex items-center justify-between rounded-[28px] border px-4 py-3 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden ${
      isDark ? "border-[#2c3440] bg-[#0f141a]/94" : "border-[#dee2e6] bg-white/94"
    }`}>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.key];
        const isActive = currentPage === item.key;

        return (
          <button
            className={`flex min-w-[70px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition ${
              isActive
                ? isDark
                  ? "bg-white text-black"
                  : "bg-black text-white"
                : isDark
                  ? "text-[#8ea0b7]"
                  : "text-[#64748b]"
            }`}
            key={item.key}
            onClick={() => onNavigate(item.key)}
            type="button"
          >
            <Icon size={17} />
            {item.shortLabel[lang]}
          </button>
        );
      })}
    </nav>
  );
}
