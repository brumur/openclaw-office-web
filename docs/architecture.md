# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                  │
│                                                           │
│  ┌──────────────┐   window.postMessage   ┌────────────┐  │
│  │  React App   │ ◄────────────────────► │ browserMock│  │
│  │  (App.tsx)   │                        │    .ts     │  │
│  └──────┬───────┘                        └─────┬──────┘  │
│         │ useState / hooks                     │ WS      │
│  ┌──────▼───────┐                             │         │
│  │ OfficeCanvas │                             │         │
│  │ ToolOverlay  │                             │         │
│  │ TerminalPanel│                             │         │
│  └──────────────┘                             │         │
└───────────────────────────────────────────────┼─────────┘
                                                │ http://localhost:3000/ws
┌───────────────────────────────────────────────┼─────────┐
│  server.js (Node)                             │         │
│                                               │         │
│  Single HTTP server (port 3000, also serves /ws) ◄─────┘         │
│         │                                               │
│  broadcast() → all browser clients                      │
│         │                                               │
│  openclawWs ──────────────────────────────────────────► │
│                                               ws://VPS:18789
└─────────────────────────────────────────────────────────┘
                                                │
                                     ┌──────────▼──────────┐
                                     │  OpenClaw Gateway    │
                                     │  (your VPS)          │
                                     │  AI agents running   │
                                     └─────────────────────┘
```

---

## Message Bus

The project inherits VS Code's `window.postMessage` message bus from the original `pixel-agents` extension. This allowed reusing all the existing hooks and game logic without modification.

**Flow:**
1. OpenClaw sends a WS event to `server.js`
2. `server.js` broadcasts a JSON message to all browser WebSocket clients
3. `browserMock.ts` receives it and calls `window.dispatchEvent(new MessageEvent('message', { data }))`
4. `useExtensionMessages.ts` and `App.tsx` listen via `window.addEventListener('message', handler)`

A practical runtime detail from Jarvis: the externally exposed port was `7080`, forwarded to the app on `3000`.

**Sending user input:**
1. `TerminalPanel` calls `onSend(text)` → `App.tsx` calls `window.postMessage({ type: 'sendInput', text }, '*')`
2. `browserMock.ts` listens for `sendInput` and forwards it to `server.js` via WebSocket
3. `server.js` calls `openclawSend({ type: 'req', method: 'chat.send', ... })`

---

## State Management

### Game state (outside React)

`OfficeState` lives as a module-level ref (`officeStateRef`) and is updated imperatively by `useExtensionMessages`. This is intentional — the canvas renders at ~60fps via `requestAnimationFrame` and doesn't need React re-renders for every frame.

```ts
const officeStateRef = { current: null as OfficeState | null };
function getOfficeState(): OfficeState { ... }
```

### React state

| State | Where | Description |
|-------|-------|-------------|
| `messages` | `App.tsx` | Chat history (`ChatMessage[]`) |
| `isTerminalOpen` | `App.tsx` | Chat panel visibility |
| `wsStatus` | `App.tsx` | WS connection state |
| `agents` | `useExtensionMessages` | Active agent IDs |
| `agentTools` | `useExtensionMessages` | Tool activity per agent |
| `agentStatuses` | `useExtensionMessages` | idle/active per agent |

---

## Layout

The chat panel is a **position: absolute overlay**, not a flex sibling. This is critical for bubble positioning:

```
<div ref={containerRef} style="position:relative; width:100%; height:100%">
  <div style="position:absolute; inset:0">   ← full-size game area
    <OfficeCanvas />
    <ToolOverlay containerRef={containerRef} />
  </div>
  <TerminalPanel style="position:absolute; top:0; right:0; width:380px" />
</div>
```

`ToolOverlay` uses `containerRef.getBoundingClientRect()` to convert tile coordinates to screen coordinates for bubble placement. If the chat panel were a flex sibling, the container would shrink and the bubbles would be offset.

---

## Backend Proxy

`server.js` acts as a bridge between the browser (which can't implement OpenClaw's device auth) and the OpenClaw gateway.

**Responsibilities:**
- Generate/persist Ed25519 device identity
- Handle challenge/response authentication
- Maintain persistent WS connection to OpenClaw (auto-reconnect every 5s)
- Translate OpenClaw events → browser-friendly messages
- Map tool names to UI labels/status strings
- Track and clear active tool state
- Announce resident agents immediately, even before the OpenClaw bridge reaches `hello-ok`
- Expose bridge health separately via `wsConnectionStatus`

**Single agent limitation (current):**
All events are routed to `currentAgentId = 1`. Multi-session support requires mapping OpenClaw session keys to agent IDs. See [`docs/openclaw-protocol.md`](openclaw-protocol.md).
