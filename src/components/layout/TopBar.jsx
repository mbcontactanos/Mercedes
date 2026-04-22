import { useEffect, useRef, useState } from "react";
import { Bell, Download, Moon, Search, Sun } from "lucide-react";
import { sileo } from "sileo";
import { PAGE_COPY, SHELL_COPY } from "../../config/ui-copy.js";

export default function BarraSuperior({
  currentPage,
  installReady,
  lang,
  notifications = [],
  notificationsOpen,
  onInstall,
  onApproveRequest,
  onCloseNotifications,
  onDenyRequest,
  onMarkNotificationsRead,
  onOpenNotifications,
  onSearchChange,
  onToggleLang,
  onToggleTheme,
  pendingRequests = [],
  searchValue,
  syncLabel,
  theme,
  onUpdateToasterOffset,
}) {
  const copy = PAGE_COPY[currentPage];
  const isDark = theme === "dark";
  const bellButtonRef = useRef(null);
  const previousPendingCountRef = useRef(pendingRequests.length);
  const [bellRinging, setBellRinging] = useState(false);
  const [hideOnScroll, setHideOnScroll] = useState(false);

  useEffect(() => {
    if (!bellRinging) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBellRinging(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bellRinging]);

  useEffect(() => {
    if (pendingRequests.length > previousPendingCountRef.current) {
      setBellRinging(true);
    }

    previousPendingCountRef.current = pendingRequests.length;
  }, [pendingRequests.length]);

  useEffect(() => {
    const syncToasterOffset = () => {
      if (!bellButtonRef.current || !onUpdateToasterOffset) {
        return;
      }

      const rect = bellButtonRef.current.getBoundingClientRect();

      onUpdateToasterOffset({
        top: Math.round(rect.bottom + 10),
        right: Math.max(16, Math.round(window.innerWidth - rect.right)),
      });
    };

    syncToasterOffset();
    window.addEventListener("resize", syncToasterOffset);
    window.addEventListener("scroll", syncToasterOffset, true);

    return () => {
      window.removeEventListener("resize", syncToasterOffset);
      window.removeEventListener("scroll", syncToasterOffset, true);
    };
  }, [onUpdateToasterOffset]);

  useEffect(() => {
    const handleScroll = () => {
      setHideOnScroll(window.scrollY > 28);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 mx-3 overflow-hidden rounded-2xl border bg-[#f8f9fa]/95 px-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-200 md:mx-6 md:px-6 dark:bg-[#13171d]/95 ${
        hideOnScroll
          ? "max-h-0 border-transparent py-0 opacity-0 shadow-none"
          : "max-h-[120px] border-[#dee2e6] py-3 opacity-100 dark:border-[#2c3440]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex w-full max-w-[560px] items-center gap-3 rounded-2xl bg-[#e9ecef] px-4 py-3 text-[#475569] dark:bg-[#191f27] dark:text-[#aab6c6]">
            <Search size={18} />
            <input
              className="w-full border-none bg-transparent text-base text-[#475569] outline-none placeholder:text-[#475569] dark:text-[#dbe4ef] dark:placeholder:text-[#8ea0b7]"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={SHELL_COPY.search[lang]}
              type="text"
              value={searchValue}
            />
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.28em] text-[#64748b] dark:text-[#8ea0b7]">{copy.subtitle[lang]}</p>
            <p className="mt-1 truncate font-['Space_Grotesk'] text-base font-bold text-[#1a1a1a] dark:text-white">{copy.title[lang]}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#0df20d] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black">
            <span className="h-2 w-2 rounded-full bg-white" />
            {syncLabel}
          </div>

          <button
            aria-label={isDark ? (lang === "es" ? "Cambiar a modo claro" : "Switch to light mode") : lang === "es" ? "Cambiar a modo oscuro" : "Switch to dark mode"}
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#dee2e6] bg-white text-[#1a1a1a] transition hover:-translate-y-0.5 dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white"
            onClick={onToggleTheme}
            title={isDark ? (lang === "es" ? "Modo claro" : "Light mode") : lang === "es" ? "Modo oscuro" : "Dark mode"}
            type="button"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative">
            <button
              aria-label={lang === "es" ? "Notificaciones" : "Notifications"}
              ref={bellButtonRef}
              className="relative inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[#dee2e6] bg-white text-black transition-transform active:scale-95 dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white"
              onClick={() => {
                if (bellButtonRef.current && onUpdateToasterOffset) {
                  const rect = bellButtonRef.current.getBoundingClientRect();
                  onUpdateToasterOffset({
                    top: Math.round(rect.bottom + 10),
                    right: Math.max(16, Math.round(window.innerWidth - rect.right)),
                  });
                }
                setBellRinging(true);
                // Si no hay notificaciones, forzamos una de prueba para que aparezca el diálogo de aceptar/rechazar
                if (pendingRequests.length === 0) {
                  sileo.info({
                    title: lang === "es" ? "Solicitud de prueba" : "Test request",
                    description: lang === "es" ? "Abriendo centro de aprobaciones..." : "Opening approval center...",
                  });
                }
                onOpenNotifications?.();
                onMarkNotificationsRead?.();
              }}
              type="button"
            >
              <span
                className={bellRinging ? "bell-sileo-ring inline-flex" : "inline-flex"}
                onAnimationEnd={() => setBellRinging(false)}
              >
                <Bell size={18} />
              </span>
            </button>
          </div>

          <button
            className="rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white"
            onClick={onToggleLang}
            type="button"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>

          {installReady ? (
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f8f9fa] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white dark:hover:bg-[#191f27]"
              onClick={onInstall}
              type="button"
            >
              <Download size={16} />
              {SHELL_COPY.install[lang]}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
