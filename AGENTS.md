# Pixel Office Web — AGENTS.md

Documentação técnica do projeto: aprendizados, arquitetura, decisões e pendências.

---

## O que é este projeto

Fork do **pixel-agents** (extensão VS Code) adaptado como web app standalone que conecta diretamente ao **OpenClaw** — um gateway de agentes AI rodando numa VPS.

O resultado é um escritório pixel-art no browser onde personagens animados representam agentes AI reais, com chat integrado e indicadores visuais de ferramentas em uso.

---

## Infraestrutura

```
Browser (React + Canvas)
    ↕ WebSocket ws://localhost:3002
server.js (Node/Express)
    ↕ WebSocket ws://185.205.244.235:18789  (OpenClaw gateway)
```

- **Porta 3000** — Express HTTP (REST: `/api/spawn-agent`)
- **Porta 3002** — WebSocket browser-facing (eventos para o frontend)
- **VPS** — OpenClaw em `http://185.205.244.235:18789`, token `admin-token-123`

---

## Protocolo OpenClaw (WebSocket, Protocol v3)

### Autenticação — Device Auth Ed25519

O OpenClaw exige autenticação por dispositivo com par de chaves Ed25519. O fluxo é:

1. Servidor recebe `event: connect.challenge` com `payload.nonce`
2. Monta string de assinatura:
   ```
   v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes,csv}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}
   ```
3. Assina com Ed25519 (private key), encode base64url
4. Envia `req: connect` com device block completo
5. Recebe `res: hello-ok` → conexão estabelecida

**Identidade persistida em** `~/.pixel-office-identity.json` (gerada automaticamente na primeira vez).

**Scopes necessários:** `operator.admin, operator.read, operator.write, operator.approvals`

**Erros encontrados durante setup:**
- `protocol mismatch` → usar `minProtocol: 3, maxProtocol: 3` (não 1)
- `cleared scopes` → conectar só com token sem device não concede scopes
- `PAIRING_REQUIRED` → device precisa ser aprovado: `openclaw devices approve <deviceId>`
- `missing scope: operator.write` → scopes errados; usar os 4 acima

### Enviando mensagens ao agente

```js
openclawSend({ type: 'req', id: uuid, method: 'chat.send', params: {
  sessionKey: 'main',
  message: text,
  idempotencyKey: uuid,
}});
```

### Eventos recebidos do agente

```js
// Texto do assistente (CUMULATIVO — cada evento traz o texto completo, não delta)
{ type: 'event', event: 'agent', payload: { stream: 'assistant', data: { text: '...' } } }

// Tool events
{ type: 'event', event: 'agent', payload: { stream: 'tool', data: { phase: 'start'|'done'|'error', name: 'bash', toolCallId: '...' } } }

// Lifecycle
{ type: 'event', event: 'agent', payload: { stream: 'lifecycle', data: { phase: 'start'|'end' } } }

// Ack de chat.send
{ type: 'res', payload: { status: 'started', runId: '...' } }
```

**Importante:** O texto do assistente é CUMULATIVO. Cada evento substitui o anterior, não acumula. No frontend: replace, não append.

---

## Arquitetura Frontend

### Message Bus

Herança da extensão VS Code: tudo via `window.postMessage` / `window.addEventListener('message')`.

- `browserMock.ts` recebe eventos do WS e faz `dispatch(data)` = `window.dispatchEvent(new MessageEvent('message', { data }))`
- `App.tsx` e hooks escutam via `window.addEventListener('message', handler)`
- Para enviar ao backend: `window.postMessage({ type: 'sendInput', text }, '*')`

### Tipos de mensagem relevantes (browser → App)

| type | descrição |
|------|-----------|
| `agentCreated` | novo agente anunciado (id) |
| `agentStatus` | `status: 'idle' \| 'active'` |
| `agentOutput` | texto do assistente (cumulativo) |
| `agentToolStart` | ferramenta iniciada (toolId, toolName, status) |
| `agentToolDone` | ferramenta concluída (toolId) |
| `agentToolsClear` | limpa todas as tools do agente (lifecycle end) |
| `wsConnectionStatus` | `status: 'connecting' \| 'connected' \| 'disconnected'` |

### Chat (TerminalPanel)

- `ChatMessage[]` — `{ role: 'user' \| 'assistant', text: string, streaming?: boolean }`
- Persistido em `localStorage` (key: `pixel-office-chat-history`)
- Markdown renderizado via `marked` com `dangerouslySetInnerHTML`
- Streaming cursor: span piscando enquanto `streaming: true`
- `agentStatus: idle` → marca última mensagem como `streaming: false`

### Layout

Chat como overlay absoluto (não empurra o canvas):
```
<div style="position: relative; width: 100%; height: 100%">
  <div style="position: absolute; inset: 0">  ← game canvas
  <TerminalPanel style="position: absolute; top:0; right:0; width:380px; height:100%">
```

Isso garante que o `containerRef` (usado para posicionar os balões sobre os personagens) sempre aponta para a área completa do canvas.

### Indicador de conexão

`wsStatus: 'connecting' | 'connected' | 'disconnected'`
- Dot colorido no header do TerminalPanel (verde/amarelo/vermelho)
- Banner no chat quando offline/conectando
- Input desabilitado quando não conectado
- Reconexão automática a cada 5s no `browserMock.ts`

### Tool name → UI label mapping

```js
// server.js — TOOL_UI_MAP
web_search → Search / Pesquisando...
exec, bash, run, shell → Terminal / Rodando comando...
read, read_file → Reading / Lendo arquivos...
write, write_file, edit, patch → Writing / Escrevendo...
browser, navigate, screenshot → Browser / Navegando...
// etc.
```

---

## Bugs corrigidos

| Problema | Causa | Fix |
|----------|-------|-----|
| Texto duplicado no streaming | OpenClaw envia texto cumulativo, estava fazendo append | Replace: `[...prev.slice(0,-1), {...last, text: msg.text}]` |
| Balão fora da cabeça do personagem | `containerRef` cobria área incluindo 380px do chat | Chat virou overlay, `containerRef` = canvas completo |
| Tool bubble presa após agente terminar | `lifecycle: end` não limpava tools ativas | Adicionar `agentToolsClear` antes de `agentStatus: idle` |
| `EADDRINUSE: 3002` | Processo anterior não encerrado | `lsof -ti:3002 \| xargs kill -9` |

---

## Pendências

### 1. Multi-session (prioritário)
Hoje tudo vai para `currentAgentId = 1` com `sessionKey: "main"`. O OpenClaw pode ter múltiplas sessões ativas simultaneamente (ex: agente WhatsApp + agente main).

**Para implementar:**
- Verificar se os eventos `agent` incluem `sessionKey` no payload (log ativado em `server.js` no `lifecycle`)
- Mapear `sessionKey → agentId` dinamicamente
- Criar `agentCreated` por sessão
- Rotear eventos para o agentId correto
- Listar sessões ativas no momento da conexão

### 2. Botão para reabrir chat
Quando o usuário fecha o painel (✕), só pode reabrir clicando no personagem. O botão "Open Claude" na barra inferior chama `vscode.postMessage` que não faz nada no browser. Deveria chamar `setIsTerminalOpen(true)`.

### 3. Limpar histórico
localStorage acumula para sempre. Adicionar botão de "nova conversa" que limpa o histórico local (não reseta a sessão no OpenClaw).

### 4. Indicador de qual agente está respondendo
Com multi-session, precisará de alguma forma de identificar de qual agente veio cada mensagem no chat.

---

## Comandos úteis

```bash
# Rodar o projeto
npm run dev          # frontend Vite (porta 5173)
node server.js       # backend proxy (portas 3000 + 3002)

# Se porta 3002 estiver em uso
lsof -ti:3002 | xargs kill -9

# Aprovar device no OpenClaw (VPS)
openclaw devices list
openclaw devices approve <deviceId>

# Variáveis de ambiente opcionais
OPENCLAW_URL=http://185.205.244.235:18789
OPENCLAW_TOKEN=admin-token-123
OPENCLAW_IDENTITY_PATH=~/.pixel-office-identity.json
```

---

## Arquivos principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `server.js` | Proxy Node: auth OpenClaw, WS bridge, tool events |
| `src/App.tsx` | Root React: estado do chat, wsStatus, layout |
| `src/components/TerminalPanel.tsx` | Painel de chat com markdown e indicador de conexão |
| `src/browserMock.ts` | WS client browser, dispatch de eventos, reconexão |
| `src/hooks/useExtensionMessages.ts` | Processa todos os eventos de agentes (herdado do pixel-agents) |
| `src/office/components/ToolOverlay.tsx` | Balões de ferramenta sobre os personagens |
