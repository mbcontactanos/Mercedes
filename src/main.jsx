import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sileo";
import { AppProvider } from "./context/AppContext.jsx";
import { useAppContext } from "./context/useAppContext.js";

// ─── Page Imports ───────────────────────────────────────────────────────────
// IMPORTANT: Page directories use English names. Previously these imported
// from non-existent Spanish paths (acceso, ajustes, analisis, camara,
// inventario, registros) which caused Vite MODULE_NOT_FOUND errors at runtime.
// The correct English directory names are used below.
import PaginaAcceso from "./pages/auth/page.jsx";         // Login / auth gate
import AjustesPage from "./pages/settings/page.jsx";      // Admin user & role management
import AnalisisPage from "./pages/analysis/page.jsx";     // TF.js detection analytics
import PaginaCamara from "./pages/camera/page.jsx";       // Mobile operator camera console
import PaginaInicio from "./pages/home/page.jsx";         // Dashboard home (admin only)
import InventarioPage from "./pages/inventory/page.jsx";  // Parts inventory tracker
import RegistrosPage from "./pages/logs/page.jsx";        // System event logs

// ─── Shell & Route Guards ────────────────────────────────────────────────────
// AppShell: Persistent layout wrapper (sidebar navigation, top bar, toaster)
// ProtectedRoute: Auth guard that redirects unauthenticated users to /login
import AppShell from "./routes/AppShell.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

// ─── Global CSS ─────────────────────────────────────────────────────────────
import "./index.css";

/**
 * registerDynamicManifest
 *
 * Generates a PWA Web App Manifest dynamically at runtime and injects it as a
 * <link rel="manifest"> in the document <head>. Using a programmatic manifest
 * (Blob URL) avoids the need for a static manifest.webmanifest file and lets
 * us embed SVG icons inline without additional server round-trips.
 *
 * The start_url points to /camera?pwa=1 so that when the PWA is opened from
 * the device home screen, the mobile operator camera console loads immediately.
 */
function registerDynamicManifest() {
  const manifest = {
    name: "Mercedes Vitoria OPS",
    short_name: "Mercedes OPS",
    description: "PWA operativa para inventario, analisis, registros y camara industrial.",
    start_url: "/camera?pwa=1",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#050816",
    theme_color: "#050816",
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='48' fill='%23050816'/%3E%3Ccircle cx='96' cy='96' r='52' fill='none' stroke='white' stroke-width='6'/%3E%3Cpath d='M96 47l10 43-10 6-10-6 10-43zm42 72-37-5-5-11 6-10 36 26zm-80 0 36-26 6 10-5 11-37 5z' fill='white'/%3E%3C/svg%3E",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='120' fill='%23050816'/%3E%3Ccircle cx='256' cy='256' r='138' fill='none' stroke='white' stroke-width='18'/%3E%3Cpath d='M256 128l26 115-26 17-26-17 26-115zm112 192-96-69 17-26 28 6 51 89zm-224 0 51-89 28-6 17 26-96 69z' fill='white'/%3E%3C/svg%3E",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  // Convert manifest object to a Blob URL so it can be used as a link href
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  // Inject or replace the existing <link rel="manifest"> element
  let manifestLink = document.querySelector("link[rel='manifest']");

  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    document.head.appendChild(manifestLink);
  }

  manifestLink.href = manifestUrl;
}

/**
 * AplicacionRaiz (Root Application Component)
 *
 * Renders the top-level router and injects the Sileo Toaster notification
 * system. The Toaster position and theme are managed by AppContext so that
 * notifications correctly appear above/below the mobile bottom bar.
 *
 * Route structure:
 *  /login                → AuthPage (public, no auth required)
 *  / (ProtectedRoute)
 *    / (AppShell)
 *      /                 → PaginaInicio  – Admin dashboard home
 *      /inventory        → InventarioPage – Parts & stock tracker
 *      /analysis         → AnalisisPage  – TF.js camera analysis view
 *      /logs             → RegistrosPage – System log viewer
 *      /camera           → PaginaCamara  – Mobile camera console
 *      /settings         → AjustesPage   – User / role management (admin only)
 *  *                     → Navigate to /  – 404 catch-all
 *
 * NOTE: AppShell enforces role-based access internally. Non-admin users are
 * automatically redirected from all pages to /camera.
 */
function AplicacionRaiz() {
  // Retrieve theme and toaster positioning offset from global app state
  const { theme, toasterOffset } = useAppContext();

  // Invert toaster theme so it contrasts with the current app color scheme
  // (light app → dark toasts, dark app → light toasts)
  const toasterTheme = theme === "light" ? "dark" : "light";

  return (
    <>
      {/* Global notification toaster — managed by sileo, offset by AppContext */}
      <Toaster offset={toasterOffset} position="top-right" theme={toasterTheme} />

      <BrowserRouter>
        <Routes>
          {/* Public login route — accessible without authentication */}
          <Route path="/login" element={<PaginaAcceso />} />

          {/* Protected routes — ProtectedRoute redirects to /login if not authenticated */}
          <Route element={<ProtectedRoute />}>
            {/* AppShell provides the persistent sidebar + top bar layout */}
            <Route element={<AppShell />}>
              {/* Admin dashboard home page */}
              <Route index element={<PaginaInicio />} />

              {/* Parts inventory management */}
              <Route path="/inventory" element={<InventarioPage />} />

              {/* TF.js-powered camera analysis view */}
              <Route path="/analysis" element={<AnalisisPage />} />

              {/* System event log viewer */}
              <Route path="/logs" element={<RegistrosPage />} />

              {/* Mobile operator camera console (also the PWA start_url target) */}
              <Route path="/camera" element={<PaginaCamara />} />

              {/* Admin-only user and role management settings */}
              <Route path="/settings" element={<AjustesPage />} />
            </Route>
          </Route>

          {/* 404 catch-all: redirect any unknown path to the home dashboard */}
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

// ─── React Root Mount ────────────────────────────────────────────────────────
// Render the full app into the #root element (defined in index.html).
// AppProvider wraps the entire tree with the shared application state context.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider>
      <AplicacionRaiz />
    </AppProvider>
  </React.StrictMode>,
);

// ─── Service Worker Registration ─────────────────────────────────────────────
// Register the service worker only in production or when the PWA install flag
// is active. In pure local dev mode (localhost without ?pwa=1) the SW is
// unregistered to prevent stale cache issues during development.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    // Inject the dynamic PWA manifest after the page loads
    registerDynamicManifest();

    const currentUrl = new URL(window.location.href);

    // Determine if we are running on a local preview host (localhost / 127.x / 0.x)
    const isLocalPreviewHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(currentUrl.hostname);

    // Register SW when: (a) in production build, OR (b) explicitly requested
    // via ?pwa=1 query param, OR (c) running on a non-local host (e.g. ngrok,
    // drive.servidor.dpdns.org, Vercel preview URL).
    const shouldRegisterInDev =
      currentUrl.searchParams.get("pwa") === "1" ||
      !isLocalPreviewHost;

    if (import.meta.env.PROD || shouldRegisterInDev) {
      // Pass ngrok-skip-browser-warning header via query param to avoid
      // ngrok's browser warning page intercepting the SW fetch.
      navigator.serviceWorker.register("/sw.js?ngrok-skip-browser-warning=true");

      // ─── Login Auto-Refresh for Stuck Auth (drive.servidor.dpdns.org) ──────
      // When the app is served behind a reverse proxy (e.g. drive.servidor.dpdns.org)
      // the InsForge session cookie can expire silently, leaving the user stuck
      // on the login page indefinitely even after a successful sign-in attempt.
      // This detects the stuck state and forces a full page reload to recover.
      if (!isLocalPreviewHost) {
        let loginStuckTimer = null;

        // Monitor for navigation events — if the user stays on /login for
        // more than 12 seconds after the page has fully loaded, AND they have
        // an active InsForge session token, force an auto-refresh to recover.
        const checkLoginStuck = () => {
          const hasSessionCookie = document.cookie.includes("insforge_csrf_token=");
          
          // Only apply the refresh logic if the user appears to have a session 
          // but is stuck on the login page.
          if (window.location.pathname === "/login" && hasSessionCookie) {
            loginStuckTimer = setTimeout(() => {
              // Only refresh if still on /login AND still have the cookie
              if (window.location.pathname === "/login" && document.cookie.includes("insforge_csrf_token=")) {
                window.location.reload();
              }
            }, 12000);
          }
        };

        // Start the check on page load
        checkLoginStuck();

        // Clear the timer on any navigation away from /login
        window.addEventListener("popstate", () => {
          clearTimeout(loginStuckTimer);
          checkLoginStuck();
        });
      }

      return;
    }

    // In pure local dev mode: unregister any existing service workers to
    // ensure fresh content is always served from the Vite dev server.
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
}
