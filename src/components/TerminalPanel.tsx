import hljs from 'highlight.js';
import { marked, Renderer } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';

import { agentColor } from '../agentColors.js';
import type { ChatMessage, WsStatus } from '../App.js';

const CHAT_FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const CHAT_SIZE = 16;

// Configure marked with highlight.js syntax highlighting
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

interface TerminalPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  wsStatus: WsStatus;
  agentTabs: AgentTab[];
  selectedChatAgentId: number | null;
  onSelectAgent: (id: number) => void;
  onLogout?: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}

const STATUS_DOT: Record<WsStatus, { color: string; title: string; pulse: boolean }> = {
  connected:    { color: '#4ade80', title: 'Conectado',    pulse: false },
  connecting:   { color: '#facc15', title: 'Conectando…',  pulse: true  },
  disconnected: { color: '#f87171', title: 'Desconectado', pulse: false },
};

export function TerminalPanel({
  messages,
  onSend,
  onClose,
  wsStatus,
  agentTabs,
  selectedChatAgentId,
  onSelectAgent,
  onLogout,
  width,
  onWidthChange,
}: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dot = STATUS_DOT[wsStatus];
  const activeTab = agentTabs.find((t) => t.id === selectedChatAgentId);
  const activeColor = activeTab?.color ?? agentColor(selectedChatAgentId ?? 1);
  const activeName = activeTab?.name ?? 'OpenClaw';

  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: width };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      onWidthChange(Math.min(700, Math.max(280, dragRef.current.startWidth + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, right: 0, bottom: 0,
        width,
        background: 'rgba(10, 10, 22, 0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
        zIndex: 150,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        fontFamily: CHAT_FONT,
      }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        style={{ position: 'absolute', left: -4, top: 0, bottom: 0, width: 8, cursor: 'col-resize', zIndex: 10 }}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            background: activeColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: '#fff',
            boxShadow: `0 0 10px ${activeColor}55`,
          }}>
            {activeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 600, lineHeight: 1.2 }}>
              {activeName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: dot.color,
                display: 'inline-block',
                animation: dot.pulse ? 'pixel-agents-pulse 1s ease-in-out infinite' : 'none',
              }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{dot.title}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {onLogout && (
            <button onClick={onLogout} title="Sair" style={headerBtn}>⏏</button>
          )}
          <button onClick={onClose} style={headerBtn}>✕</button>
        </div>
      </div>

      {/* Agent tabs */}
      {agentTabs.length > 1 && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          overflowX: 'auto',
          flexShrink: 0,
          scrollbarWidth: 'none',
          padding: '0 4px',
        }}>
          {agentTabs.map((tab) => {
            const isActive = tab.id === selectedChatAgentId;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectAgent(tab.id)}
                style={{
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: '10px 16px',
                  fontSize: 14,
                  fontFamily: CHAT_FONT,
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tab.name}
                {tab.unread > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 2,
                    background: '#f87171', color: '#fff',
                    fontSize: 10, borderRadius: '50%',
                    width: 16, height: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tab.unread > 9 ? '9+' : tab.unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div
        className="pixel-chat-scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {wsStatus !== 'connected' && (
          <div style={{
            background: wsStatus === 'disconnected' ? 'rgba(248,113,113,0.1)' : 'rgba(250,204,21,0.08)',
            border: `1px solid ${wsStatus === 'disconnected' ? '#f8717155' : '#facc1555'}`,
            color: wsStatus === 'disconnected' ? '#f87171' : '#facc15',
            fontSize: 13, fontFamily: CHAT_FONT,
            padding: '8px 12px', borderRadius: 8, textAlign: 'center',
          }}>
            {wsStatus === 'disconnected' ? 'Backend offline — reconectando em 5s...' : 'Conectando ao backend...'}
          </div>
        )}

        {selectedChatAgentId === null ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flex: 1, gap: 10, opacity: 0.4,
            pointerEvents: 'none', userSelect: 'none',
          }}>
            <div style={{ fontSize: 28 }}>🖱️</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontFamily: CHAT_FONT, textAlign: 'center' }}>
              Clique em um agente<br />para conversar
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && wsStatus === 'connected' && (
              <div style={{
                color: 'rgba(255,255,255,0.3)', fontSize: 14,
                fontFamily: CHAT_FONT, textAlign: 'center', marginTop: 40,
              }}>
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

      {/* Input */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 12px',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedChatAgentId === null ? 'Selecione um agente...' :
            wsStatus === 'connected' ? `Mensagem para ${activeName}…` :
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
            padding: '10px 14px',
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
          style={{
            background: input.trim() ? activeColor : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 12,
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: input.trim() ? 'pointer' : 'default',
            padding: '10px 16px',
            fontSize: 18,
            lineHeight: 1,
            transition: 'background 0.15s',
            flexShrink: 0,
            alignSelf: 'flex-end',
          }}
        >
          ↵
        </button>
      </div>
    </div>
  );
}

const headerBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  fontSize: 13,
  padding: '4px 10px',
};

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
      <div style={{
        background: 'rgba(255,255,255,0.12)',
        color: '#fff',
        padding: '10px 14px',
        maxWidth: '78%',
        fontSize: CHAT_SIZE,
        fontFamily: CHAT_FONT,
        lineHeight: 1.5,
        borderRadius: '18px 18px 4px 18px',
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

  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      style={{ marginTop: 10, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        fontSize: 11, fontFamily: CHAT_FONT,
        color: color, fontWeight: 600,
        marginBottom: 4, paddingLeft: 2,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {agentName}
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.92)',
        fontSize: CHAT_SIZE,
        fontFamily: CHAT_FONT,
        lineHeight: 1.6,
        wordBreak: 'break-word',
        paddingRight: hovered && !streaming ? 52 : 0,
      }}>
        <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
        {streaming && (
          <span style={{
            display: 'inline-block',
            width: 8, height: 15,
            background: color,
            marginLeft: 3,
            verticalAlign: 'middle',
            animation: 'pixel-agents-pulse 0.8s ease-in-out infinite',
          }} />
        )}
      </div>
      {hovered && !streaming && (
        <button
          onClick={handleCopy}
          title="Copiar"
          style={{
            position: 'absolute',
            top: 20, right: 0,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: CHAT_FONT,
            padding: '3px 8px',
            transition: 'color 0.15s',
          }}
        >
          {copied ? '✓' : 'copiar'}
        </button>
      )}
    </div>
  );
}
