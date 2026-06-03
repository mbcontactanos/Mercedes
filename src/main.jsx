import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sileo";
import { AppProvider } from "./context/AppContext.jsx";
import { useAppContext } from "./context/useAppContext.js";
import { hasSessionHint } from "./store/sessionStore.js";

// ─── Importación de páginas ──────────────────────────────────────────────────
// Las carpetas usan nombres en inglés y deben coincidir exactamente con las rutas reales.
import PaginaAcceso from "./pages/auth/page.jsx";         // Pantalla de acceso/autenticación
import AjustesPage from "./pages/settings/page.jsx";      // Gestión administrativa de usuarios/roles
import PaginaCamara from "./pages/camera/page.jsx";       // Consola de cámara para operarios
import PaginaInicio from "./pages/home/page.jsx";         // Inicio del panel (solo admin)
import InventarioPage from "./pages/inventory/page.jsx";  // Gestión de inventario de piezas
import RegistrosPage from "./pages/logs/page.jsx";        // Visor de registros del sistema
import PiecesPage from "./pages/pieces/page.jsx";         // Biblioteca visual de piezas

// ─── Shell y guardas de ruta ────────────────────────────────────────────────
// AppShell: layout persistente (sidebar, topbar, notificaciones)
// ProtectedRoute: guarda de autenticación que redirige a /login
import AppShell from "./routes/AppShell.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

// ─── Estilos globales ────────────────────────────────────────────────────────
import "./index.css";

/**
 * registerDynamicManifest
 *
 * Genera dinámicamente el manifest PWA en tiempo de ejecución y lo inyecta
 * como <link rel="manifest"> en el <head>. Al usar Blob URL evitamos depender
 * de un archivo estático y podemos incluir iconos SVG inline.
 *
 * start_url apunta a /camera?pwa=1 para abrir directamente la consola móvil.
 */
function registerDynamicManifest() {
  const currentUrl = new URL(window.location.href);
  const buildAbsoluteUrl = (path) => new URL(path, currentUrl.origin).toString();
  const manifest = {
    name: "Mercedes Vitoria OPS",
    short_name: "Mercedes OPS",
    description: "PWA operativa para inventario, analisis, registros y camara industrial.",
    start_url: buildAbsoluteUrl("/camera?pwa=1"),
    scope: buildAbsoluteUrl("/"),
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050816",
    theme_color: "#050816",
    icons: [
      {
        src: buildAbsoluteUrl("/icons/icon-192.svg"),
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: buildAbsoluteUrl("/icons/icon-512.svg"),
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  // Convierte el objeto manifest a Blob URL para usarlo como href.
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  // Inserta o reemplaza el enlace <link rel="manifest"> existente.
  let manifestLink = document.querySelector("link[rel='manifest']");

  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    document.head.appendChild(manifestLink);
  }

  manifestLink.href = manifestUrl;
}

/**
 * AplicacionRaiz (componente raíz)
 *
 * Renderiza el router principal e inyecta el sistema de toasts de Sileo.
 * La posición y el tema del toaster se controlan desde AppContext.
 *
 * Estructura de rutas:
 *  /login                → acceso público
 *  / (ProtectedRoute)
 *    / (AppShell)
 *      /                 → inicio
 *      /inventory        → inventario
 *      /logs             → registros
 *      /camera           → cámara
 *      /settings         → ajustes (solo admin)
 *  *                     → redirección a /
 *
 * Nota: AppShell aplica control de acceso por rol.
 */
function AppFrame() {
  // Obtiene tema y desplazamiento del toaster desde estado global.
  const { theme, toasterOffset } = useAppContext();

  // Invierte el tema del toaster para mantener contraste visual.
  const toasterTheme = theme === "light" ? "dark" : "light";

  return (
    <>
      {/* Toaster global de notificaciones, gestionado por AppContext */}
      <Toaster offset={toasterOffset} position="top-right" theme={toasterTheme} />

      <BrowserRouter>
        <Routes>
          {/* Ruta pública de login */}
          <Route path="/login" element={<PaginaAcceso />} />

          {/* Rutas protegidas: ProtectedRoute redirige a /login sin sesión */}
          <Route element={<ProtectedRoute />}>
            {/* AppShell aporta layout persistente con sidebar y barra superior */}
            <Route element={<AppShell />}>
              {/* Inicio del panel admin */}
              <Route index element={<PaginaInicio />} />

              {/* Gestión de inventario de piezas */}
              <Route path="/inventory" element={<InventarioPage />} />

              {/* Biblioteca visual de piezas con control por rol */}
              <Route path="/pieces" element={<PiecesPage />} />

              {/* Visor de eventos y registros del sistema */}
              <Route path="/logs" element={<RegistrosPage />} />

              {/* Consola de cámara para operarios (objetivo de start_url PWA) */}
              <Route path="/camera" element={<PaginaCamara />} />

              {/* Ajustes de usuarios y permisos (solo admin) */}
              <Route path="/settings" element={<AjustesPage />} />
            </Route>
          </Route>

          {/* Captura 404: redirige rutas desconocidas al inicio */}
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function AplicacionRaiz() {
  return (
    <AppProvider>
      <AppFrame />
    </AppProvider>
  );
}

// ─── Montaje raíz de React ───────────────────────────────────────────────────
// Renderiza la aplicación completa en #root y envuelve todo con AppProvider.
const rootElement = document.getElementById("root");
const root = window.__mercedesOpsRoot ?? ReactDOM.createRoot(rootElement);
window.__mercedesOpsRoot = root;

root.render(
  <React.StrictMode>
    <AplicacionRaiz />
  </React.StrictMode>,
);

// ─── Registro de Service Worker ──────────────────────────────────────────────
// Registra SW en producción o cuando se activa modo PWA.
// En desarrollo local puro, desregistra SW para evitar cachés obsoletas.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    // Inyecta el manifest PWA dinámico tras cargar la página.
    registerDynamicManifest();

    const currentUrl = new URL(window.location.href);

    // Detecta si se está ejecutando en un host local de previsualización.
    const isLocalPreviewHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(currentUrl.hostname);

    // Registra SW cuando:
    // (a) build de producción, (b) ?pwa=1, o (c) host no local (ngrok/Vercel).
    const shouldRegisterInDev =
      currentUrl.searchParams.get("pwa") === "1" ||
      !isLocalPreviewHost;

    if (import.meta.env.PROD || shouldRegisterInDev) {
      // Añade query de ngrok para evitar la pantalla intermedia al pedir sw.js.
      navigator.serviceWorker.register("/sw.js?ngrok-skip-browser-warning=true");

      // ─── Auto-recarga de login atascado ─────────────────────────────────────
      // Detrás de reverse proxy la cookie de sesión puede expirar en silencio.
      // Si el usuario se queda atascado en /login, se fuerza recarga para recuperar.
      if (!isLocalPreviewHost) {
        let loginStuckTimer = null;

        // Si el usuario permanece en /login más de 12 s con cookie activa,
        // se intenta una recarga automática para recuperar sesión.
        const checkLoginStuck = () => {
          const hasSessionCookie = hasSessionHint();
          
          // Solo aplica si parece haber sesión pero la UI sigue en login.
          if (window.location.pathname === "/login" && hasSessionCookie) {
            loginStuckTimer = setTimeout(() => {
              // Recarga solo si se mantiene en /login y la cookie sigue presente.
              if (window.location.pathname === "/login" && hasSessionHint()) {
                window.location.reload();
              }
            }, 12000);
          }
        };

        // Inicia la comprobación al cargar.
        checkLoginStuck();

        // Limpia el temporizador al navegar fuera de /login.
        window.addEventListener("popstate", () => {
          clearTimeout(loginStuckTimer);
          checkLoginStuck();
        });
      }

      return;
    }

    // En desarrollo local puro: desregistra service workers existentes para
    // asegurar que siempre se sirva contenido fresco desde Vite.
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
}
