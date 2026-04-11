import type { ChatMessage } from '../App.js';
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

const emptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--pixel-text-dim)',
  textAlign: 'center',
  padding: '60px 20px',
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
  // Collect all sessionKeys associated with each agent (for channel badges)
  const agentSessionKeys: Record<number, string[]> = {};
  for (const ch of officeState.characters.values()) {
    if (ch.isSubagent) continue;
    if (!ch.sessionKey) continue;
    const id = ch.id;
    if (!agentSessionKeys[id]) agentSessionKeys[id] = [];
    agentSessionKeys[id].push(ch.sessionKey);
  }

  // Also check subagent sessions that map to parent agents
  for (const [, meta] of officeState.subagentMeta) {
    const parentChar = officeState.characters.get(meta.parentAgentId);
    if (parentChar?.sessionKey) {
      // Already added from main loop
    }
  }

  return (
    <div style={containerStyle} className="pixel-chat-scroll">
      <div style={headerStyle}>Dashboard</div>
      {agents.length === 0 ? (
        <div style={emptyStyle}>Nenhum agente conectado.</div>
      ) : (
        <div style={gridStyle}>
          {agents.map((id) => {
            const ch = officeState.characters.get(id);
            if (!ch || ch.isSubagent) return null;
            const name = ch.folderName ?? `Agent #${id}`;
            const status = agentStatuses[id] ?? 'active';
            const tools = agentTools[id] ?? [];
            const msgs = messagesByAgent[id] ?? [];
            const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
            const isStreaming = lastMessage?.streaming === true;
            const sessionKeys = agentSessionKeys[id] ?? [];
            const channels = getChannelsFromSessions(sessionKeys);

            return (
              <AgentCard
                key={id}
                id={id}
                name={name}
                sessionKey={ch.sessionKey}
                status={status}
                tools={tools}
                lastMessage={lastMessage}
                isStreaming={isStreaming}
                channelSessions={channels}
                onOpenChat={onOpenChat}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
