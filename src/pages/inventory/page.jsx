import { Grid2x2, LayoutList, ScanLine, Sparkles } from "lucide-react";
import { useAppContext } from "../../context/useAppContext.js";

const COPY = {
  es: {
    subtitle: "GESTION DE ACTIVOS",
    title: "Control de Inventario",
    list: "Lista",
    cards: "Tarjetas",
    activeVision: "Vision activa",
    identified: "Identificados",
    visualRead: "Lectura visual",
    identifiedItems: "Elementos Identificados",
    answered: "Consultas Respondidas",
    operatorTime: "Tiempo Activo del Operador",
    lot: "Lote",
    description: "Descripcion",
    zone: "Zona",
    stock: "Stock",
    eta: "ETA",
    supervisedBy: "supervisa esta familia",
  },
  en: {
    subtitle: "ASSET MANAGEMENT",
    title: "Inventory Control",
    list: "List",
    cards: "Cards",
    activeVision: "Vision active",
    identified: "Identified",
    visualRead: "Visual read",
    identifiedItems: "Identified Items",
    answered: "Answered Queries",
    operatorTime: "Operator Active Time",
    lot: "Lot",
    description: "Description",
    zone: "Zone",
    stock: "Stock",
    eta: "ETA",
    supervisedBy: "supervises this family",
  },
};

export default function InventarioPage() {
  const {
    inventoryItems,
    inventoryView,
    lang,
    metrics,
    onSelectFilter,
    onSetInventoryView,
    operators,
    quickFilters,
    searchValue,
    selectedFilter,
    theme,
  } = useAppContext();
  const copy = COPY[lang];
  const isDark = theme === "dark";

  const visibleItems = inventoryItems.filter((item) => {
    const matchesSearch = [item.id, item.family, item.zone].join(" ").toLowerCase().includes(searchValue.toLowerCase());
    const matchesFilter =
      selectedFilter === "Todos" ||
      item.family.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      item.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-full flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.3em] text-[#64748b] dark:text-[#8ea0b7]">{copy.subtitle}</p>
          <h1 className="font-['Space_Grotesk'] text-[30px] font-bold leading-[1.2] text-[#1a1a1a] dark:text-white">{copy.title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              inventoryView === "list"
                ? "border-[#dee2e6] bg-[#e9ecef] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-white dark:text-black"
                : "border-[#dee2e6] bg-white text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-white"
            }`}
            onClick={() => onSetInventoryView("list")}
            type="button"
          >
            <LayoutList size={16} />
            {copy.list}
          </button>
          <button
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              inventoryView === "cards"
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-[#dee2e6] bg-white text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-white"
            }`}
            onClick={() => onSetInventoryView("cards")}
            type="button"
          >
            <Grid2x2 size={16} />
            {copy.cards}
          </button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#dee2e6] bg-[#e9ecef] p-4 dark:border-[#2c3440] dark:bg-[#191f27]">
          <div className="flex items-center justify-between">
            <Sparkles size={18} className="text-[#1a1a1a] dark:text-white" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b] dark:text-[#8ea0b7]">Live</span>
          </div>
          <p className="mt-3 text-xs text-[#6c757d] dark:text-[#8ea0b7]">{copy.identifiedItems}</p>
          <p className="mt-2 font-['Space_Grotesk'] text-[20px] font-bold text-[#1a1a1a] dark:text-white">{metrics.partsCount.toString().padStart(2, "0")}</p>
        </article>
        <article className="rounded-2xl border border-[#dee2e6] bg-[#e9ecef] p-4 dark:border-[#2c3440] dark:bg-[#191f27]">
          <div className="flex items-center justify-between">
            <ScanLine size={18} className="text-[#1a1a1a] dark:text-white" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b] dark:text-[#8ea0b7]">AI</span>
          </div>
          <p className="mt-3 text-xs text-[#6c757d] dark:text-[#8ea0b7]">{copy.answered}</p>
          <p className="mt-2 font-['Space_Grotesk'] text-[20px] font-bold text-[#1a1a1a] dark:text-white">{metrics.stockCount}</p>
        </article>
        <article className="rounded-2xl border border-[#dee2e6] bg-[#e9ecef] p-4 dark:border-[#2c3440] dark:bg-[#191f27]">
          <div className="flex items-center justify-between">
            <Grid2x2 size={18} className="text-[#1a1a1a] dark:text-white" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#64748b] dark:text-[#8ea0b7]">OPS</span>
          </div>
          <p className="mt-3 text-xs text-[#6c757d] dark:text-[#8ea0b7]">{copy.operatorTime}</p>
          <p className="mt-2 font-['Space_Grotesk'] text-[20px] font-bold text-[#1a1a1a] dark:text-white">{operators.length}</p>
        </article>
      </section>

      {inventoryView === "cards" ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleItems.map((item) => (
            <article className="rounded-2xl border border-[#dee2e6] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-['Space_Grotesk'] text-lg font-bold text-[#1a1a1a] dark:text-white">{item.id}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#64748b] dark:text-[#8ea0b7]">{item.status}</p>
                </div>
                <span className={`rounded-full px-3 py-2 text-xs font-bold ${isDark ? "bg-white text-black" : "bg-black text-white"}`}>{item.stock}</span>
              </div>
              <p className="mt-5 text-base font-semibold text-[#1a1a1a] dark:text-white">{item.family}</p>
              <p className="mt-2 text-sm text-[#64748b] dark:text-[#aab6c6]">{operators[0]?.name} {copy.supervisedBy}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#f8f9fa] p-4 dark:bg-[#191f27]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.zone}</p>
                  <p className="mt-2 font-semibold text-[#1a1a1a] dark:text-white">{item.zone}</p>
                </div>
                <div className="rounded-2xl bg-[#f8f9fa] p-4 dark:bg-[#191f27]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.eta}</p>
                  <p className="mt-2 font-semibold text-[#1a1a1a] dark:text-white">{item.eta}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-[#dee2e6] bg-white dark:border-[#2c3440] dark:bg-[#13171d]">
          <div className="grid grid-cols-[1.2fr_1.7fr_0.7fr_0.6fr_0.8fr] gap-3 border-b border-[#dee2e6] px-5 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#64748b] dark:border-[#2c3440] dark:text-[#8ea0b7]">
            <span>{copy.lot}</span>
            <span>{copy.description}</span>
            <span>{copy.zone}</span>
            <span>{copy.stock}</span>
            <span>{copy.eta}</span>
          </div>
          <div className="divide-y divide-[#dee2e6] dark:divide-[#2c3440]">
            {visibleItems.map((item) => (
              <article className="grid grid-cols-[1.2fr_1.7fr_0.7fr_0.6fr_0.8fr] gap-3 px-5 py-4" key={item.id}>
                <div>
                  <p className="font-['Space_Grotesk'] text-sm font-bold text-[#1a1a1a] dark:text-white">{item.id}</p>
                  <p className="mt-1 text-xs text-[#6c757d] dark:text-[#8ea0b7]">{item.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a1a1a] dark:text-white">{item.family}</p>
                  <p className="mt-1 text-xs text-[#64748b] dark:text-[#aab6c6]">{operators[0]?.name} {copy.supervisedBy}</p>
                </div>
                <p className="text-sm text-[#495057] dark:text-[#dbe4ef]">{item.zone}</p>
                <p className="font-['Space_Grotesk'] text-sm font-bold text-[#1a1a1a] dark:text-white">{item.stock}</p>
                <p className="text-sm text-[#495057] dark:text-[#dbe4ef]">{item.eta}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
