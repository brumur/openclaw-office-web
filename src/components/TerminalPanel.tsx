import hljs from 'highlight.js';
import { marked, Renderer } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';

import { agentColor } from '../agentColors.js';
import type { ChatMessage, WsStatus } from '../App.js';

// Configure marked with highlight.js syntax highlighting
const renderer = new Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre style="margin:6px 0;overflow-x:auto;background:rgba(0,0,0,0.35);padding:10px 12px;border-radius:4px"><code class="hljs language-${language}" style="font-family:monospace;font-size:13px;line-height:1.5">${highlighted}</code></pre>`;
};
marked.use({ renderer, breaks: true, gfm: true });

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
  isMobile?: boolean;
  mobileHeight?: number;
  onMobileHeightChange?: (h: number) => void;
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
  isMobile = false,
  mobileHeight = 380,
  onMobileHeightChange,
}: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dot = STATUS_DOT[wsStatus];
  const activeTab = agentTabs.find((t) => t.id === selectedChatAgentId);
  const activeColor = activeTab?.color ?? agentColor(selectedChatAgentId ?? 1);
  const activeName = activeTab?.name ?? 'OpenClaw';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Drag-to-resize (desktop: left edge; mobile: top edge) ─────────────────
  const dragRef = useRef<{ startPos: number; startSize: number } | null>(null);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startPos = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    dragRef.current = { startPos, startSize: width };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const pos = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const delta = dragRef.current.startPos - pos;
      onWidthChange(Math.min(700, Math.max(280, dragRef.current.startSize + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const handleMobileDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const startPos = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragRef.current = { startPos, startSize: mobileHeight };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const pos = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const delta = dragRef.current.startPos - pos; // drag up = increase height
      onMobileHeightChange?.(Math.min(window.innerHeight * 0.92, Math.max(120, dragRef.current.startSize + delta)));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  return (
    <div
      style={isMobile ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: mobileHeight,
        background: 'rgba(10, 10, 18, 0.98)',
        borderTop: `2px solid ${activeColor}55`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `0 -8px 32px rgba(0,0,0,0.7)`,
        zIndex: 200,
        transition: 'border-color 0.2s',
      } : {
        width,
        height: '100%',
        flexShrink: 0,
        background: 'rgba(10, 10, 18, 0.97)',
        borderLeft: `2px solid ${activeColor}44`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `-4px 0 24px rgba(0,0,0,0.5), inset 1px 0 0 ${activeColor}22`,
        transition: 'border-color 0.2s',
        position: 'relative',
      }}
    >
      {/* Desktop: left-edge drag handle */}
      {!isMobile && (
        <div
          onMouseDown={handleDragStart}
          style={{
            position: 'absolute',
            left: -4,
            top: 0,
            bottom: 0,
            width: 8,
            cursor: 'col-resize',
            zIndex: 10,
          }}
        />
      )}

      {/* Mobile: top drag pill */}
      {isMobile && (
        <div
          onMouseDown={handleMobileDragStart}
          onTouchStart={handleMobileDragStart}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px 0 4px',
            cursor: 'row-resize',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <div style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(255,255,255,0.2)',
          }} />
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '1px solid var(--pixel-border)',
          background: 'rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: activeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
              color: '#fff',
              flexShrink: 0,
              boxShadow: `0 0 8px ${activeColor}66`,
              fontFamily: 'monospace',
            }}
          >
            {activeName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: activeColor, fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 1.2 }}>
              {activeName}
            </div>
          </div>
          <span
            title={dot.title}
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dot.color,
              flexShrink: 0,
              animation: dot.pulse ? 'pixel-agents-pulse 1s ease-in-out infinite' : 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sair"
              style={{
                background: 'transparent',
                border: '1px solid var(--pixel-border)',
                color: 'var(--pixel-text-dim)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '2px 8px',
                fontFamily: 'monospace',
              }}
            >
              ⏏
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--pixel-border)',
              color: 'var(--pixel-text-dim)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 8px',
              fontFamily: 'monospace',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab bar */}
      {agentTabs.length > 1 && (
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--pixel-border)',
            background: 'rgba(0,0,0,0.2)',
            overflowX: 'auto',
            flexShrink: 0,
            scrollbarWidth: 'none',
          }}
        >
          {agentTabs.map((tab) => {
            const isActive = tab.id === selectedChatAgentId;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectAgent(tab.id)}
                style={{
                  position: 'relative',
                  background: isActive ? `${tab.color}18` : 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                  color: isActive ? tab.color : 'var(--pixel-text-dim)',
                  cursor: 'pointer',
                  padding: '7px 14px',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  fontWeight: isActive ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                }}
              >
                {tab.name}
                {tab.unread > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: '#f87171',
                      color: '#fff',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
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
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {wsStatus !== 'connected' && (
          <div style={{
            background: wsStatus === 'disconnected' ? 'rgba(248,113,113,0.12)' : 'rgba(250,204,21,0.10)',
            border: `1px solid ${wsStatus === 'disconnected' ? '#f87171' : '#facc15'}`,
            color: wsStatus === 'disconnected' ? '#f87171' : '#facc15',
            fontSize: 14,
            fontFamily: 'monospace',
            padding: '8px 12px',
            borderRadius: 4,
            textAlign: 'center',
          }}>
            {wsStatus === 'disconnected'
              ? 'Backend offline — reconectando em 5s...'
              : 'Conectando ao backend...'}
          </div>
        )}

        {selectedChatAgentId === null ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 10,
            opacity: 0.45,
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            <div style={{ fontSize: 32 }}>🖱️</div>
            <div style={{ color: 'var(--pixel-text-dim)', fontSize: 16, fontFamily: 'monospace', textAlign: 'center' }}>
              Clique em um agente<br />para conversar
            </div>
          </div>
        ) : (
          <>
            {messages.length === 0 && wsStatus === 'connected' && (
              <div style={{
                color: 'var(--pixel-text-dim)',
                fontSize: 16,
                fontFamily: 'monospace',
                textAlign: 'center',
                marginTop: 40,
                opacity: 0.5,
              }}>
                Fale com {activeName}...
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <UserBubble key={i} text={msg.text} />
              ) : (
                <AssistantBubble key={i} text={msg.text} streaming={msg.streaming} agentColor={activeColor} agentInitial={activeName.charAt(0).toUpperCase()} />
              )
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          borderTop: '1px solid var(--pixel-border)',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedChatAgentId === null ? 'Selecione um agente no mapa...' : wsStatus === 'connected' ? `Mensagem para ${activeName}… (Shift+Enter nova linha)` : 'Aguardando conexão...'}
          disabled={wsStatus !== 'connected' || selectedChatAgentId === null}
          autoFocus
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--pixel-text)',
            outline: 'none',
            fontSize: 15,
            fontFamily: 'monospace',
            padding: '10px 12px',
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
            background: input.trim() ? activeColor : 'transparent',
            border: 'none',
            borderLeft: '1px solid var(--pixel-border)',
            color: input.trim() ? '#fff' : 'var(--pixel-text-dim)',
            cursor: input.trim() ? 'pointer' : 'default',
            padding: '0 16px',
            fontSize: 17,
            fontFamily: 'monospace',
            transition: 'background 0.15s',
            alignSelf: 'stretch',
          }}
        >
          ↵
        </button>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'var(--pixel-text)',
          padding: '8px 12px',
          maxWidth: '80%',
          fontSize: 15,
          fontFamily: 'monospace',
          lineHeight: 1.5,
          borderRadius: '12px 12px 2px 12px',
          wordBreak: 'break-word',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({
  text,
  streaming,
  agentColor: color,
  agentInitial,
}: {
  text: string;
  streaming?: boolean;
  agentColor: string;
  agentInitial: string;
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
      style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Colored avatar */}
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 'bold',
          color: '#fff',
          flexShrink: 0,
          marginTop: 2,
          fontFamily: 'monospace',
          boxShadow: `0 0 6px ${color}44`,
        }}
      >
        {agentInitial}
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {/* Copy button */}
        {hovered && !streaming && (
          <button
            onClick={handleCopy}
            title="Copiar"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              background: 'rgba(30,30,46,0.9)',
              border: `1px solid ${color}44`,
              color: copied ? '#4ade80' : 'var(--pixel-text-dim)',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: 3,
              zIndex: 1,
              transition: 'color 0.15s',
            }}
          >
            {copied ? '✓ copiado' : 'copiar'}
          </button>
        )}
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${color}33`,
            color: 'var(--pixel-text)',
            padding: '8px 12px',
            fontSize: 15,
            fontFamily: 'monospace',
            lineHeight: 1.6,
            borderRadius: '2px 12px 12px 12px',
            wordBreak: 'break-word',
          }}
        >
          <div
            className="md-content"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {streaming && (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 14,
                background: color,
                marginLeft: 3,
                verticalAlign: 'middle',
                animation: 'pixel-agents-pulse 0.8s ease-in-out infinite',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
