import { useState } from 'react';

import type { ActiveView } from '../../App.js';
import { SettingsModal } from '../SettingsModal.js';

import { ChatIcon, CollapseIcon, DashboardIcon, ExpandIcon, LayoutIcon, LogoutIcon, OfficeIcon, SettingsIcon } from './NavIcons.js';
import { NavItem } from './NavItem.js';

interface SidebarProps {
  activeView: ActiveView;
  onSetActiveView: (view: ActiveView) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isOfficeView: boolean;
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

const EXPANDED_WIDTH = 200;
const COLLAPSED_WIDTH = 48;

export function Sidebar({
  activeView,
  onSetActiveView,
  collapsed,
  onToggleCollapsed,
  isOfficeView,
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
}: SidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const sidebarStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width,
    zIndex: 55,
    display: 'flex',
    flexDirection: 'column',
    background: isOfficeView
      ? 'rgba(30, 30, 46, 0.85)'
      : 'var(--pixel-bg)',
    backdropFilter: isOfficeView ? 'blur(12px)' : undefined,
    WebkitBackdropFilter: isOfficeView ? 'blur(12px)' : undefined,
    borderRight: '2px solid var(--pixel-border)',
    transition: 'width 0.2s ease',
    overflow: 'hidden',
  };

  const brandStyle: React.CSSProperties = {
    padding: collapsed ? '16px 0' : '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    borderBottom: '1px solid var(--pixel-border)',
    minHeight: 52,
  };

  const brandTextStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--pixel-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };

  const toggleBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--pixel-text-dim)',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    margin: '8px 12px',
    background: 'var(--pixel-border)',
  };

  return (
    <>
      <nav style={sidebarStyle}>
        {/* Brand / collapse toggle */}
        <div style={brandStyle}>
          {!collapsed && <span style={brandTextStyle}>Pixel Office</span>}
          <button style={toggleBtnStyle} onClick={onToggleCollapsed} title={collapsed ? 'Expandir menu' : 'Colapsar menu'}>
            {collapsed ? <ExpandIcon size={18} /> : <CollapseIcon size={18} />}
          </button>
        </div>

        {/* Primary nav */}
        <div style={{ flex: 1, paddingTop: 8, display: 'flex', flexDirection: 'column' }}>
          <NavItem
            icon={<OfficeIcon size={20} />}
            label="Office"
            isActive={activeView === 'office'}
            collapsed={collapsed}
            onClick={() => onSetActiveView('office')}
          />
          <NavItem
            icon={<DashboardIcon size={20} />}
            label="Dashboard"
            isActive={activeView === 'dashboard'}
            collapsed={collapsed}
            onClick={() => onSetActiveView('dashboard')}
          />
          <NavItem
            icon={<ChatIcon size={20} />}
            label="Chat"
            isActive={activeView === 'chat'}
            collapsed={collapsed}
            badge={unreadCount}
            onClick={onOpenChat}
          />

          <div style={dividerStyle} />

          {/* Layout — only in office view */}
          {isOfficeView && (
            <NavItem
              icon={<LayoutIcon size={20} />}
              label="Layout"
              isActive={isEditMode}
              collapsed={collapsed}
              onClick={onToggleEditMode}
            />
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Settings + Logout — bottom */}
          <div style={{ borderTop: '1px solid var(--pixel-border)', paddingTop: 8, paddingBottom: 8 }}>
            <NavItem
              icon={<SettingsIcon size={20} />}
              label="Settings"
              collapsed={collapsed}
              onClick={() => setIsSettingsOpen(true)}
            />
            <NavItem
              icon={<LogoutIcon size={20} />}
              label="Sair"
              collapsed={collapsed}
              onClick={onLogout}
            />
          </div>
        </div>
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

export { COLLAPSED_WIDTH, EXPANDED_WIDTH };
