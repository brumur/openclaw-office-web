import { useEffect, useRef, useState } from 'react';

import type { ChatMessage } from '../App.js';

interface TerminalPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export function TerminalPanel({ messages, onSend, onClose }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      onSend(trimmed);
      setInput('');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>🦞</span>
          <span style={{ color: 'var(--pixel-accent)', fontSize: 20, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 1 }}>
            OpenClaw
          </span>
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
        {messages.length === 0 && (
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
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          borderTop: '2px solid var(--pixel-border)',
          background: 'rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Mensagem..."
          autoFocus
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--pixel-text)',
            outline: 'none',
            fontSize: 17,
            fontFamily: 'monospace',
            padding: '10px 12px',
          }}
        />
        <button
          type="submit"
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
          }}
        >
          ↵
        </button>
      </form>
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
          whiteSpace: 'pre-wrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {text}
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
