import { useEffect, useRef, useState } from "react";
import { Bell, Download, Moon, Search, Sun } from "lucide-react";
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
  const bellPanelRef = useRef(null);
  const [bellRinging, setBellRinging] = useState(false);

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
    if (!notificationsOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        bellPanelRef.current &&
        !bellPanelRef.current.contains(event.target) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target)
      ) {
        onCloseNotifications?.();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [notificationsOpen, onCloseNotifications]);

  return (
    <header className="border-b border-[#dee2e6] bg-[#f8f9fa] px-4 py-5 md:px-8 dark:border-[#2c3440] dark:bg-[#13171d]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
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

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#0df20d] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-black">
            <span className="h-2 w-2 rounded-full bg-white" />
            {syncLabel}
          </div>

          <button
            className="inline-flex h-[52px] items-center gap-2 rounded-2xl border border-[#dee2e6] bg-white px-4 text-sm font-semibold text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white"
            onClick={onToggleTheme}
            type="button"
          >
            {isDark ? <Moon size={18} /> : <Sun size={18} />}
            {isDark ? (lang === "es" ? "Modo oscuro" : "Dark mode") : lang === "es" ? "Modo claro" : "Light mode"}
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

            {notificationsOpen ? (
              <div
                ref={bellPanelRef}
                className="absolute right-0 top-[calc(100%+12px)] z-50 w-[23rem] rounded-[24px] border border-[#d8dee8] bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-[#2c3440] dark:bg-[#11161d]"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.24em] text-[#64748b] dark:text-[#8ea0b7]">
                      {lang === "es" ? "Sileo" : "Sileo"}
                    </p>
                    <p className="text-sm font-semibold text-[#111827] dark:text-white">
                      {lang === "es" ? "Centro de aprobaciones" : "Approval center"}
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-[#d8dee8] px-3 py-1 text-[11px] font-semibold text-[#111827] dark:border-[#2c3440] dark:text-white"
                    onClick={() => onCloseNotifications?.()}
                    type="button"
                  >
                    {lang === "es" ? "Cerrar" : "Close"}
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingRequests.length ? (
                    pendingRequests.slice(0, 4).map((request) => (
                      <article
                        className="rounded-[20px] border border-[#e2e8f0] bg-[#f8fafc] p-3 dark:border-[#2c3440] dark:bg-[#191f27]"
                        key={request.id}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
                              {request.requesterRoleLabel ?? request.approvalPolicy}
                            </p>
                            <p className="text-sm font-semibold text-[#111827] dark:text-white">{request.operatorName}</p>
                          </div>
                          <span className="rounded-full bg-[#111827] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white dark:bg-white dark:text-black">
                            {request.approvalPolicy}
                          </span>
                        </div>
                        <p className="mb-3 text-sm leading-6 text-[#334155] dark:text-[#dbe4ef]">
                          {request.transcript || request.detail}
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="rounded-full bg-black px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-black"
                            onClick={async () => {
                              await onApproveRequest?.(request.id);
                              onCloseNotifications?.();
                            }}
                            type="button"
                          >
                            {lang === "es" ? "Aprobar" : "Approve"}
                          </button>
                          <button
                            className="rounded-full border border-[#d1d5db] px-3 py-2 text-xs font-semibold text-[#111827] dark:border-[#2c3440] dark:text-white"
                            onClick={async () => {
                              await onDenyRequest?.(request.id);
                              onCloseNotifications?.();
                            }}
                            type="button"
                          >
                            {lang === "es" ? "Rechazar" : "Reject"}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#d8dee8] px-4 py-5 text-sm text-[#64748b] dark:border-[#2c3440] dark:text-[#8ea0b7]">
                      {lang === "es" ? "No hay solicitudes pendientes." : "No pending requests."}
                    </div>
                  )}

                  {notifications.length ? (
                    <div className="border-t border-[#e2e8f0] pt-3 dark:border-[#2c3440]">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
                        {lang === "es" ? "Actividad reciente" : "Recent activity"}
                      </p>
                      <div className="space-y-2">
                        {notifications.slice(0, 3).map((notification) => (
                          <article
                            className="rounded-[16px] border border-[#e2e8f0] px-3 py-3 dark:border-[#2c3440]"
                            key={notification.id}
                          >
                            <p className="text-sm font-semibold text-[#111827] dark:text-white">{notification.title}</p>
                            <p className="mt-1 text-xs leading-5 text-[#64748b] dark:text-[#8ea0b7]">
                              {notification.description}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
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
