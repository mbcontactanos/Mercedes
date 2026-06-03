import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import InstallationPrompt from "../components/pwa/InstallationPrompt.jsx";
import { useAppContext } from "../context/useAppContext.js";

/**
 * AppShell — Contenedor persistente de la aplicación
 *
 * Este componente envuelve todas las páginas autenticadas con el layout común
 * (sidebar, barra superior, centro de notificaciones y prompt de instalación PWA).
 * También aplica enrutado según rol:
 *
 *   • Usuarios admin → pueden acceder a inventario, logs, cámara y ajustes.
 *   • Usuarios no admin (operario, bachiller, FP) → se redirigen siempre a /camera.
 *
 * Si la página actual es "camera" en móvil o para usuarios no admin, se omite
 * AppLayout y se renderiza únicamente el Outlet (vista completa de cámara).
 *
 * ROUTE_MAP: Mapea pathname URL → clave interna de página usada por AppLayout.
 * ROUTE_BY_PAGE: Mapea clave interna de página → pathname para navegación.
 *
 * Nota: las rutas aquí deben coincidir con las rutas declaradas en main.jsx.
 */

// Mapea pathname URL a clave de página para resaltar la pestaña activa.
const ROUTE_MAP = {
  "/inventory": "inventory",
  "/pieces": "pieces",
  "/logs": "logs",
  "/camera": "camera",
  "/settings": "settings",
};

// Mapea clave de página a pathname para navegación programática desde el sidebar.
const ROUTE_BY_PAGE = {
  inventory: "/inventory",
  pieces: "/pieces",
  logs: "/logs",
  camera: "/camera",
  settings: "/settings",
};

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activityFilter,
    activityItems,
    handleApproveRequest,
    handleDenyRequest,
    handleInstall,
    installPromptVisible,
    installReady,
    installSupport,
    isMobileDevice,
    lang,
    metrics,
    notificationItems,
    notificationsOpen,
    onCloseNotifications,
    onMarkNotificationsRead,
    onOpenNotifications,
    onSearchChange,
    profile,
    roleConfig,
    roleLabel,
    roleKey,
    searchValue,
    setActivityFilter,
    signOut,
    theme,
    toggleLang,
    toggleTheme,
    updateToasterOffset,
    user,
    pendingRequests,
  } = useAppContext();

  const currentPage = ROUTE_MAP[location.pathname] ?? "inventory";

  // Redirección por rol: los usuarios no admin solo pueden usar la interfaz de cámara.
  if (roleKey !== "admin" && currentPage !== "camera") {
    return <Navigate replace to="/camera" />;
  }

  if (currentPage === "camera" && (isMobileDevice || roleKey !== "admin")) {
    return <Outlet />;
  }

  return (
    <AppLayout
      activityFilter={activityFilter}
      activityItems={activityItems}
      currentPage={currentPage}
      installReady={installReady}
      lang={lang}
      notifications={notificationItems}
      notificationsOpen={notificationsOpen}
      pendingRequests={pendingRequests}
      onApproveRequest={handleApproveRequest}
      onCloseNotifications={onCloseNotifications}
      onDenyRequest={handleDenyRequest}
      onFilterActivity={setActivityFilter}
      onInstall={handleInstall}
      onMarkNotificationsRead={onMarkNotificationsRead}
      onNavigate={(page) => navigate(ROUTE_BY_PAGE[page] ?? "/inventory")}
      onOpenNotifications={onOpenNotifications}
      onSearchChange={onSearchChange}
      onSendCommand={() => {}}
      onSignOut={async () => {
        await signOut();
        navigate("/login", { replace: true });
      }}
      onToggleLang={toggleLang}
      onToggleTheme={toggleTheme}
      searchValue={searchValue}
      syncLabel={metrics.syncLabel}
      theme={theme}
      userEmail={user?.email}
      userName={profile?.display_name ?? user?.profile?.name ?? user?.email?.split("@")[0] ?? "Operario"}
      userRole={roleLabel}
      onUpdateToasterOffset={updateToasterOffset}
    >
      <InstallationPrompt installSupport={installSupport} onInstall={handleInstall} visible={installPromptVisible} />
      <Outlet />
    </AppLayout>
  );
}
