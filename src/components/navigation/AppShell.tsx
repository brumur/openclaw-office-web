import type { ActiveView } from '../../App.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

import { LayoutIcon } from './NavIcons.js';
import { MobileTabBar, TAB_BAR_HEIGHT } from './MobileTabBar.js';
import { COLLAPSED_WIDTH, EXPANDED_WIDTH, Sidebar } from './Sidebar.js';

interface AppShellProps {
  activeView: ActiveView;
  onSetActiveView: (view: ActiveView) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onOpenChat: () => void;
  unreadCount: number;
  onLogout: () => void;
  // Settings
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  onClearHistory: () => void;
}

/** Returns layout metrics for content positioning */
export function useNavLayout(isMobile: boolean, sidebarCollapsed: boolean, activeView: ActiveView) {
  if (isMobile) {
    return {
      sidebarWidth: 0,
      bottomOffset: TAB_BAR_HEIGHT,
      physicalSidebarWidth: 0,
    };
  }
  const physicalSidebarWidth = sidebarCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const sidebarWidth = activeView === 'office'
    ? 0 // Office view: sidebar overlays, content uses full width
    : physicalSidebarWidth;
  return {
    sidebarWidth,
    bottomOffset: 0,
    physicalSidebarWidth,
  };
}

export function AppShell({
  activeView,
  onSetActiveView,
  sidebarCollapsed,
  onToggleSidebar,
  isEditMode,
  onToggleEditMode,
  onOpenChat,
  unreadCount,
  onLogout,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  onClearHistory,
}: AppShellProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <MobileTabBar
          activeView={activeView}
          onSetActiveView={onSetActiveView}
          onOpenChat={onOpenChat}
          unreadCount={unreadCount}
          onLogout={onLogout}
          isDebugMode={isDebugMode}
          onToggleDebugMode={onToggleDebugMode}
          alwaysShowOverlay={alwaysShowOverlay}
          onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
          onClearHistory={onClearHistory}
        />
        {/* Mobile Layout FAB — only in office view */}
        {activeView === 'office' && (
          <button
            onClick={onToggleEditMode}
            style={{
              position: 'fixed',
              bottom: TAB_BAR_HEIGHT + 16,
              right: 16,
              zIndex: 58,
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isEditMode ? 'var(--pixel-accent)' : 'rgba(30, 30, 46, 0.9)',
              border: `2px solid ${isEditMode ? 'var(--pixel-accent)' : 'var(--pixel-border)'}`,
              borderRadius: 0,
              cursor: 'pointer',
              boxShadow: 'var(--pixel-shadow)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#fff',
            }}
            title="Layout Editor"
          >
            <LayoutIcon size={22} color="#fff" />
          </button>
        )}
      </>
    );
  }

  return (
    <Sidebar
      activeView={activeView}
      onSetActiveView={onSetActiveView}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={onToggleSidebar}
      isOfficeView={activeView === 'office'}
      isEditMode={isEditMode}
      onToggleEditMode={onToggleEditMode}
      onOpenChat={onOpenChat}
      unreadCount={unreadCount}
      onLogout={onLogout}
      isDebugMode={isDebugMode}
      onToggleDebugMode={onToggleDebugMode}
      alwaysShowOverlay={alwaysShowOverlay}
      onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
      onClearHistory={onClearHistory}
    />
  );
}
