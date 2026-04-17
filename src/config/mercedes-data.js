import { PART_REFERENCE_CATALOG } from "./parts-catalog.js";

const INVENTORY_SEED = {
  "PIEZA-001": {
    status: "Disponible",
    stock: 18,
    trend: "+4%",
    eta: "Disponible en almacen",
  },
  "PIEZA-002": {
    status: "Disponible",
    stock: 42,
    trend: "+2%",
    eta: "Reposicion 2026-04-18 08:00",
  },
  "PIEZA-003": {
    status: "Stock bajo",
    stock: 9,
    trend: "-1%",
    eta: "Reposicion 2026-04-17 12:30",
  },
  "PIEZA-004": {
    status: "Disponible",
    stock: 16,
    trend: "0%",
    eta: "Disponible en almacen",
  },
  "PIEZA-005": {
    status: "Disponible",
    stock: 27,
    trend: "+3%",
    eta: "Disponible en almacen",
  },
  "PIEZA-006": {
    status: "Revision de calidad",
    stock: 5,
    trend: "-2%",
    eta: "Reposicion 2026-04-19 09:00",
  },
};

export const QUICK_FILTERS = [
  "Fijacion",
  "Herramienta",
  "Conector",
  "Soporte",
];

export const INVENTORY_ITEMS = PART_REFERENCE_CATALOG.map((part, index) => ({
  id: part.id,
  status: INVENTORY_SEED[part.id]?.status ?? "Pendiente de recuento",
  family: part.name,
  zone: `RAG-${String(index + 1).padStart(2, "0")}`,
  stock: INVENTORY_SEED[part.id]?.stock ?? 0,
  trend: INVENTORY_SEED[part.id]?.trend ?? "0%",
  eta: INVENTORY_SEED[part.id]?.eta ?? "Conteo inicial pendiente",
}));

export const ANALYSIS_SERIES = [
  { label: "Logs", value: 0 },
  { label: "Solicitudes", value: 0 },
  { label: "Operarios", value: 0 },
  { label: "Piezas", value: 0 },
  { label: "Inventario", value: 0 },
  { label: "Alertas", value: 0 },
];

export const SYSTEM_LOGS = [
  {
    id: "LOG-1",
    level: "INFO",
    title: "Panel de analitica listo",
    detail: "La vista ya puede leer logs, solicitudes y inventario desde el estado real de la app.",
    timestamp: "Ahora",
  },
  {
    level: "INFO",
    id: "LOG-2",
    title: "Registros preparados para sincronizacion",
    detail: "Si la base todavia no responde, la interfaz muestra cero honesto en vez de mock inventado.",
    timestamp: "Ahora",
  },
  {
    level: "INFO",
    id: "LOG-3",
    title: "Solicitudes de voz habilitadas",
    detail: "Las peticiones de admin y operario se reflejan en el timeline y en el panel de aprobacion.",
    timestamp: "Ahora",
  },
];

export const OPERATORS = [
  { name: "Laura Gomez", shift: "Operario", status: "Disponible" },
  { name: "Alumno Bachiller", shift: "Bachiller", status: "Supervisado" },
  { name: "Alumno FP", shift: "Formacion Profesional", status: "Disponible" },
];
