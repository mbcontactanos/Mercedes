import { ChevronLeft, ChevronRight } from "lucide-react";
import { SHELL_COPY } from "../../config/ui-copy.js";

export default function PanelDerecho({
  activityFilter,
  isCollapsed,
  items,
  lang,
  onClearHistory,
  onFilterChange,
  onSendCommand,
  onToggleCollapsed,
}) {
  const visibleItems =
    activityFilter === "all" ? items : items.filter((item) => item.category === activityFilter || item.category === "all");

  if (isCollapsed) {
    return (
      <aside className="hidden shrink-0 border-l border-[#dee2e6] bg-[#f8f9fa] xl:flex xl:w-[68px] xl:flex-col xl:items-center xl:py-6 dark:border-[#2c3440] dark:bg-[#13171d]">
        <button
          aria-label={lang === "es" ? "Mostrar actividad en vivo" : "Show live activity"}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dee2e6] bg-white text-[#1a1a1a] transition hover:bg-[#eef1f4] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white dark:hover:bg-[#191f27]"
          onClick={onToggleCollapsed}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="mt-6 [writing-mode:vertical-rl] rotate-180 text-[11px] font-bold uppercase tracking-[0.22em] text-[#64748b] dark:text-[#8ea0b7]">
          {SHELL_COPY.liveActivity[lang]}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[384px] shrink-0 overflow-hidden rounded-r-[26px] border-l border-[#dee2e6] bg-[#f8f9fa] xl:flex xl:flex-col dark:border-[#2c3440] dark:bg-[#13171d]">
      <div className="border-b border-[#dee2e6] px-6 py-6 dark:border-[#2c3440]">
        <div className="flex items-center justify-between">
          <h3 className="font-['Space_Grotesk'] text-[18px] font-bold text-[#1a1a1a] dark:text-white">{SHELL_COPY.liveActivity[lang]}</h3>
          <div className="flex items-center gap-3">
            <button className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c757d] dark:text-[#8ea0b7]" onClick={onClearHistory} type="button">
              {SHELL_COPY.clearHistory[lang]}
            </button>
            <button
              aria-label={lang === "es" ? "Ocultar actividad en vivo" : "Hide live activity"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dee2e6] bg-white text-[#1a1a1a] transition hover:bg-[#eef1f4] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white dark:hover:bg-[#191f27]"
              onClick={onToggleCollapsed}
              type="button"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <div className="mt-4 flex rounded-xl border border-[#dee2e6] bg-[#e9ecef] p-1 dark:border-[#2c3440] dark:bg-[#191f27]">
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${activityFilter === "all" ? "bg-[#dee2e6] text-[#1a1a1a] dark:bg-white dark:text-black" : "text-[#64748b] dark:text-[#8ea0b7]"}`}
            onClick={() => onFilterChange("all")}
            type="button"
          >
            {SHELL_COPY.allEvents[lang]}
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${activityFilter === "alerts" ? "bg-[#dee2e6] text-[#1a1a1a] dark:bg-white dark:text-black" : "text-[#64748b] dark:text-[#8ea0b7]"}`}
            onClick={() => onFilterChange("alerts")}
            type="button"
          >
            {SHELL_COPY.alerts[lang]}
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${activityFilter === "logs" ? "bg-[#dee2e6] text-[#1a1a1a] dark:bg-white dark:text-black" : "text-[#64748b] dark:text-[#8ea0b7]"}`}
            onClick={() => onFilterChange("logs")}
            type="button"
          >
            {SHELL_COPY.logs[lang]}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {visibleItems.map((item) => (
          <article className="flex gap-3" key={item.id}>
            <div className="flex w-3 justify-center pt-2">
              <span className={`mt-1 h-[6px] w-[6px] rounded-full ${item.dot}`} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-['Space_Grotesk'] text-[14px] font-bold text-[#1a1a1a] dark:text-white">{item.title}</h4>
                <span className="text-[11px] text-[#64748b] dark:text-[#8ea0b7]">{item.time}</span>
              </div>
              {item.highlighted ? (
                <div className="rounded-xl border border-[#dee2e6] bg-[#e9ecef] p-3 text-[13px] leading-6 text-[#495057] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-[#dbe4ef]">
                  {item.detail}
                </div>
              ) : (
                <p className="text-[13px] leading-6 text-[#64748b] dark:text-[#aab6c6]">{item.detail}</p>
              )}
              {item.source ? <p className="text-[10px] font-medium tracking-[0.02em] text-[#64748b] dark:text-[#8ea0b7]">{item.source}</p> : null}
              {item.chips ? (
                <div className="flex gap-2">
                  {item.chips.map((chip) => (
                    <span className="rounded-full border border-[#dee2e6] bg-white px-2 py-1 text-[10px] font-bold text-[#495057] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-[#dbe4ef]" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-auto border-t border-[#dee2e6] bg-white px-6 py-6 dark:border-[#2c3440] dark:bg-[#10151c]">
        <div className="flex items-center gap-3">
          <button
            className="flex h-14 flex-1 items-center rounded-full border border-[#dee2e6] bg-[#f8f9fa] px-5 text-left text-sm font-medium text-[#64748b] transition hover:bg-[#eef1f4] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-[#aab6c6] dark:hover:bg-[#202833]"
            onClick={onSendCommand}
            type="button"
          >
            {SHELL_COPY.directCommand[lang]}
          </button>
          <button
            aria-label="Enviar comando"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-black text-xl font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-[#dbe4ef]"
            onClick={onSendCommand}
            type="button"
          >
            →
          </button>
        </div>
      </div>
    </aside>
  );
}
