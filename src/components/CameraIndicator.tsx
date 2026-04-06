import type { WsStatus } from '../App.js';

interface CameraIndicatorProps {
  status: WsStatus;
}

const CONFIG = {
  connected:    { dot: '#4ade80', label: 'REC',           pulse: false, dim: true  },
  connecting:   { dot: '#facc15', label: 'CONECTANDO...', pulse: true,  dim: false },
  disconnected: { dot: '#f87171', label: 'OFFLINE',       pulse: true,  dim: false },
};

export function CameraIndicator({ status }: CameraIndicatorProps) {
  const { dot, label, pulse, dim } = CONFIG[status];

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 'var(--pixel-controls-z)',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(10, 10, 18, 0.72)',
        border: `1px solid ${dim ? 'rgba(255,255,255,0.07)' : dot + '55'}`,
        padding: '3px 8px 3px 6px',
        fontFamily: 'monospace',
        fontSize: 11,
        letterSpacing: '0.05em',
        opacity: dim ? 0.35 : 1,
        transition: 'opacity 0.4s, border-color 0.4s',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Camera icon */}
      <span style={{ fontSize: 13, lineHeight: 1 }}>📷</span>

      {/* Blinking dot */}
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dot,
          flexShrink: 0,
          boxShadow: dim ? 'none' : `0 0 4px ${dot}`,
          animation: pulse ? 'pixel-agents-pulse 1s ease-in-out infinite' : 'none',
        }}
      />

      {/* Label */}
      <span style={{ color: dim ? 'var(--pixel-text-dim)' : dot, fontWeight: 'bold' }}>
        {label}
      </span>
    </div>
  );
}
