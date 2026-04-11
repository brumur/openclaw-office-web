import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import crypto from 'crypto';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const OPENCLAW_WS_URL = (process.env.OPENCLAW_URL ?? 'http://185.205.244.235:18789').replace(/^http/, 'ws');
const OPENCLAW_TOKEN  = process.env.OPENCLAW_TOKEN ?? 'admin-token-123';
const IDENTITY_PATH   = process.env.OPENCLAW_IDENTITY_PATH ?? path.join(os.homedir(), '.pixel-office-identity.json');
const SCOPES          = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals'];

// ── Auth / session store ──────────────────────────────────────────────────────

const PIXEL_USER        = process.env.PIXEL_USER ?? 'admin';
const PIXEL_PASS        = process.env.PIXEL_PASS ?? 'pixel123';
const SESSION_TTL_MS    = 24 * 60 * 60 * 1000; // 24 h

if (!process.env.PIXEL_USER || !process.env.PIXEL_PASS) {
  console.warn('[Auth] PIXEL_USER / PIXEL_PASS not set — using default credentials (admin/pixel123). Set them in your environment for security.');
}

/** token → { createdAt } */
const sessions = new Map();

function parseCookieToken(cookieHeader) {
  const match = (cookieHeader ?? '').split(';').map(s => s.trim()).find(s => s.startsWith('pixel_session='));
  return match ? match.slice('pixel_session='.length) : null;
}

function isValidSession(cookieHeader) {
  const token = parseCookieToken(cookieHeader);
  if (!token) return false;
  const session = sessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function authMiddleware(req, res, next) {
  if (isValidSession(req.headers.cookie)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function sessionCookie(token) {
  return `pixel_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

// ── Device identity (Ed25519 key pair, persisted) ─────────────────────────────

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function base64UrlEncode(buf) {
  return buf.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function derivePublicKeyRaw(publicKeyPem) {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: 'spki', format: 'der' });
  if (spki.length === ED25519_SPKI_PREFIX.length + 32 &&
      spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function loadOrCreateIdentity() {
  try {
    if (fs.existsSync(IDENTITY_PATH)) {
      const stored = JSON.parse(fs.readFileSync(IDENTITY_PATH, 'utf8'));
      if (stored?.version === 1 && stored.deviceId && stored.publicKeyPem && stored.privateKeyPem) {
        console.log(`[Identity] Loaded device ${stored.deviceId.slice(0, 12)}...`);
        return stored;
      }
    }
  } catch {}

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const deviceId = crypto.createHash('sha256').update(derivePublicKeyRaw(publicKeyPem)).digest('hex');
  const identity = { version: 1, deviceId, publicKeyPem, privateKeyPem, createdAtMs: Date.now() };
  fs.writeFileSync(IDENTITY_PATH, JSON.stringify(identity, null, 2), { mode: 0o600 });
  console.log(`[Identity] Generated new device ${deviceId.slice(0, 12)}...`);
  return identity;
}

function buildDeviceAuthPayloadV3({ deviceId, clientId, clientMode, role, scopes, signedAtMs, token, nonce, platform, deviceFamily }) {
  const toLowerAscii = (s) => (s ?? '').replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
  return [
    'v3', deviceId, clientId, clientMode, role,
    scopes.join(','), String(signedAtMs), token ?? '',
    nonce, toLowerAscii(platform ?? ''), toLowerAscii(deviceFamily ?? ''),
  ].join('|');
}

// ── Express / WebSocket server (browser-facing) ───────────────────────────────

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
const port = parseInt(process.env.PORT ?? '3000', 10);

// Single HTTP server — handles both REST and WebSocket (/ws path)
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws') { socket.destroy(); return; }
  if (!isValidSession(req.headers.cookie)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

let clients = [];
let currentAgentId = 1;
let bridgeStatus = 'connecting';

// ── Resident session definitions ──────────────────────────────────────────────
// Known agent workspaces with fixed IDs for session routing.
// `alwaysAnnounce: true` means the agent is announced as online immediately
// (e.g. Jarvis is always running). Others are only announced when their first
// OpenClaw event arrives, and can go offline (showing as placeholder in the office).
const RESIDENTS = [
  { id: 1,  name: 'Jarvis',            sessionKey: 'agent:main:main',              alwaysAnnounce: true },
  { id: 3,  name: 'Dev',               sessionKey: 'agent:dev:dev',                alwaysAnnounce: true },
  { id: 4,  name: 'Infra',             sessionKey: 'agent:infra:infra',            alwaysAnnounce: true },
  { id: 5,  name: 'support-agent',     sessionKey: 'agent:main:support-agent',     alwaysAnnounce: true },
  { id: 6,  name: 'qa-tester',         sessionKey: 'agent:main:qa-tester',         alwaysAnnounce: true },
  { id: 7,  name: 'data-custodian',    sessionKey: 'agent:main:data-custodian',    alwaysAnnounce: true },
  { id: 8,  name: 'service-ops',       sessionKey: 'agent:main:service-ops',       alwaysAnnounce: true },
  { id: 9,  name: 'analytics',         sessionKey: 'agent:main:analytics',         alwaysAnnounce: true },
  { id: 10, name: 'security-watchdog', sessionKey: 'agent:main:security-watchdog', alwaysAnnounce: true },
  { id: 11, name: 'change-manager',    sessionKey: 'agent:main:change-manager',    alwaysAnnounce: true },
];

let nextAgentId = Math.max(...RESIDENTS.map(r => r.id)) + 1;

// Session registry: maps full sessionKey <-> agentId
// We only use full keys to avoid collisions (e.g. agent:dev:main vs agent:main:main both have "main")
const sessionToAgent = new Map();
const agentToSession = new Map(); // agentId -> full sessionKey (for chat.send)

// Track which residents have been announced to clients
const announcedResidents = new Set();

// Subagent dot correlation:
// When an Agent/Task tool fires, push { parentAgentId, parentToolId } to this queue.
// When a subagent session first appears, associate it with the oldest pending entry.
const pendingAgentTools = []; // [{ parentAgentId, parentToolId }]
// sessionKey → { parentAgentId, parentToolId }
const subagentSessionParent = new Map();

for (const r of RESIDENTS) {
  sessionToAgent.set(r.sessionKey, r.id);
  agentToSession.set(r.id, r.sessionKey);
}

function isSubagentSession(sessionKey) {
  return sessionKey?.includes(':subagent:');
}

// Derive a human-readable label from a full sessionKey
// "agent:main:service-ops" → "service-ops", "agent:dev:dev" → "dev", "agent:main:main" → "main"
function sessionLabel(evtSession) {
  const parts = evtSession.split(':');
  // parts[2] is the agent name within the workspace (e.g. "service-ops", "dev", "main")
  // Fallback to parts[1] (workspace) if parts[2] is missing
  return parts.length >= 3 ? parts[2] : (parts.length >= 2 ? parts[1] : evtSession);
}

// Find the resident that owns a given sessionKey.
// Rules:
//   agent:main:main             → Jarvis (exact match only)
//   agent:main:subagent:<UUID>  → new anonymous character (Jarvis's subagent)
//   agent:dev:*                 → Dev resident (any session in dev workspace)
//   agent:infra:*               → Infra resident (any session in infra workspace)
function residentForSession(evtSession) {
  const parts = evtSession.split(':');
  const workspace = parts[1];
  return RESIDENTS.find((r) => {
    const rWorkspace = r.sessionKey.split(':')[1];
    if (workspace !== rWorkspace) return false;
    // For main workspace: only exact match routes to Jarvis;
    // subagents of main (agent:main:subagent:*) get their own new character
    if (workspace === 'main') return evtSession === r.sessionKey;
    // For all other workspaces (dev, infra, etc.): any session → resident
    return true;
  }) ?? null;
}

wss.on('connection', (ws) => {
  console.log('Browser client connected');
  clients.push(ws);

  // Always announce residents so the office is populated even while the bridge reconnects.
  sendResidents(ws);
  sendBridgeStatus(bridgeStatus, ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'stdin') {
        const text = data.text;
        const targetAgentId = data.agentId ?? currentAgentId;
        const sessionKey = agentToSession.get(targetAgentId) ?? 'main';
        console.log(`[Chat] agentId=${targetAgentId} session=${sessionKey}: ${text.slice(0, 80)}`);

        if (!openclawReady) {
          console.warn('[OpenClaw] Not connected yet — message dropped');
          return;
        }

        broadcast({ type: 'agentStatus', id: targetAgentId, status: 'active' });

        const id = crypto.randomUUID();
        openclawSend({ type: 'req', id, method: 'chat.send', params: {
          sessionKey,
          message: text,
          idempotencyKey: id,
        }});
      }
    } catch (e) { /* ignore */ }
  });

  ws.on('close', () => { clients = clients.filter(c => c !== ws); });
});

function broadcast(msg) {
  const raw = JSON.stringify(msg);
  clients.forEach(c => { if (c.readyState === 1) c.send(raw); });
}

function sendResidents(target = null) {
  // Only announce residents marked as alwaysAnnounce (e.g. Jarvis).
  // Other residents will be announced when their first OpenClaw event arrives.
  const alwaysOn = RESIDENTS.filter((r) => r.alwaysAnnounce);
  const payloads = alwaysOn.flatMap((r) => {
    announcedResidents.add(r.id);
    return [
      { type: 'agentCreated', id: r.id, name: r.name, sessionKey: r.sessionKey, resident: true, folderName: r.name.toLowerCase() },
      { type: 'agentStatus', id: r.id, status: 'idle' },
    ];
  });
  if (target) {
    for (const msg of payloads) {
      if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(msg));
    }
    return;
  }
  for (const msg of payloads) broadcast(msg);
}

function sendBridgeStatus(status, target = null) {
  bridgeStatus = status;
  const msg = { type: 'wsConnectionStatus', status };
  if (target) {
    if (target.readyState === WebSocket.OPEN) target.send(JSON.stringify(msg));
    return;
  }
  broadcast(msg);
}

// ── Tool name → UI label mapping ─────────────────────────────────────────────

const TOOL_UI_MAP = {
  // Web / search
  web_search: { name: 'Search',   status: 'Pesquisando...' },
  search:     { name: 'Search',   status: 'Pesquisando...' },
  brave:      { name: 'Search',   status: 'Pesquisando...' },
  perplexity: { name: 'Search',   status: 'Pesquisando...' },
  // File ops
  read:       { name: 'Reading',  status: 'Lendo arquivos...' },
  read_file:  { name: 'Reading',  status: 'Lendo arquivos...' },
  list_dir:   { name: 'Reading',  status: 'Explorando...' },
  // Execution
  exec:       { name: 'Terminal', status: 'Rodando comando...' },
  bash:       { name: 'Terminal', status: 'Rodando comando...' },
  run:        { name: 'Terminal', status: 'Rodando comando...' },
  shell:      { name: 'Terminal', status: 'Rodando comando...' },
  // Write / edit
  write:      { name: 'Writing',  status: 'Escrevendo código...' },
  write_file: { name: 'Writing',  status: 'Escrevendo código...' },
  edit:       { name: 'Writing',  status: 'Editando...' },
  patch:      { name: 'Writing',  status: 'Editando...' },
  // Browser
  browser:    { name: 'Browser',  status: 'Navegando...' },
  navigate:   { name: 'Browser',  status: 'Navegando...' },
  screenshot: { name: 'Browser',  status: 'Capturando tela...' },
};

function toolUiFor(toolName) {
  const key = (toolName ?? '').toLowerCase();
  return TOOL_UI_MAP[key] ?? { name: toolName ?? 'Tool', status: `${toolName ?? 'Tool'}...` };
}

// ── Real tool event handler (stream: "tool") ─────────────────────────────────

function handleToolEvent(agentId, evtSession, { phase, name, toolCallId }) {
  if (!phase || !toolCallId) return;
  const ui = toolUiFor(name);
  const isAgentTool = ['agent', 'task'].includes((name ?? '').toLowerCase());

  if (phase === 'start') {
    console.log(`[Tool] start  ${name} (${toolCallId})`);
    broadcast({ type: 'agentToolStart', id: agentId, toolId: toolCallId, toolName: ui.name, status: ui.status });
    if (isAgentTool) {
      pendingAgentTools.push({ parentAgentId: agentId, parentToolId: toolCallId });
    }
    // If this session is a subagent, also fire subagentToolStart on the parent's anonymous character
    const parent = evtSession ? subagentSessionParent.get(evtSession) : null;
    if (parent) {
      broadcast({ type: 'subagentToolStart', id: parent.parentAgentId, parentToolId: parent.parentToolId, toolId: toolCallId, toolName: ui.name, status: ui.status });
    }
  } else if (phase === 'done' || phase === 'error') {
    console.log(`[Tool] ${phase}  ${name} (${toolCallId})`);
    broadcast({ type: 'agentToolDone', id: agentId, toolId: toolCallId });
    if (isAgentTool) {
      const idx = pendingAgentTools.findIndex(p => p.parentAgentId === agentId && p.parentToolId === toolCallId);
      if (idx !== -1) pendingAgentTools.splice(idx, 1);
    }
    const parent = evtSession ? subagentSessionParent.get(evtSession) : null;
    if (parent) {
      broadcast({ type: 'subagentToolDone', id: parent.parentAgentId, parentToolId: parent.parentToolId, toolId: toolCallId });
    }
  }
}

// ── OpenClaw gateway connection ───────────────────────────────────────────────

const identity = loadOrCreateIdentity();
let openclawWs = null;
let openclawReady = false;

function openclawSend(obj) {
  if (openclawWs?.readyState === WebSocket.OPEN) {
    openclawWs.send(JSON.stringify(obj));
  }
}

function connectToOpenClaw() {
  console.log(`[OpenClaw] Connecting to ${OPENCLAW_WS_URL}...`);
  sendBridgeStatus('connecting');
  openclawWs = new WebSocket(OPENCLAW_WS_URL);

  openclawWs.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    // ── Handshake ──
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      const nonce = msg.payload?.nonce;
      const signedAtMs = Date.now();
      const payload = buildDeviceAuthPayloadV3({
        deviceId: identity.deviceId,
        clientId: 'cli', clientMode: 'cli',
        role: 'operator', scopes: SCOPES,
        signedAtMs, token: OPENCLAW_TOKEN, nonce,
        platform: 'node', deviceFamily: '',
      });
      const signature = base64UrlEncode(
        crypto.sign(null, Buffer.from(payload, 'utf8'), crypto.createPrivateKey(identity.privateKeyPem))
      );

      openclawSend({
        type: 'req', id: crypto.randomUUID(), method: 'connect',
        params: {
          minProtocol: 3, maxProtocol: 3,
          client: { id: 'cli', version: '1.0.0', platform: 'node', mode: 'cli' },
          caps: ['tool-events'], commands: [],
          role: 'operator', scopes: SCOPES,
          auth: { token: OPENCLAW_TOKEN },
          device: {
            id: identity.deviceId,
            publicKey: base64UrlEncode(derivePublicKeyRaw(identity.publicKeyPem)),
            signature, signedAt: signedAtMs, nonce,
          },
        },
      });
      return;
    }

    // ── hello-ok ──
    if (msg.type === 'res' && msg.ok && msg.payload?.type === 'hello-ok') {
      openclawReady = true;
      sendBridgeStatus('connected');
      const v = msg.payload.server?.version;
      console.log(`[OpenClaw] Connected! Server ${v}, protocol ${msg.payload.protocol}`);

      // Re-announce residents in case clients connected before the bridge was ready.
      sendResidents();
      return;
    }

    // ── connect error ──
    if (msg.type === 'res' && !msg.ok && !openclawReady) {
      sendBridgeStatus('disconnected');
      console.error('[OpenClaw] Connect failed:', msg.error?.message, msg.error?.details);
      return;
    }

    // ── agent streaming events ──
    if (msg.type === 'event' && msg.event === 'agent') {
      const { stream, data: d, sessionKey: evtSession } = msg.payload ?? {};
      if (stream === 'lifecycle') console.log('[Agent event]', JSON.stringify(msg.payload));

      // Resolve agentId from sessionKey in the event, or fall back to currentAgentId
      let agentId = currentAgentId;
      if (evtSession) {
        if (!sessionToAgent.has(evtSession)) {
          const knownResident = residentForSession(evtSession);
          if (knownResident) {
            // Route to existing resident — different sessionKey, same workspace
            sessionToAgent.set(evtSession, knownResident.id);
            console.log(`[Session] "${evtSession}" → resident "${knownResident.name}" (agentId=${knownResident.id})`);
            // If this resident wasn't announced yet (non-alwaysAnnounce), announce now
            if (!announcedResidents.has(knownResident.id)) {
              announcedResidents.add(knownResident.id);
              broadcast({ type: 'agentCreated', id: knownResident.id, name: knownResident.name, sessionKey: knownResident.sessionKey, resident: false, folderName: knownResident.name.toLowerCase() });
              console.log(`[Session] Announcing resident "${knownResident.name}" (discovered via OpenClaw event)`);
            }
          } else {
            // Genuinely new session — create a new agent
            const newId = nextAgentId++;
            const label = sessionLabel(evtSession);
            sessionToAgent.set(evtSession, newId);
            agentToSession.set(newId, evtSession);
            const resident = false;
            broadcast({ type: 'agentCreated', id: newId, name: label, sessionKey: evtSession, resident, folderName: label });
            broadcast({ type: 'agentStatus', id: newId, status: 'idle' });
            console.log(`[Session] New session "${evtSession}" (label: ${label}) → agentId=${newId}`);
          }
          // Associate subagent session with oldest pending Agent/Task tool call
          if (isSubagentSession(evtSession) && pendingAgentTools.length > 0) {
            subagentSessionParent.set(evtSession, { ...pendingAgentTools[0] });
            console.log(`[Subagent] "${evtSession}" → parent agentId=${pendingAgentTools[0].parentAgentId} toolId=${pendingAgentTools[0].parentToolId}`);
          }
        }
        agentId = sessionToAgent.get(evtSession);
        currentAgentId = agentId; // keep currentAgentId in sync for fallback
      }

      if (stream === 'assistant' && d?.text) {
        broadcast({ type: 'agentStatus', id: agentId, status: 'active' });
        broadcast({ type: 'agentOutput', id: agentId, text: d.text });
      }

      if (stream === 'tool') {
        handleToolEvent(agentId, evtSession, d ?? {});
      }

      if (stream === 'lifecycle') {
        if (d?.phase === 'start') {
          broadcast({ type: 'agentStatus', id: agentId, status: 'active' });
        } else if (d?.phase === 'end') {
          broadcast({ type: 'agentToolsClear', id: agentId });
          broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
          if (isSubagentSession(evtSession)) {
            subagentSessionParent.delete(evtSession);
          }
        }
      }
      return;
    }

    // ── chat.send ack ──
    if (msg.type === 'res' && msg.payload?.status === 'started') {
      console.log(`[OpenClaw] Run started: ${msg.payload.runId}`);
    }
  });

  openclawWs.on('error', (e) => {
    console.error('[OpenClaw] Error:', e.message);
    openclawReady = false;
    sendBridgeStatus('disconnected');
  });

  openclawWs.on('close', (code, reason) => {
    console.log(`[OpenClaw] Disconnected (${code}) — reconnecting in 5s...`);
    openclawReady = false;
    sendBridgeStatus('disconnected');
    setTimeout(connectToOpenClaw, 5000);
  });
}

connectToOpenClaw();

// ── REST endpoints ────────────────────────────────────────────────────────────

// Auth endpoints (no middleware — they are the gate)
app.get('/api/auth/check', (req, res) => {
  res.json({ ok: isValidSession(req.headers.cookie) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (username === PIXEL_USER && password === PIXEL_PASS) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { createdAt: Date.now() });
    res.setHeader('Set-Cookie', sessionCookie(token));
    console.log(`[Auth] Login: ${username}`);
    res.json({ ok: true });
  } else {
    console.warn(`[Auth] Failed login attempt: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = parseCookieToken(req.headers.cookie);
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'pixel_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// Test endpoint: POST /api/test-session?key=lexi&message=hello
// Sends a chat.send to any sessionKey to trigger the session registry
app.post('/api/test-session', authMiddleware, (req, res) => {
  const sessionKey = req.query.key;
  const message = req.query.message ?? 'olá';
  if (!sessionKey) return res.status(400).json({ error: 'key is required' });
  if (!openclawReady) return res.status(503).json({ error: 'OpenClaw not connected' });

  const id = crypto.randomUUID();
  openclawSend({ type: 'req', id, method: 'chat.send', params: { sessionKey, message, idempotencyKey: id } });
  console.log(`[Test] chat.send → sessionKey=${sessionKey} message="${message}"`);
  res.json({ ok: true, sessionKey, message });
});

app.post('/api/spawn-agent', authMiddleware, (_req, res) => {
  const agentId = nextAgentId++;
  currentAgentId = agentId;
  console.log(`Spawning Agent ID: ${agentId}`);
  broadcast({ type: 'agentCreated', id: agentId });
  broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
  res.json({ success: true, agentId });
});

// ── Static files (production) ─────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  // SPA fallback — any non-API route serves index.html
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

httpServer.listen(port, () => {
  console.log(`Pixel Office running on http://localhost:${port}`);
  console.log(`WebSocket on ws://localhost:${port}/ws`);
});
