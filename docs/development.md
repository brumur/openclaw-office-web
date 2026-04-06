# Development Guide

---

## Running Locally

You need two processes:

```bash
# 1. Backend proxy (OpenClaw bridge)
node server.js

# 2. Frontend dev server
npm run dev
```

Open `http://localhost:8090`.

In production/runtime, `server.js` serves both HTTP and `/ws` on port `3000`. On Jarvis, the validated local publish was `7080 -> 3000`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_URL` | `http://185.205.244.235:18789` | OpenClaw gateway URL |
| `OPENCLAW_TOKEN` | `admin-token-123` | Admin token |
| `OPENCLAW_IDENTITY_PATH` | `~/.pixel-office-identity.json` | Device identity file path |

Override inline or via `.env`:
```bash
OPENCLAW_URL=http://my-vps:18789 OPENCLAW_TOKEN=my-token node server.js
```

Runtime note from the Jarvis deploy: in a Linux container, `OPENCLAW_URL=http://host.docker.internal:18789` failed with `ENOTFOUND`. The working value was `http://172.17.0.1:18789`.

---

## First-Time Device Pairing

On first run, `server.js` generates a new Ed25519 key pair and saves it to `~/.pixel-office-identity.json`. After network connectivity is fixed, the next expected blocker is `PAIRING_REQUIRED` / `not-paired` until you approve the device on the server.

```bash
# On your VPS
openclaw devices list          # find the pending deviceId
openclaw devices approve <id>
```

The `deviceId` is also printed in the server logs as `[Identity] Generated new device abc123...`.

You only need to do this once per machine. If you delete the identity file, or if a redeploy/container rebuild loses it, a new device will be created and will need approval again. In other words: pairing persistence depends on identity persistence.

---

## Common Issues

### Port 3000 already in use

```bash
lsof -ti:3000 | xargs kill -9
```

### Frontend tries `/ws` before login

This was a real issue in browser mode. The WebSocket upgrade requires a valid session cookie, so connecting before login caused 401/reconnect noise.

Fix applied in `src/browserMock.ts`:
- check `/api/auth/check` first
- only open `/ws` after auth is valid
- keep UI in `disconnected` while unauthenticated

### Resident characters not appearing while bridge is still connecting

This was another real issue: if the browser connected before the OpenClaw bridge was ready, the office could render empty.

Fix applied in `server.js`:
- residents are sent immediately on browser WS connect
- `wsConnectionStatus` is sent independently from resident creation
- residents are re-announced after `hello-ok`

### Agent character not appearing

The character appears when `agentCreated` is broadcast. Residents are now sent immediately to each browser client, even while the OpenClaw bridge is still connecting. For non-resident sessions, check the server logs for OpenClaw events and `sessionKey` mapping.

### Tool bubble stuck on character

This was a known bug — fixed by broadcasting `agentToolsClear` in the `lifecycle: end` handler before `agentStatus: idle`. If it happens again, check `server.js` around the lifecycle handler.

### Chat not opening

`chatOpen` in `App.tsx` requires `agents.length > 0 && !isDebugMode`. If no agents are registered, the panel won't show. Reload the page — `agentCreated` is sent on each new connection.

### Streaming text looks wrong / repeated

OpenClaw sends **cumulative** text in each `assistant` event — the full response so far, not a delta. The frontend must **replace** the last message, not append:

```ts
// Correct
return [...prev.slice(0, -1), { ...last, text: msg.text }];

// Wrong — causes text duplication
return [...prev.slice(0, -1), { ...last, text: last.text + msg.text }];
```

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. In production, `server.js` already serves the built SPA and `/ws` from the same process/port when `NODE_ENV=production`.

For the runtime validated on Jarvis, expose host `7080` to app/container `3000`.

---

## Debugging

### Enable debug mode in the UI

Click the bug icon in the bottom toolbar. Shows a `DebugView` panel with all agent IDs, statuses, and active tools instead of the pixel office.

### Log all OpenClaw events

The lifecycle events are already logged. To log everything:

```js
// server.js — in the openclawWs.on('message') handler
console.log('[OpenClaw raw]', JSON.stringify(msg).slice(0, 200));
```

### Inspect the message bus

In the browser console:

```js
window.addEventListener('message', e => console.log('[msg]', e.data));
```

### Check localStorage chat history

```js
JSON.parse(localStorage.getItem('pixel-office-chat-history'))
```

Clear it with:
```js
localStorage.removeItem('pixel-office-chat-history')
```

---

## Code Style

- TypeScript strict mode
- ESLint with `simple-import-sort` — imports must be sorted
- No default exports except in `App.tsx` and `main.tsx`
- React components use inline styles (no CSS modules) — consistent with the original pixel-agents codebase
- Game state lives outside React; canvas renders imperatively

---

## Adding a New Tool to the UI Map

Edit `TOOL_UI_MAP` in `server.js`:

```js
const TOOL_UI_MAP = {
  // ...existing entries...
  my_tool: { name: 'My Tool', status: 'Doing thing...' },
};
```

The `name` shows in the speech bubble header; `status` shows while the tool is active.

---

## Adding a New Event Type

1. Broadcast from `server.js`:
   ```js
   broadcast({ type: 'myNewEvent', id: currentAgentId, data: '...' });
   ```

2. Handle in `App.tsx` or `useExtensionMessages.ts`:
   ```ts
   if (msg?.type === 'myNewEvent') {
     // update state
   }
   ```

3. If it affects the game state, update `OfficeState` directly (no React state needed for canvas-only changes).
