# Frontend

The frontend is a React + TypeScript app built with Vite. It renders a pixel-art office on an HTML canvas, with React components overlaid for the chat panel, toolbars, and speech bubbles.

---

## Entry Points

### `src/main.tsx`

Bootstraps the app. In browser mode, calls `initBrowserMock()` before `createRoot()` to preload all sprite assets (characters, floors, walls, furniture).

### `src/browserMock.ts`

**Browser-only.** Responsible for:
1. Fetching and decoding all PNG sprite assets
2. Dispatching the initial `postMessage` events that the game engine needs (characters, floors, walls, furniture, layout, settings)
3. Checking `/api/auth/check` before opening the WebSocket
4. Establishing the WebSocket connection to `server.js` on the same host via `/ws`
5. Forwarding WS messages into the message bus via `window.dispatchEvent`
6. Auto-reconnecting every 5s on disconnect
7. Dispatching `wsConnectionStatus` events (connecting / connected / disconnected)

Asset loading has two modes:
- **Dev mode** — tries `assets/decoded/*.json` first (pre-decoded, fast). Vite middleware generates these.
- **Production / fallback** — decodes PNGs via `createImageBitmap` + `<canvas>` at runtime.

---

## Components

### `App.tsx`

Root component. Owns:
- `messages: ChatMessage[]` — chat history, loaded from localStorage on mount, persisted on change (skipped during streaming)
- `isTerminalOpen: boolean` — chat panel visibility
- `wsStatus: WsStatus` — connection state (`'connecting' | 'connected' | 'disconnected'`)
- All `useExtensionMessages` output (agents, tools, statuses, layout state)

Key event listeners on `window`:
- `agentOutput` → replace last streaming message (cumulative text)
- `agentStatus: idle` → mark last message as `streaming: false`
- `wsConnectionStatus` → update `wsStatus`

### `src/components/TerminalPanel.tsx`

Chat sidebar overlay. Props:
```ts
{
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
  wsStatus: WsStatus;
}
```

Features:
- `UserBubble` — right-aligned, accent color
- `AssistantBubble` — left-aligned with avatar, markdown via `marked`, streaming cursor block
- Connection dot in header (green/yellow pulsing/red)
- Banner when offline/connecting
- Input disabled + placeholder change when not connected
- Auto-scroll to bottom on new messages
- Safe fallback color/name when no chat tab is selected yet

### `src/office/components/OfficeCanvas.tsx`

The pixel canvas. Renders at ~60fps via `requestAnimationFrame`. Reads from `OfficeState` imperatively (no React re-renders per frame). Handles:
- Floor tiles, wall tiles, furniture sprites
- Character animations (walking, idle, directional)
- Edit mode cursor and selection highlight
- Zoom and pan

### `src/office/components/ToolOverlay.tsx`

Renders speech bubbles above characters showing active tool calls. Uses `containerRef.getBoundingClientRect()` to convert tile → screen coordinates. Shows on hover or when `alwaysShowOverlay` is enabled.

---

## Hooks

### `useExtensionMessages`

The main event processor. Listens to `window.addEventListener('message')` and maintains:
- `agents` — list of active agent IDs
- `agentTools` — `Record<agentId, ToolActivity[]>`
- `agentStatuses` — `Record<agentId, 'idle' | 'active'>`
- `subagentCharacters` / `subagentTools` — for nested agents
- `layoutReady`, `loadedAssets`, `workspaceFolders` etc.

Residents are handled specially: fixed agents can appear immediately even while the OpenClaw bridge is still connecting, because the backend now emits them independently from OpenClaw readiness.

Also handles: character sprite loading, floor/wall tile loading, furniture catalog, layout loading/saving, sound, settings.

### `useEditorActions`

All layout editor logic: tile painting, furniture placement, drag-move, rotate, undo/redo, save/reset.

### `useEditorKeyboard`

Keyboard shortcuts for edit mode (Delete, R to rotate, Ctrl+Z/Y, etc.).

---

## Types

### `ChatMessage`
```ts
type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
};
```

### `WsStatus`
```ts
type WsStatus = 'connecting' | 'connected' | 'disconnected';
```

### `ToolActivity`
```ts
interface ToolActivity {
  toolCallId: string;
  toolName: string;     // UI label (e.g. "Terminal")
  status: string;       // Status text (e.g. "Rodando comando...")
  startedAt: number;
}
```

---

## CSS Variables

Defined in `src/index.css`. Key variables:

| Variable | Usage |
|----------|-------|
| `--pixel-accent` | Primary accent color (buttons, user bubbles, streaming cursor) |
| `--pixel-border` | Panel borders, avatar background |
| `--pixel-bg` | Panel backgrounds |
| `--pixel-text` | Primary text |
| `--pixel-text-dim` | Secondary/muted text |
| `--pixel-vignette` | Canvas edge vignette gradient |
| `--pixel-shadow` | Box shadow for panels |

### `.md-content` Markdown styles

Applied inside `AssistantBubble` to style markdown output:
- `p`, `strong`, `em` — basic prose
- `h1`–`h3` — headers with accent color
- `ul`, `ol`, `li` — lists with indentation
- `code` — inline code with background
- `pre > code` — code blocks
- `blockquote` — left border accent
- `a` — links in accent color
- `hr` — horizontal rules

---

## Asset Loading Order

Assets must be dispatched in this exact order (enforced by `dispatchMockMessages`):

1. `characterSpritesLoaded` — `{ characters: CharacterDirectionSprites[] }`
2. `floorTilesLoaded` — `{ sprites: string[][][] }`
3. `wallTilesLoaded` — `{ sets: string[][][][] }`
4. `furnitureAssetsLoaded` — `{ catalog: CatalogEntry[], sprites: Record<string, string[][]> }`
5. `layoutLoaded` — `{ layout }`
6. `settingsLoaded` — `{ soundEnabled, extensionVersion, lastSeenVersion }`

Sprites are `string[][]` — a 2D array of hex color strings (e.g. `"#FF5500"`) or empty string for transparent pixels.
