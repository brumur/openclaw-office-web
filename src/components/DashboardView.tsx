import type { ChatMessage } from '../App.js';
import { CONFIGURED_AGENTS } from '../agentConfig.js';
import type { OfficeState } from '../office/engine/officeState.js';
import type { ToolActivity } from '../office/types.js';

import { AgentCard, getChannelsFromSessions } from './AgentCard.js';

interface DashboardViewProps {
  officeState: OfficeState;
  agents: number[];
  agentStatuses: Record<number, string>;
  agentTools: Record<number, ToolActivity[]>;
  messagesByAgent: Record<number, ChatMessage[]>;
  onOpenChat: (id: number) => void;
  sidebarWidth?: number;
  bottomOffset?: number;
}

const headerStyle: React.CSSProperties = {
  fontSize: 22,
  color: 'var(--pixel-text)',
  marginBottom: 20,
  fontWeight: 700,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 14,
};

// Tech grid background — nodes + connecting lines (neural network / circuit style)
const DASH_BG_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cdefs%3E%3CradialGradient id='dot' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='rgba(90,140,255,0.35)'/%3E%3Cstop offset='100%25' stop-color='rgba(90,140,255,0)'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='40' cy='40' r='2' fill='url(%23dot)'/%3E%3Ccircle cx='0' cy='0' r='1.2' fill='rgba(90,140,255,0.12)'/%3E%3Ccircle cx='80' cy='0' r='1.2' fill='rgba(90,140,255,0.12)'/%3E%3Ccircle cx='0' cy='80' r='1.2' fill='rgba(90,140,255,0.12)'/%3E%3Ccircle cx='80' cy='80' r='1.2' fill='rgba(90,140,255,0.12)'/%3E%3Cline x1='0' y1='0' x2='40' y2='40' stroke='rgba(90,140,255,0.06)' stroke-width='0.5'/%3E%3Cline x1='80' y1='0' x2='40' y2='40' stroke='rgba(90,140,255,0.06)' stroke-width='0.5'/%3E%3Cline x1='0' y1='80' x2='40' y2='40' stroke='rgba(90,140,255,0.06)' stroke-width='0.5'/%3E%3Cline x1='80' y1='80' x2='40' y2='40' stroke='rgba(90,140,255,0.06)' stroke-width='0.5'/%3E%3Cline x1='40' y1='0' x2='40' y2='40' stroke='rgba(90,140,255,0.03)' stroke-width='0.3'/%3E%3Cline x1='0' y1='40' x2='40' y2='40' stroke='rgba(90,140,255,0.03)' stroke-width='0.3'/%3E%3C/svg%3E")`;

// Radial glows for depth
const DASH_BG_GLOW = 'radial-gradient(ellipse at 15% 5%, rgba(90,140,255,0.12) 0%, transparent 55%)';
const DASH_BG_GLOW2 = 'radial-gradient(ellipse at 85% 90%, rgba(90,200,140,0.08) 0%, transparent 50%)';
const DASH_BG_GLOW3 = 'radial-gradient(ellipse at 50% 50%, rgba(90,140,255,0.03) 0%, transparent 70%)';

export function DashboardView({
  officeState,
  agents,
  agentStatuses,
  agentTools,
  messagesByAgent,
  onOpenChat,
  sidebarWidth = 0,
  bottomOffset = 0,
}: DashboardViewProps) {
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'auto',
    background: `${DASH_BG_GLOW}, ${DASH_BG_GLOW2}, ${DASH_BG_GLOW3}, ${DASH_BG_SVG}, var(--pixel-bg)`,
    padding: '24px',
    paddingLeft: 24 + sidebarWidth,
    paddingBottom: 24 + bottomOffset,
    zIndex: 1,
    transition: 'padding-left 0.2s ease',
  };

  // Build a map of folderName → agent id for connected agents
  const folderToId = new Map<string, number>();
  for (const id of agents) {
    const ch = officeState.characters.get(id);
    if (!ch || ch.isSubagent) continue;
    const fn = (ch.folderName ?? '').toLowerCase();
    if (fn) folderToId.set(fn, id);
  }

  // Collect session keys for channel badges
  const agentSessionKeys: Record<number, string[]> = {};
  for (const ch of officeState.characters.values()) {
    if (ch.isSubagent || !ch.sessionKey) continue;
    if (!agentSessionKeys[ch.id]) agentSessionKeys[ch.id] = [];
    agentSessionKeys[ch.id].push(ch.sessionKey);
  }

  // Track which connected agents were matched to a config entry
  const matchedIds = new Set<number>();

  // Build cards from CONFIGURED_AGENTS (preserves order, shows offline ones)
  const configuredCards = CONFIGURED_AGENTS.map((cfg) => {
    const matchId = folderToId.get(cfg.folderName.toLowerCase());
    if (matchId != null) {
      matchedIds.add(matchId);
      const ch = officeState.characters.get(matchId)!;
      const status = agentStatuses[matchId] ?? 'active';
      const tools = agentTools[matchId] ?? [];
      const msgs = messagesByAgent[matchId] ?? [];
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      const isStreaming = lastMessage?.streaming === true;
      const channels = getChannelsFromSessions(agentSessionKeys[matchId] ?? []);

      return (
        <AgentCard
          key={`cfg-${cfg.folderName}`}
          id={matchId}
          name={cfg.name}
          sessionKey={ch.sessionKey}
          status={status}
          tools={tools}
          lastMessage={lastMessage}
          isStreaming={isStreaming}
          channelSessions={channels}
          onOpenChat={onOpenChat}
        />
      );
    }

    // Offline — configured but not connected
    return (
      <AgentCard
        key={`cfg-${cfg.folderName}`}
        id={-1}
        name={cfg.name}
        status="idle"
        tools={[]}
        isOffline
        channelSessions={[]}
        onOpenChat={onOpenChat}
      />
    );
  });

  return (
    <div style={containerStyle} className="pixel-chat-scroll">
      <div style={headerStyle}>Dashboard</div>
      <div style={gridStyle}>
        {configuredCards}
      </div>
    </div>
  );
}
