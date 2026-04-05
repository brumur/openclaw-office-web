import { useState } from 'react';

import { isSoundEnabled, setSoundEnabled } from '../notificationSound.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  onToggleDebugMode: () => void;
  alwaysShowOverlay: boolean;
  onToggleAlwaysShowOverlay: () => void;
  onOpenChat: () => void;
  onClearHistory: () => void;
}

const menuItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '6px 10px',
  fontSize: '24px',
  color: 'rgba(255, 255, 255, 0.8)',
  background: 'transparent',
  border: 'none',
  borderRadius: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: '2px solid rgba(255, 255, 255, 0.5)',
        borderRadius: 0,
        background: checked ? 'rgba(90, 140, 255, 0.8)' : 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        lineHeight: 1,
        color: '#fff',
      }}
    >
      {checked ? '✓' : ''}
    </span>
  );
}

export function SettingsModal({
  isOpen,
  onClose,
  isDebugMode,
  onToggleDebugMode,
  alwaysShowOverlay,
  onToggleAlwaysShowOverlay,
  onOpenChat,
  onClearHistory,
}: SettingsModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [soundLocal, setSoundLocal] = useState(isSoundEnabled);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const item = (key: string) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
    style: {
      ...menuItemBase,
      background: hovered === key ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
    },
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 49,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 50,
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          borderRadius: 0,
          padding: '4px',
          boxShadow: 'var(--pixel-shadow)',
          minWidth: 220,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid var(--pixel-border)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontSize: '24px', color: 'rgba(255, 255, 255, 0.9)' }}>Settings</span>
          <button
            onClick={onClose}
            {...item('close')}
            style={{
              background: hovered === 'close' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 0,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Open Chat */}
        <button
          onClick={() => { onOpenChat(); onClose(); }}
          {...item('chat')}
        >
          Open Chat
        </button>

        <div style={{ height: 1, margin: '4px 0', background: 'var(--pixel-border)' }} />

        {/* Sound */}
        <button
          onClick={() => {
            const newVal = !isSoundEnabled();
            setSoundEnabled(newVal);
            setSoundLocal(newVal);
          }}
          {...item('sound')}
        >
          <span>Sound Notifications</span>
          <Checkbox checked={soundLocal} />
        </button>

        {/* Always Show Labels */}
        <button onClick={onToggleAlwaysShowOverlay} {...item('overlay')}>
          <span>Always Show Labels</span>
          <Checkbox checked={alwaysShowOverlay} />
        </button>

        {/* Debug View */}
        <button onClick={onToggleDebugMode} {...item('debug')}>
          <span>Debug View</span>
          <Checkbox checked={isDebugMode} />
        </button>

        <div style={{ height: 1, margin: '4px 0', background: 'var(--pixel-border)' }} />

        {/* Clear Chat History */}
        {!confirmClear ? (
          <button onClick={() => setConfirmClear(true)} {...item('clear')}>
            <span style={{ color: 'rgba(255, 120, 120, 0.9)' }}>Clear Chat History</span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 4, padding: '4px 10px', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>Sure?</span>
            <button
              onClick={() => { onClearHistory(); setConfirmClear(false); onClose(); }}
              style={{ ...menuItemBase, width: 'auto', padding: '2px 10px', fontSize: '20px', background: 'rgba(200, 50, 50, 0.5)', color: '#fff' }}
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              style={{ ...menuItemBase, width: 'auto', padding: '2px 10px', fontSize: '20px' }}
            >
              No
            </button>
          </div>
        )}
      </div>
    </>
  );
}
