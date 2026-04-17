import MobileNavigation from "./MobileNavigation.jsx";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function AppLayout({
  activityFilter,
  activityItems,
  children,
  currentPage,
  installReady,
  lang,
  notifications,
  notificationsOpen,
  pendingRequests,
  onApproveRequest,
  onClearHistory,
  onFilterActivity,
  onInstall,
  onNavigate,
  onOpenNotifications,
  onCloseNotifications,
  onDenyRequest,
  onMarkNotificationsRead,
  onSearchChange,
  onSendCommand,
  onSignOut,
  onToggleLang,
  onToggleTheme,
  searchValue,
  syncLabel,
  theme,
  userEmail,
  userName,
  userRole,
  onUpdateToasterOffset,
}) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#1a1a1a] dark:bg-[#0b0f14] dark:text-white">
      <div className="flex min-h-screen w-full bg-white dark:bg-[#0f141a]">
        <Sidebar
          currentPage={currentPage}
          lang={lang}
          onNavigate={onNavigate}
          onSignOut={onSignOut}
          theme={theme}
          userEmail={userEmail}
          userName={userName}
          userRole={userRole}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            currentPage={currentPage}
            installReady={installReady}
            lang={lang}
            notifications={notifications}
            notificationsOpen={notificationsOpen}
            onInstall={onInstall}
            onApproveRequest={onApproveRequest}
            onCloseNotifications={onCloseNotifications}
            onDenyRequest={onDenyRequest}
            onMarkNotificationsRead={onMarkNotificationsRead}
            onOpenNotifications={onOpenNotifications}
            onSearchChange={onSearchChange}
            onToggleLang={onToggleLang}
            onToggleTheme={onToggleTheme}
            onUpdateToasterOffset={onUpdateToasterOffset}
            pendingRequests={pendingRequests}
            searchValue={searchValue}
            syncLabel={syncLabel}
            theme={theme}
          />
          <main className="min-w-0 flex-1 bg-white dark:bg-[#0f141a]">{children}</main>
        </div>

      </div>

      <MobileNavigation currentPage={currentPage} lang={lang} onNavigate={onNavigate} theme={theme} />
    </div>
  );
}
