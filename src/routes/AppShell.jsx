import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import InstallationPrompt from "../components/pwa/InstallationPrompt.jsx";
import { useAppContext } from "../context/useAppContext.js";

/**
 * AppShell — Persistent Layout Shell
 *
 * This component wraps all authenticated pages with the shared application
 * layout (sidebar navigation, top bar, notification drawer, PWA install prompt).
 * It also enforces role-based routing:
 *
 *   • Admin users → can access all pages (inventory, analysis, logs, camera, settings)
 *   • Non-admin users (operarios, bachilleres, FP) → always redirected to /camera
 *     The mobile camera console is the only view exposed to non-admin roles.
 *
 * The "camera" page on mobile or for non-admin roles skips the AppLayout
 * entirely and renders the Outlet directly (full-screen mobile camera view).
 *
 * ROUTE_MAP: Maps URL pathnames → internal page key strings used by AppLayout
 *   for highlighting the active sidebar item and for conditional rendering.
 *
 * ROUTE_BY_PAGE: Reverse map — page key → URL — used by the onNavigate callback
 *   passed to AppLayout so the sidebar can trigger React Router navigation.
 *
 * NOTE: All paths here must exactly match the <Route path="..."> definitions
 *   in main.jsx. Currently both use English keys (/camera, /settings, etc.).
 */

// Maps URL pathname → logical page key used by AppLayout for active tab tracking
const ROUTE_MAP = {
  "/inventory": "inventory",
  "/analysis": "analysis",
  "/logs": "logs",
  "/camera": "camera",
  "/settings": "settings",
};

// Maps logical page key → URL pathname for programmatic navigation from the sidebar
const ROUTE_BY_PAGE = {
  inventory: "/inventory",
  analysis: "/analysis",
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
    setActivityItems,
    signOut,
    theme,
    toggleLang,
    toggleTheme,
    updateToasterOffset,
    user,
    pendingRequests,
  } = useAppContext();

  const currentPage = ROUTE_MAP[location.pathname] ?? "inventory";

  // Redirect logic: Non-admin users can only access the camera interface
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
      onClearHistory={() => setActivityItems([])}
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
