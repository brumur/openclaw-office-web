import type { ChatMessage } from '../App.js';
import type { ToolActivity } from '../office/types.js';

interface AgentCardProps {
  id: number;
  name: string;
  sessionKey?: string;
  status: string; // 'active' | 'idle' | 'waiting'
  tools: ToolActivity[];
  lastMessage?: ChatMessage;
  isStreaming?: boolean; // true when agent is writing a response
  isOffline?: boolean;   // true when agent is configured but not connected
  channelSessions: string[]; // e.g. ['whatsapp', 'teams']
  onOpenChat: (id: number) => void;
}

type ResolvedStatus = 'idle' | 'thinking' | 'executing' | 'writing' | 'waiting' | 'offline';

const STATUS_COLORS: Record<ResolvedStatus, string> = {
  offline: '#4b5563',     // dark gray — not connected
  idle: '#6b7280',
  thinking: '#a78bfa',    // purple — processing/reasoning
  executing: '#5ac88c',   // green — running tools
  writing: '#60a5fa',     // blue — streaming response
  waiting: '#f59e0b',     // yellow — waiting for permission
};

const STATUS_LABELS: Record<ResolvedStatus, string> = {
  offline: 'Offline',
  idle: 'Inativo',
  thinking: 'Pensando...',
  executing: 'Executando',
  writing: 'Escrevendo...',
  waiting: 'Aguardando',
};

/** Derive a richer status from the raw status + tool/streaming state */
function resolveStatus(
  rawStatus: string,
  activeToolCount: number,
  isStreaming: boolean,
): ResolvedStatus {
  if (rawStatus === 'waiting') return 'waiting';
  if (rawStatus === 'idle') return 'idle';
  // active — distinguish between thinking, executing, and writing
  if (isStreaming) return 'writing';
  if (activeToolCount > 0) return 'executing';
  return 'thinking';
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  teams: 'Teams',
  signal: 'Signal',
  webchat: 'WebChat',
  imessage: 'iMessage',
};

function parseChannelFromSessionKey(sessionKey: string): string | null {
  // agent:dev:whatsapp:+55... → 'whatsapp'
  const parts = sessionKey.split(':');
  if (parts.length >= 3) {
    const channel = parts[2].toLowerCase();
    if (channel in CHANNEL_ICONS) return channel;
  }
  return null;
}

export function getChannelsFromSessions(sessionKeys: string[]): string[] {
  const channels = new Set<string>();
  for (const key of sessionKeys) {
    const ch = parseChannelFromSessionKey(key);
    if (ch) channels.add(ch);
  }
  return [...channels];
}

/** Card border + subtle background glow per status */
const STATUS_BORDER: Record<ResolvedStatus, string> = {
  offline: 'rgba(75, 85, 99, 0.4)',
  idle: 'var(--pixel-border)',
  thinking: '#a78bfa',
  executing: '#5ac88c',
  writing: '#60a5fa',
  waiting: '#f59e0b',
};

const STATUS_BG: Record<ResolvedStatus, string> = {
  offline: 'rgba(75, 85, 99, 0.05)',
  idle: 'var(--pixel-agent-bg, var(--pixel-bg))',
  thinking: 'rgba(167, 139, 250, 0.20)',
  executing: 'rgba(90, 200, 140, 0.20)',
  writing: 'rgba(96, 165, 250, 0.20)',
  waiting: 'rgba(245, 158, 11, 0.20)',
};

const STATUS_GLOW: Record<ResolvedStatus, string> = {
  offline: 'none',
  idle: 'none',
  thinking: '0 0 24px rgba(167, 139, 250, 0.4), 0 0 48px rgba(167, 139, 250, 0.15), inset 0 0 30px rgba(167, 139, 250, 0.08)',
  executing: '0 0 24px rgba(90, 200, 140, 0.4), 0 0 48px rgba(90, 200, 140, 0.15), inset 0 0 30px rgba(90, 200, 140, 0.08)',
  writing: '0 0 24px rgba(96, 165, 250, 0.4), 0 0 48px rgba(96, 165, 250, 0.15), inset 0 0 30px rgba(96, 165, 250, 0.08)',
  waiting: '0 0 24px rgba(245, 158, 11, 0.4), 0 0 48px rgba(245, 158, 11, 0.15), inset 0 0 30px rgba(245, 158, 11, 0.08)',
};

const baseCardStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  boxShadow: 'var(--pixel-shadow)',
  minWidth: 0,
  transition: 'border-color 0.3s, background 0.3s',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const nameStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--pixel-text)',
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const statusDotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  flexShrink: 0,
});

const statusLabelStyle = (color: string): React.CSSProperties => ({
  fontSize: 12,
  color,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
});

const sectionStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--pixel-text-dim)',
  lineHeight: 1.4,
};

const toolPillStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 12,
  borderRadius: 4,
  background: 'rgba(90, 140, 255, 0.15)',
  border: '1px solid rgba(90, 140, 255, 0.3)',
  color: 'var(--pixel-accent)',
  marginRight: 4,
  marginBottom: 4,
};

const channelBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: 12,
  borderRadius: 4,
  background: 'rgba(90, 200, 140, 0.15)',
  border: '1px solid rgba(90, 200, 140, 0.3)',
  color: 'var(--pixel-green, #5ac88c)',
  marginRight: 4,
  marginBottom: 4,
};

const chatBtnStyle: React.CSSProperties = {
  padding: '7px 18px',
  fontSize: 13,
  fontWeight: 600,
  background: 'var(--pixel-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  alignSelf: 'flex-end',
};

// ── Agent role icons (SVG paths for decorative background) ────────────────
// Each agent gets a contextual icon rendered as a watermark in the card background
const AGENT_ICONS: Record<string, { path: string; viewBox?: string }> = {
  'Jarvis': {
    // Brain / AI hub
    path: 'M12 2a7 7 0 0 0-4.6 12.3A4 4 0 0 0 4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1a4 4 0 0 0-3.4-3.7A7 7 0 0 0 12 2zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm-1 3v2H9v2h2v2h2v-2h2v-2h-2V7h-2z',
  },
  'Dev': {
    // Code brackets
    path: 'M8 5l-5 7 5 7M16 5l5 7-5 7M14 3l-4 18',
  },
  'Infra': {
    // Server / infrastructure
    path: 'M4 5h16a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm0 8h16a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zM7 7.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zm0 8a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z',
  },
  'support-agent': {
    // Headset / support
    path: 'M12 2a8 8 0 0 0-8 8v5a3 3 0 0 0 3 3h1v-6H6v-2a6 6 0 1 1 12 0v2h-2v6h1a3 3 0 0 0 3-3v-5a8 8 0 0 0-8-8zm-3 18a2 2 0 0 0 2 2h2a2 2 0 0 0 0-4h-2a2 2 0 0 0-2 2z',
  },
  'qa-tester': {
    // Checkmark in shield / testing
    path: 'M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5zm-1.5 14.5l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z',
  },
  'data-custodian': {
    // Database / data
    path: 'M12 2C7 2 3 3.5 3 5.5v13C3 20.5 7 22 12 22s9-1.5 9-3.5v-13C21 3.5 17 2 12 2zm0 2c4.4 0 7 1.2 7 1.5S16.4 7 12 7 5 5.8 5 5.5 7.6 4 12 4zM5 8.3c1.7.9 4.2 1.5 7 1.5s5.3-.6 7-1.5v3.2c0 .3-2.6 1.5-7 1.5s-7-1.2-7-1.5V8.3zm0 5.5c1.7.9 4.2 1.5 7 1.5s5.3-.6 7-1.5v3.2c0 .3-2.6 1.5-7 1.5s-7-1.2-7-1.5v-3.2z',
  },
  'service-ops': {
    // Gear + wrench / operations
    path: 'M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.04 7.04 0 0 0-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 9.81a.48.48 0 0 0 .12.61l2.03 1.58a7.07 7.07 0 0 0-.06.94c0 .32.02.64.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.69 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54a7.04 7.04 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
  },
  'analytics': {
    // Chart / analytics
    path: 'M5 20h14v1H5v-1zm0-2h2v-5H5v5zm4 0h2v-9H9v9zm4 0h2V8h-2v10zm4 0h2V4h-2v14z',
  },
  'security-watchdog': {
    // Shield / security
    path: 'M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5zm0 2.2L19 8.5v3.5c0 4.6-3.2 8.9-7 10-3.8-1.1-7-5.4-7-10V8.5L12 4.2zm-1 5.8v4h2v-4h-2zm0 5v2h2v-2h-2z',
  },
  'change-manager': {
    // Arrows cycle / change management
    path: 'M12 4V1L8 5l4 4V6a6 6 0 0 1 6 6h2A8 8 0 0 0 12 4zM4 12a8 8 0 0 0 8 8v-3l4-4-4-4v3a6 6 0 0 1-6-6H4z',
  },
};

function AgentWatermark({ name, color }: { name: string; color: string }) {
  const icon = AGENT_ICONS[name];
  if (!icon) return null;
  return (
    <svg
      viewBox={icon.viewBox ?? '0 0 24 24'}
      width={80}
      height={80}
      style={{
        position: 'absolute',
        right: 6,
        bottom: 6,
        opacity: 0.12,
        pointerEvents: 'none',
      }}
    >
      <path d={icon.path} fill={color} stroke={color} strokeWidth={0.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AgentCard({
  id,
  name,
  status,
  tools,
  lastMessage,
  isStreaming = false,
  isOffline = false,
  channelSessions,
  onOpenChat,
}: AgentCardProps) {
  const activeTools = tools.filter((t) => !t.done);
  const resolved = isOffline ? 'offline' as ResolvedStatus : resolveStatus(status, activeTools.length, isStreaming);
  const statusColor = STATUS_COLORS[resolved];
  const statusLabel = STATUS_LABELS[resolved];
  const isAnimated = resolved !== 'idle';

  const isActive = resolved !== 'idle' && resolved !== 'offline';
  const cardStyle: React.CSSProperties = {
    ...baseCardStyle,
    position: 'relative',
    overflow: 'hidden',
    background: STATUS_BG[resolved],
    border: `${isActive ? 2.5 : 1}px solid ${STATUS_BORDER[resolved]}`,
    boxShadow: STATUS_GLOW[resolved],
    transform: isActive ? 'scale(1.03)' : undefined,
    transition: 'border-color 0.3s, background 0.3s, box-shadow 0.3s, transform 0.3s',
  };

  // Use the agent's status color for the watermark (matches card border glow)
  const agentAccent = isOffline ? '#6b7280' : (STATUS_COLORS[resolved] ?? 'var(--pixel-accent)');

  return (
    <div style={cardStyle}>
      <AgentWatermark name={name} color={agentAccent} />
      {/* Header: name + status */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={statusDotStyle(statusColor)}
            className={isAnimated ? 'pixel-agents-pulse' : undefined}
          />
          <span style={nameStyle}>{name}</span>
        </div>
        <span
          style={statusLabelStyle(resolved === 'idle' ? 'var(--pixel-text-dim)' : statusColor)}
          className={isAnimated ? 'pixel-agents-pulse' : undefined}
        >
          {statusLabel}
        </span>
      </div>

      {/* Active tools */}
      {activeTools.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ marginBottom: 4, color: 'var(--pixel-text)' }}>Tools:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {activeTools.map((t) => (
              <span
                key={t.toolId}
                style={{
                  ...toolPillStyle,
                  ...(t.permissionWait
                    ? { background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }
                    : {}),
                }}
              >
                {t.status}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Channel sessions */}
      {channelSessions.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ marginBottom: 4, color: 'var(--pixel-text)' }}>Canais:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {channelSessions.map((ch) => (
              <span key={ch} style={channelBadgeStyle}>
                {CHANNEL_ICONS[ch] ?? ch}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last message preview */}
      {lastMessage && (
        <div style={sectionStyle}>
          <div style={{ marginBottom: 4, color: 'var(--pixel-text)' }}>
            {lastMessage.role === 'user' ? 'Voce:' : 'Agente:'}
          </div>
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {lastMessage.text.slice(0, 120)}
            {lastMessage.text.length > 120 ? '...' : ''}
          </div>
        </div>
      )}

      {/* Chat button */}
      <button
        style={{
          ...chatBtnStyle,
          ...(isOffline ? { opacity: 0.35, cursor: 'default' } : {}),
        }}
        onClick={isOffline ? undefined : () => onOpenChat(id)}
        onMouseEnter={isOffline ? undefined : (e) => { (e.target as HTMLElement).style.filter = 'brightness(0.85)'; }}
        onMouseLeave={isOffline ? undefined : (e) => { (e.target as HTMLElement).style.filter = ''; }}
      >
        {isOffline ? 'Offline' : 'Chat'}
      </button>
    </div>
  );
}
