import React, { useState, useEffect, useRef } from 'react';

interface TerminalPanelProps {
  lines: string[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export function TerminalPanel({ lines, onSend, onClose }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 380,
        height: 500,
        background: 'rgba(20, 20, 30, 0.85)',
        border: '2px solid var(--pixel-accent)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100, // On top of everything
        boxShadow: 'var(--pixel-shadow)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--pixel-accent)',
          color: '#fff',
          padding: '4px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '20px',
        }}
      >
        <span>Gemini CLI</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--pixel-bg)',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          X
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          color: 'var(--pixel-text-dim)',
          fontSize: '18px',
          fontFamily: 'monospace',
        }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ wordBreak: 'break-all' }}>
            {l}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          borderTop: '2px solid var(--pixel-border)',
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <span style={{ padding: '8px', color: 'var(--pixel-green)', fontSize: '20px' }}>&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your command..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--pixel-text)',
            outline: 'none',
            fontSize: '18px',
            fontFamily: 'monospace',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--pixel-btn-bg)',
            border: 'none',
            borderLeft: '2px solid var(--pixel-border)',
            color: 'var(--pixel-text)',
            cursor: 'pointer',
            padding: '0 12px',
            fontSize: '18px',
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
