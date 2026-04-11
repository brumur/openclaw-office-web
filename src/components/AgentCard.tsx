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
  // agent:lexi:whatsapp:+55... → 'whatsapp'
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
  thinking: 'rgba(167, 139, 250, 0.08)',
  executing: 'rgba(90, 200, 140, 0.08)',
  writing: 'rgba(96, 165, 250, 0.08)',
  waiting: 'rgba(245, 158, 11, 0.08)',
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

  const cardStyle: React.CSSProperties = {
    ...baseCardStyle,
    background: STATUS_BG[resolved],
    border: `2px solid ${STATUS_BORDER[resolved]}`,
  };

  return (
    <div style={cardStyle}>
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
