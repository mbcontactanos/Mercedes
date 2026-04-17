export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`rounded-[24px] border border-[#d7dde4] bg-[#f5f7f9] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-[#2c3440] dark:bg-[#13171d] ${className}`}>
      <div className="flex flex-col gap-3 border-b border-[#d7dde4] pb-5 md:flex-row md:items-end md:justify-between dark:border-[#2c3440]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Mercedes Vitoria OPS</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
