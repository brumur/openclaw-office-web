import { useState } from 'react';

import { SettingsModal } from './SettingsModal.js';

interface BottomToolbarProps {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  onOpenChat: () => void;
  onClearHistory: () => void;
  unreadCount?: number;
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 10,
  left: 10,
  zIndex: 'var(--pixel-controls-z)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-border)',
  borderRadius: 0,
  padding: '4px 6px',
  boxShadow: 'var(--pixel-shadow)',
};

const btnBase: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: '24px',
  color: 'var(--pixel-text)',
  background: 'var(--pixel-btn-bg)',
  border: '2px solid transparent',
  borderRadius: 0,
  cursor: 'pointer',
};

const btnActive: React.CSSProperties = {
  ...btnBase,
  background: 'var(--pixel-active-bg)',
  border: '2px solid var(--pixel-accent)',
};

export function BottomToolbar({
  isEditMode,
  onToggleEditMode,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  onOpenChat,
  onClearHistory,
  unreadCount = 0,
}: BottomToolbarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div style={panelStyle}>
      {/* Chat */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onOpenChat}
          onMouseEnter={() => setHovered('chat')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...btnBase,
            padding: '5px 12px',
            background:
              hovered === 'chat'
                ? 'var(--pixel-agent-hover-bg, var(--pixel-btn-hover-bg))'
                : 'var(--pixel-agent-bg, var(--pixel-accent))',
            border: '2px solid var(--pixel-agent-border, var(--pixel-accent))',
            color: 'var(--pixel-agent-text, #fff)',
          }}
          title="Open chat"
        >
          Chat
        </button>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: '#f87171',
              color: '#fff',
              fontSize: 11,
              fontFamily: 'monospace',
              fontWeight: 'bold',
              borderRadius: '50%',
              minWidth: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1,
              pointerEvents: 'none',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

      {/* Layout editor */}
      <button
        onClick={onToggleEditMode}
        onMouseEnter={() => setHovered('edit')}
        onMouseLeave={() => setHovered(null)}
        style={
          isEditMode
            ? btnActive
            : { ...btnBase, background: hovered === 'edit' ? 'var(--pixel-btn-hover-bg)' : btnBase.background }
        }
        title="Edit office layout"
      >
        Layout
      </button>

      {/* Settings */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsSettingsOpen((v) => !v)}
          onMouseEnter={() => setHovered('settings')}
          onMouseLeave={() => setHovered(null)}
          style={
            isSettingsOpen
              ? btnActive
              : { ...btnBase, background: hovered === 'settings' ? 'var(--pixel-btn-hover-bg)' : btnBase.background }
          }
          title="Settings"
        >
          ⚙
        </button>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDebugMode={isDebugMode}
          onToggleDebugMode={onToggleDebugMode}
          alwaysShowOverlay={alwaysShowOverlay}
          onToggleAlwaysShowOverlay={onToggleAlwaysShowOverlay}
          onOpenChat={onOpenChat}
          onClearHistory={onClearHistory}
        />
      </div>
    </div>
  );
}
