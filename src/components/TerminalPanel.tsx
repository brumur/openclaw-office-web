import { marked } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';

import { agentColor } from '../agentColors.js';
import type { ChatMessage, WsStatus } from '../App.js';

marked.setOptions({ breaks: true, gfm: true });

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
  selectedChatAgentId: number;
  onSelectAgent: (id: number) => void;
  onLogout?: () => void;
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
}: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dot = STATUS_DOT[wsStatus];
  const activeTab = agentTabs.find((t) => t.id === selectedChatAgentId);
  const activeColor = activeTab?.color ?? agentColor(selectedChatAgentId);
  const activeName = activeTab?.name ?? 'OpenClaw';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput('');
      // Reset textarea height
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

  return (
    <div
      style={{
        width: 380,
        height: '100%',
        flexShrink: 0,
        background: 'rgba(10, 10, 18, 0.97)',
        borderLeft: `2px solid ${activeColor}44`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: `-4px 0 24px rgba(0,0,0,0.5), inset 1px 0 0 ${activeColor}22`,
        transition: 'border-color 0.2s',
      }}
    >
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
          {/* Colored avatar circle */}
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
          placeholder={wsStatus === 'connected' ? `Mensagem para ${activeName}… (Shift+Enter nova linha)` : 'Aguardando conexão...'}
          disabled={wsStatus !== 'connected'}
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

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      {/* Colored avatar with agent initial */}
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
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${color}33`,
          color: 'var(--pixel-text)',
          padding: '8px 12px',
          maxWidth: 'calc(100% - 38px)',
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
  );
}
