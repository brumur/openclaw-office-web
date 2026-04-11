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
    background: 'var(--pixel-bg)',
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
