import { marked } from 'marked';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage, WsStatus } from '../App.js';

marked.setOptions({ breaks: true, gfm: true });

interface TerminalPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  wsStatus: WsStatus;
  agentName?: string;
  agentSessionKey?: string;
}

const STATUS_DOT: Record<WsStatus, { color: string; title: string; pulse: boolean }> = {
  connected:    { color: '#4ade80', title: 'Conectado',   pulse: false },
  connecting:   { color: '#facc15', title: 'Conectando…', pulse: true  },
  disconnected: { color: '#f87171', title: 'Desconectado', pulse: false },
};

export function TerminalPanel({ messages, onSend, onClose, wsStatus, agentName, agentSessionKey }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dot = STATUS_DOT[wsStatus];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput('');
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
        position: 'absolute',
        top: 0,
        right: 0,
        width: 380,
        height: '100%',
        background: 'rgba(10, 10, 18, 0.96)',
        borderLeft: '2px solid var(--pixel-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 60,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: '2px solid var(--pixel-border)',
          background: 'rgba(0,0,0,0.4)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🦞</span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ color: 'var(--pixel-accent)', fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1, lineHeight: 1.2 }}>
              {agentName ?? 'OpenClaw'}
            </span>
            {agentSessionKey && (
              <span style={{ color: 'var(--pixel-text-dim)', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {agentSessionKey}
              </span>
            )}
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
            Fale com o agente...
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserBubble key={i} text={msg.text} />
          ) : (
            <AssistantBubble key={i} text={msg.text} streaming={msg.streaming} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          borderTop: '2px solid var(--pixel-border)',
          background: 'rgba(0,0,0,0.5)',
          flexShrink: 0,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={wsStatus === 'connected' ? 'Mensagem… (Shift+Enter para nova linha)' : 'Aguardando conexão...'}
          disabled={wsStatus !== 'connected'}
          autoFocus
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--pixel-text)',
            outline: 'none',
            fontSize: 16,
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
          onClick={() => handleSubmit()}
          style={{
            background: input.trim() ? 'var(--pixel-accent)' : 'transparent',
            border: 'none',
            borderLeft: '2px solid var(--pixel-border)',
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
          background: 'var(--pixel-accent)',
          color: '#fff',
          padding: '8px 12px',
          maxWidth: '80%',
          fontSize: 16,
          fontFamily: 'monospace',
          lineHeight: 1.5,
          borderRadius: '12px 12px 2px 12px',
          wordBreak: 'break-word',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ text, streaming }: { text: string; streaming?: boolean }) {
  const html = useMemo(() => marked.parse(text) as string, [text]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          background: 'var(--pixel-border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        🦞
      </div>
      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--pixel-border)',
          color: 'var(--pixel-text)',
          padding: '8px 12px',
          maxWidth: 'calc(100% - 40px)',
          fontSize: 16,
          fontFamily: 'monospace',
          lineHeight: 1.6,
          borderRadius: '2px 12px 12px 12px',
          wordBreak: 'break-word',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
              background: 'var(--pixel-accent)',
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
