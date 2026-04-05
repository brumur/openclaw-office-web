# Pixel Office Web

A pixel-art office in your browser where animated characters represent real AI agents running on an [OpenClaw](https://openclaw.ai) gateway. Watch your agents work in real time — tool calls appear as speech bubbles, chat history persists, and each session can become its own character.

![Screenshot](public/Screenshot.jpg)

---

## Features

- **Live agent visualization** — pixel characters walk, idle, and react as agents run
- **Real-time tool bubbles** — tool calls (bash, search, browser, write…) pop up above the character while active
- **Chat panel** — markdown-rendered conversation with streaming cursor, persisted in localStorage
- **Connection indicator** — green/yellow/red dot shows backend status; input disabled when offline
- **Auto-reconnect** — frontend and backend both reconnect automatically if the gateway goes down
- **Editable office layout** — drag, rotate, and place furniture; undo/redo; save to JSON

---

## Architecture

```
Browser (React + Canvas)
    ↕  WebSocket  ws://localhost:3002
server.js  (Node / Express)
    ↕  WebSocket  ws://<your-openclaw-host>
OpenClaw gateway  (your VPS)
```

| Port | Service |
|------|---------|
| 5173 | Vite dev server (frontend) |
| 3000 | Express HTTP (`/api/spawn-agent`) |
| 3002 | WebSocket bridge (browser ↔ backend) |

See [`docs/architecture.md`](docs/architecture.md) for a deeper breakdown.

---

## Prerequisites

- **Node.js** 18+
- An **OpenClaw** instance with operator access
- Your OpenClaw URL and admin token

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

Create a `.env` file in the project root, or just export the variables:

```bash
OPENCLAW_URL=http://your-vps:18789
OPENCLAW_TOKEN=your-admin-token
```

Defaults are `http://185.205.244.235:18789` and `admin-token-123` (change these for production).

### 3. Approve the device on first run

On first start the backend generates an Ed25519 key pair stored at `~/.pixel-office-identity.json` and attempts to connect. The device will be in `PAIRING_REQUIRED` state until approved on the server:

```bash
# On your VPS
openclaw devices list
openclaw devices approve <deviceId>
```

You only need to do this once per machine.

### 4. Run

Open two terminals:

```bash
# Terminal 1 — backend proxy
node server.js

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:5173`.

---

## Usage

- **Chat** — click the agent character to open the chat panel, type a message and press Enter
- **Close / reopen** — the ✕ button closes the panel; click the character again to reopen
- **Tool activity** — hover over a character to see which tool is currently running
- **Edit layout** — click the edit button in the bottom toolbar to rearrange furniture

---

## Project Structure

```
pixel-office-web/
├── server.js                  # Node proxy: OpenClaw auth, WS bridge, tool events
├── src/
│   ├── App.tsx                # Root component: chat state, ws status, layout
│   ├── browserMock.ts         # WS client, event dispatch, auto-reconnect
│   ├── components/
│   │   ├── TerminalPanel.tsx  # Chat panel (markdown, streaming, connection dot)
│   │   └── BottomToolbar.tsx  # Edit mode, debug toggle
│   ├── hooks/
│   │   ├── useExtensionMessages.ts  # All agent event processing
│   │   └── useEditorActions.ts      # Layout editor logic
│   └── office/
│       ├── components/
│       │   ├── OfficeCanvas.tsx     # Pixel canvas renderer
│       │   └── ToolOverlay.tsx      # Speech bubbles over characters
│       └── engine/
│           └── officeState.ts       # Game state (outside React)
├── public/assets/             # Sprites, floors, walls, furniture
├── docs/                      # Detailed documentation
└── AGENTS.md                  # Technical reference & learnings
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [`docs/architecture.md`](docs/architecture.md) | System design, message bus, event flow |
| [`docs/openclaw-protocol.md`](docs/openclaw-protocol.md) | WebSocket protocol, auth, all event types |
| [`docs/frontend.md`](docs/frontend.md) | React components, hooks, canvas rendering |
| [`docs/development.md`](docs/development.md) | Dev workflow, debugging, common issues |
| [`AGENTS.md`](AGENTS.md) | Bugs fixed, decisions, pending work |

---

## Roadmap

- [ ] Multi-session support — one character per active OpenClaw session
- [ ] Reopen chat button in bottom toolbar
- [ ] Clear conversation / new session button
- [ ] Session labels on character name tags
- [ ] Dark/light theme toggle

---

## License

MIT
