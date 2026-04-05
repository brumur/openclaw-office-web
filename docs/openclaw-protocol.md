# OpenClaw Protocol

OpenClaw uses a custom WebSocket protocol (v3). There is no REST API for agent interaction — everything goes through the WebSocket connection.

---

## Connection Lifecycle

```
Client                          OpenClaw
  │                                │
  │──── WS connect ───────────────►│
  │                                │
  │◄─── event: connect.challenge ──│  { nonce: "abc123" }
  │                                │
  │──── req: connect ─────────────►│  (signed device payload)
  │                                │
  │◄─── res: hello-ok ─────────────│  { protocol: 3, server: { version } }
  │                                │
  │         (ready)                │
  │                                │
  │──── req: chat.send ───────────►│
  │◄─── res: { status: "started" } │
  │◄─── event: agent (streaming) ──│  (multiple)
  │◄─── event: agent (lifecycle) ──│  { phase: "end" }
```

---

## Device Authentication (Ed25519)

Authentication uses a signed challenge. The device identity (key pair + deviceId) is generated once and persisted.

### Identity file

Stored at `~/.pixel-office-identity.json` (path configurable via `OPENCLAW_IDENTITY_PATH`):

```json
{
  "version": 1,
  "deviceId": "<sha256 of public key>",
  "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...",
  "privateKeyPem": "-----BEGIN PRIVATE KEY-----\n...",
  "createdAtMs": 1700000000000
}
```

### Signature payload

```
v3|{deviceId}|{clientId}|{clientMode}|{role}|{scopes}|{signedAtMs}|{token}|{nonce}|{platform}|{deviceFamily}
```

- All fields joined by `|`
- `scopes` is comma-separated
- `platform` and `deviceFamily` must be **lowercase ASCII**
- Signed with Ed25519 private key, encoded as base64url (no padding, `-` and `_` instead of `+` and `/`)

### Connect request

```json
{
  "type": "req",
  "id": "<uuid>",
  "method": "connect",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": { "id": "cli", "version": "1.0.0", "platform": "node", "mode": "cli" },
    "caps": ["tool-events"],
    "commands": [],
    "role": "operator",
    "scopes": ["operator.admin", "operator.read", "operator.write", "operator.approvals"],
    "auth": { "token": "<admin-token>" },
    "device": {
      "id": "<deviceId>",
      "publicKey": "<base64url raw 32-byte Ed25519 public key>",
      "signature": "<base64url signature>",
      "signedAt": 1700000000000,
      "nonce": "<nonce from challenge>"
    }
  }
}
```

### Common auth errors

| Error | Cause | Fix |
|-------|-------|-----|
| `protocol mismatch, expectedProtocol: 3` | Used `minProtocol: 1` | Set `minProtocol: 3, maxProtocol: 3` |
| `cleared scopes` | Connected without device block | Always include `device` block |
| `PAIRING_REQUIRED` | Device not approved yet | Run `openclaw devices approve <deviceId>` on VPS |
| `missing scope: operator.write` | Wrong scope names | Use all 4 scopes listed above |

---

## Sending a Message

```json
{
  "type": "req",
  "id": "<uuid>",
  "method": "chat.send",
  "params": {
    "sessionKey": "main",
    "message": "Hello, agent!",
    "idempotencyKey": "<same uuid as id>"
  }
}
```

**Response:**
```json
{
  "type": "res",
  "id": "<uuid>",
  "ok": true,
  "payload": { "status": "started", "runId": "..." }
}
```

---

## Agent Events

All agent events have this envelope:

```json
{
  "type": "event",
  "event": "agent",
  "payload": {
    "stream": "<stream-type>",
    "data": { ... }
  }
}
```

### stream: "assistant"

Text output from the agent. **Cumulative** — each event contains the full response so far, not just the new delta.

```json
{
  "stream": "assistant",
  "data": { "text": "The full response text so far..." }
}
```

> **Important:** In the frontend, replace the current message, do not append:
> ```ts
> return [...prev.slice(0, -1), { ...last, text: msg.text }];
> ```

### stream: "tool"

Emitted when an agent calls a tool.

```json
{
  "stream": "tool",
  "data": {
    "phase": "start",        // "start" | "done" | "error"
    "name": "bash",          // tool name
    "toolCallId": "tc_abc"   // unique ID for this call
  }
}
```

Tool names seen in practice: `bash`, `exec`, `read_file`, `write_file`, `edit`, `web_search`, `browser`, `navigate`, `screenshot`, `memory_search`, `list_dir`, etc.

### stream: "lifecycle"

Marks the start and end of an agent run.

```json
{
  "stream": "lifecycle",
  "data": { "phase": "start" }   // or "end"
}
```

On `phase: "end"`, broadcast `agentToolsClear` before `agentStatus: idle` to clear any stuck tool bubbles.

---

## Browser-facing Events (server.js → browser)

These are what `server.js` broadcasts to browser WebSocket clients after translating OpenClaw events:

| type | payload | description |
|------|---------|-------------|
| `agentCreated` | `{ id }` | New agent registered |
| `agentStatus` | `{ id, status: 'idle'\|'active' }` | Agent state change |
| `agentOutput` | `{ id, text }` | Cumulative assistant text |
| `agentToolStart` | `{ id, toolId, toolName, status }` | Tool call started |
| `agentToolDone` | `{ id, toolId }` | Tool call finished |
| `agentToolsClear` | `{ id }` | Clear all tools (run ended) |
| `wsConnectionStatus` | `{ status: 'connecting'\|'connected'\|'disconnected' }` | Backend WS health |

---

## Tool Name → UI Label Mapping

Defined in `server.js` as `TOOL_UI_MAP`:

| Tool names | UI label | Status text |
|-----------|----------|-------------|
| `web_search`, `search`, `brave`, `perplexity` | Search | Pesquisando... |
| `read`, `read_file` | Reading | Lendo arquivos... |
| `list_dir` | Reading | Explorando... |
| `exec`, `bash`, `run`, `shell` | Terminal | Rodando comando... |
| `write`, `write_file` | Writing | Escrevendo código... |
| `edit`, `patch` | Writing | Editando... |
| `browser`, `navigate` | Browser | Navegando... |
| `screenshot` | Browser | Capturando tela... |

Unknown tools fall back to `{ name: toolName, status: "${toolName}..." }`.

---

## Multi-Session (Pending)

Currently `sessionKey: "main"` is hardcoded and all events route to `agentId = 1`. OpenClaw likely includes a session identifier in agent event payloads.

To investigate, check the `[Agent event]` logs printed by `server.js` when `stream === 'lifecycle'` fires. Look for a field like `sessionKey`, `sessionId`, or `agentId` in the payload. Once confirmed, each unique session key can map to a separate character in the office.
