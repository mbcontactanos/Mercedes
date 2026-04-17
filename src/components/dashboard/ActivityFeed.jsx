const LEVEL_STYLES = {
  INFO: "bg-[#151b22] text-[#dbe4ef] ring-[#273340]",
  WARN: "bg-[#241d10] text-[#f5c97a] ring-[#45361a]",
  ERROR: "bg-[#271313] text-[#ffb4b4] ring-[#472121]",
};

export default function ActivityFeed({ entries }) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <article className="rounded-[20px] border border-[#d7dde4] bg-[#eef2f5] p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)] dark:border-[#2c3440] dark:bg-[#0f141a]" key={entry.id}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.INFO}`}>
                {entry.level}
              </span>
                <h3 className="mt-3 text-base font-semibold text-[#1a1a1a] dark:text-white">{entry.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#334155] dark:text-[#aab6c6]">{entry.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(entry.chips ?? []).map((chip) => (
                    <span
                      className="rounded-full border border-[#d7dde4] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#151b22] dark:text-[#dbe4ef]"
                      key={`${entry.id}-${chip}`}
                    >
                      {chip}
                    </span>
                  ))}
                  {entry.source ? (
                    <span className="rounded-full border border-[#d7dde4] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748b] dark:border-[#2c3440] dark:bg-[#151b22] dark:text-[#8ea0b7]">
                      {entry.source}
                    </span>
                  ) : null}
                </div>
              </div>
            <p className="text-sm text-[#64748b] dark:text-[#8ea0b7]">{entry.timestamp}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
