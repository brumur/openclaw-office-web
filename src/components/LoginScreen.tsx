import { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        setError('Usuário ou senha incorretos');
      }
    } catch {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--pixel-canvas-bg, #1a1a2e)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--pixel-font, monospace)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: 280,
        }}
      >
        {/* Logo / title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 6 }}>🏢</div>
          <div
            style={{
              fontSize: 28,
              color: 'var(--pixel-text, #e2e8f0)',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Pixel Office
          </div>
          <div style={{ fontSize: 16, color: 'var(--pixel-text-dim, #64748b)', marginTop: 4 }}>
            sign in to continue
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <input
            type="text"
            placeholder="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                fontSize: 16,
                color: '#f87171',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                padding: '4px 8px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              marginTop: 4,
              padding: '8px 0',
              fontSize: 20,
              background: loading ? 'var(--pixel-btn-bg, #2d3748)' : 'var(--pixel-border-light, #5a8cff)',
              color: 'var(--pixel-bg, #1e1e2e)',
              border: 'none',
              borderRadius: 0,
              cursor: loading || !username || !password ? 'default' : 'pointer',
              opacity: !username || !password ? 0.5 : 1,
              letterSpacing: 1,
              fontFamily: 'inherit',
              textTransform: 'uppercase',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 18,
  background: 'var(--pixel-btn-bg, #2d3748)',
  color: 'var(--pixel-text, #e2e8f0)',
  border: '2px solid var(--pixel-border, #4a5568)',
  borderRadius: 0,
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};
