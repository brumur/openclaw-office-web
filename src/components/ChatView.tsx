import hljs from 'highlight.js';
import { marked, Renderer } from 'marked';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { agentColor } from '../agentColors.js';
import type { ChatMessage, WsStatus } from '../App.js';

const CHAT_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const CHAT_SIZE = 14;

const renderer = new Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre style="margin:8px 0;overflow-x:auto;background:rgba(0,0,0,0.4);padding:12px 14px;border-radius:6px"><code class="hljs language-${language}" style="font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:13px;line-height:1.5">${highlighted}</code></pre>`;
};
marked.use({ renderer, breaks: false, gfm: true });

export interface AgentTab {
  id: number;
  name: string;
  color: string;
  unread: number;
}

interface ChatViewProps {
  messagesByAgent: Record<number, ChatMessage[]>;
  agentTabs: AgentTab[];
  selectedChatAgentId: number | null;
  onSelectAgent: (id: number) => void;
  onSend: (text: string) => void;
  wsStatus: WsStatus;
  sidebarWidth?: number;
  bottomOffset?: number;
  onLogout?: () => void;
}

const STATUS_DOT: Record<WsStatus, { color: string; pulse: boolean }> = {
  connected:    { color: '#4ade80', pulse: false },
  connecting:   { color: '#facc15', pulse: true  },
  disconnected: { color: '#f87171', pulse: false },
};

export function ChatView({
  messagesByAgent,
  agentTabs,
  selectedChatAgentId,
  onSelectAgent,
  onSend,
  wsStatus,
  sidebarWidth = 0,
  bottomOffset = 0,
  onLogout,
}: ChatViewProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dot = STATUS_DOT[wsStatus];

  const messages = selectedChatAgentId !== null ? (messagesByAgent[selectedChatAgentId] ?? []) : [];
  const activeTab = agentTabs.find((t) => t.id === selectedChatAgentId);
  const activeColor = activeTab?.color ?? agentColor(selectedChatAgentId ?? 1);
  const activeName = activeTab?.name ?? 'OpenClaw';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select first agent if none selected
  useEffect(() => {
    if (selectedChatAgentId === null && agentTabs.length > 0) {
      onSelectAgent(agentTabs[0].id);
    }
  }, [selectedChatAgentId, agentTabs, onSelectAgent]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && selectedChatAgentId !== null) {
      onSend(trimmed);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
  }, [input, selectedChatAgentId, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--pixel-bg)',
    paddingLeft: sidebarWidth,
    paddingBottom: bottomOffset,
    transition: 'padding-left 0.2s ease',
    zIndex: 1,
    fontFamily: CHAT_FONT,
  };

  return (
    <div style={containerStyle}>
      {/* Agent tabs header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {agentTabs.map((tab) => {
          const isActive = tab.id === selectedChatAgentId;
          const tabDot = STATUS_DOT[wsStatus];
          return (
            <button
              key={tab.id}
              onClick={() => onSelectAgent(tab.id)}
              style={{
                position: 'relative',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'none',
                border: 'none',
                borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                borderRadius: 0,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                padding: '14px 20px',
                fontSize: 14,
                fontFamily: CHAT_FONT,
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'color 0.15s, border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isActive ? tabDot.color : tab.color,
                flexShrink: 0,
                opacity: isActive ? 1 : 0.4,
                animation: isActive && tabDot.pulse ? 'pixel-agents-pulse 1s ease-in-out infinite' : 'none',
              }} />
              {tab.name}
              {tab.unread > 0 && (
                <span style={{
                  background: '#f87171', color: '#fff',
                  fontSize: 10, borderRadius: 10,
                  padding: '1px 6px', lineHeight: 1.4,
                }}>
                  {tab.unread > 9 ? '9+' : tab.unread}
                </span>
              )}
            </button>
          );
        })}

        {/* Spacer + right controls */}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', flexShrink: 0 }}>
          {/* Connection status */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: dot.color,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: dot.color,
              animation: dot.pulse ? 'pixel-agents-pulse 1s ease-in-out infinite' : 'none',
            }} />
            {wsStatus === 'connected' ? 'Online' : wsStatus === 'connecting' ? 'Conectando...' : 'Offline'}
          </span>
          {onLogout && (
            <button onClick={onLogout} title="Sair" style={iconBtnStyle}>
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="pixel-chat-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          maxWidth: 800,
          width: '100%',
          margin: '0 auto',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {wsStatus !== 'connected' && (
          <div style={{
            background: wsStatus === 'disconnected' ? 'rgba(248,113,113,0.1)' : 'rgba(250,204,21,0.08)',
            border: `1px solid ${wsStatus === 'disconnected' ? '#f8717155' : '#facc1555'}`,
            color: wsStatus === 'disconnected' ? '#f87171' : '#facc15',
            fontSize: 13, padding: '8px 14px', borderRadius: 8, textAlign: 'center',
            marginBottom: 12,
          }}>
            {wsStatus === 'disconnected' ? 'Backend offline — reconectando em 5s...' : 'Conectando ao backend...'}
          </div>
        )}

        {selectedChatAgentId === null ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: 1, opacity: 0.35, userSelect: 'none', color: '#fff', fontSize: 15,
          }}>
            Selecione um agente acima para conversar
          </div>
        ) : (
          <>
            {messages.length === 0 && wsStatus === 'connected' && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15, textAlign: 'center', marginTop: 40 }}>
                Fale com {activeName}...
              </div>
            )}
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <UserBubble key={i} text={msg.text} />
              ) : (
                <AssistantBubble key={i} text={msg.text} streaming={msg.streaming} agentColor={activeColor} agentName={activeName} />
              )
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 24px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-end',
        flexShrink: 0,
        maxWidth: 800,
        width: '100%',
        margin: '0 auto',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedChatAgentId === null ? 'Selecione um agente...' :
            wsStatus === 'connected' ? `Mensagem para ${activeName}… (Enter envia)` :
            'Aguardando conexão...'
          }
          disabled={wsStatus !== 'connected' || selectedChatAgentId === null}
          autoFocus
          rows={1}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            color: '#fff',
            outline: 'none',
            fontSize: CHAT_SIZE,
            fontFamily: CHAT_FONT,
            padding: '12px 16px',
            resize: 'none',
            maxHeight: 120,
            overflowY: 'auto',
            lineHeight: 1.5,
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || wsStatus !== 'connected' || selectedChatAgentId === null}
          style={{
            background: input.trim() ? activeColor : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 12,
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
            cursor: input.trim() ? 'pointer' : 'default',
            padding: '12px 24px',
            fontSize: 15,
            fontFamily: CHAT_FONT,
            fontWeight: 600,
            transition: 'background 0.15s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Enviar ↵
        </button>
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'system-ui, sans-serif',
  padding: '4px 10px',
};

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        color: '#fff',
        padding: '10px 16px',
        maxWidth: '70%',
        fontSize: CHAT_SIZE,
        fontFamily: CHAT_FONT,
        lineHeight: 1.5,
        borderRadius: '16px 16px 4px 16px',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({
  text,
  streaming,
  agentColor: color,
  agentName,
}: {
  text: string;
  streaming?: boolean;
  agentColor: string;
  agentName: string;
}) {
  const html = useMemo(() => marked.parse(text) as string, [text]);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ marginTop: 12, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        fontSize: 11, fontFamily: CHAT_FONT, color,
        fontWeight: 600, marginBottom: 4, paddingLeft: 2,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {agentName}
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: CHAT_SIZE,
        fontFamily: CHAT_FONT,
        lineHeight: 1.6,
        wordBreak: 'break-word',
      }}>
        <div
          className="md-content"
          style={{ fontSize: CHAT_SIZE, fontFamily: CHAT_FONT, lineHeight: 1.65 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {streaming && (
          <span style={{
            display: 'inline-block', width: 8, height: 15,
            background: color, marginLeft: 3, verticalAlign: 'middle',
            animation: 'pixel-agents-pulse 0.8s ease-in-out infinite',
          }} />
        )}
      </div>
      {hovered && !streaming && (
        <button
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          style={{
            position: 'absolute', top: 18, right: 0,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontSize: 12, fontFamily: CHAT_FONT,
            padding: '3px 8px', transition: 'color 0.15s',
          }}
        >
          {copied ? '✓' : 'copiar'}
        </button>
      )}
    </div>
  );
}
