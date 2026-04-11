import { useState } from 'react';

import type { ActiveView } from '../../App.js';
import { SettingsModal } from '../SettingsModal.js';

import { ChatIcon, DashboardIcon, OfficeIcon, SettingsIcon } from './NavIcons.js';

interface MobileTabBarProps {
  activeView: ActiveView;
  onSetActiveView: (view: ActiveView) => void;
  onOpenChat: () => void;  // navigates to chat view
  unreadCount: number;
  onLogout: () => void;
  // Settings
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  onClearHistory: () => void;
}

interface TabDef {
  key: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  action: () => void;
  isActive: boolean;
}

const TAB_BAR_HEIGHT = 56;

export function MobileTabBar({
  activeView,
  onSetActiveView,
  onOpenChat,
  unreadCount,
  onLogout,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  onClearHistory,
}: MobileTabBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs: TabDef[] = [
    {
      key: 'office',
      icon: <OfficeIcon size={22} />,
      label: 'Office',
      action: () => onSetActiveView('office'),
      isActive: activeView === 'office',
    },
    {
      key: 'dashboard',
      icon: <DashboardIcon size={22} />,
      label: 'Dashboard',
      action: () => onSetActiveView('dashboard'),
      isActive: activeView === 'dashboard',
    },
    {
      key: 'chat',
      icon: <ChatIcon size={22} />,
      label: 'Chat',
      badge: unreadCount,
      action: onOpenChat,
      isActive: activeView === 'chat',
    },
    {
      key: 'settings',
      icon: <SettingsIcon size={22} />,
      label: 'Settings',
      action: () => setIsSettingsOpen(true),
      isActive: false,
    },
  ];

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    zIndex: 55,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    background: 'rgba(30, 30, 46, 0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '2px solid var(--pixel-border)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  };

  return (
    <>
      <nav style={barStyle}>
        {tabs.map((tab) => {
          const color = tab.isActive ? 'var(--pixel-accent)' : activeTab === tab.key ? 'var(--pixel-text)' : 'var(--pixel-text-dim)';
          return (
            <button
              key={tab.key}
              onClick={tab.action}
              onTouchStart={() => setActiveTab(tab.key)}
              onTouchEnd={() => setActiveTab(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color,
                position: 'relative',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                {tab.icon}
                {tab.badge != null && tab.badge > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      background: '#f87171',
                      color: '#fff',
                      fontSize: 9,
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      minWidth: 14,
                      height: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 2px',
                      lineHeight: 1,
                    }}
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'system-ui, sans-serif' }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={isDebugMode}
        onToggleDebugMode={onToggleDebugMode}
        alwaysShowOverlay={alwaysShowOverlay}
        onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
        onOpenChat={onOpenChat}
        onClearHistory={onClearHistory}
        onLogout={onLogout}
      />
    </>
  );
}

export { TAB_BAR_HEIGHT };
