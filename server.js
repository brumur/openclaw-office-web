import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Config ────────────────────────────────────────────────────────────────────

const OPENCLAW_WS_URL = (process.env.OPENCLAW_URL ?? 'http://185.205.244.235:18789').replace(/^http/, 'ws');
const OPENCLAW_TOKEN  = process.env.OPENCLAW_TOKEN ?? 'admin-token-123';
const IDENTITY_PATH   = process.env.OPENCLAW_IDENTITY_PATH ?? path.join(os.homedir(), '.pixel-office-identity.json');
const SCOPES          = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals'];

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
app.use(cors());
const port = 3000;

const wss = new WebSocketServer({ port: 3002 });
let clients = [];
let currentAgentId = 1;

// ── Resident session definitions ──────────────────────────────────────────────
// These always appear in the office, even before any OpenClaw event arrives.
// sessionKey must match the format OpenClaw uses in events (agent:<workspace>:<name>).
const RESIDENTS = [
  { id: 1, label: 'main',  sessionKey: 'agent:main:main',   shortKey: 'main'  },
  { id: 2, label: 'lexi',  sessionKey: 'agent:lexi:lexi',   shortKey: 'lexi'  },
  { id: 3, label: 'dev',   sessionKey: 'agent:dev:dev',     shortKey: 'dev'   },
  { id: 4, label: 'infra', sessionKey: 'agent:infra:infra', shortKey: 'infra' },
];

let nextAgentId = RESIDENTS.length + 1;

// Session registry: maps sessionKey <-> agentId
const sessionToAgent = new Map();
const agentToSession = new Map(); // agentId -> shortKey (for chat.send)

for (const r of RESIDENTS) {
  sessionToAgent.set(r.sessionKey, r.id);
  sessionToAgent.set(r.shortKey, r.id);
  agentToSession.set(r.id, r.shortKey);
}

function isSubagentSession(sessionKey) {
  return sessionKey?.includes(':subagent:');
}

// Extract short session name for chat.send from a full event sessionKey
// "agent:main:lexi" → "lexi", "agent:main:main" → "main"
function shortSessionKey(evtSession) {
  const parts = evtSession.split(':');
  // format is agent:<workspace>:<sessionName>
  return parts.length >= 3 ? parts[2] : evtSession;
}

wss.on('connection', (ws) => {
  console.log('Browser client connected');
  clients.push(ws);

  // If OpenClaw is already connected, immediately announce all residents to this new client
  if (openclawReady) {
    for (const r of RESIDENTS) {
      ws.send(JSON.stringify({ type: 'agentCreated', id: r.id, folderName: r.label, resident: true }));
      ws.send(JSON.stringify({ type: 'agentStatus', id: r.id, status: 'idle' }));
    }
  }

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

function handleToolEvent(agentId, { phase, name, toolCallId }) {
  if (!phase || !toolCallId) return;
  const ui = toolUiFor(name);

  if (phase === 'start') {
    console.log(`[Tool] start  ${name} (${toolCallId})`);
    broadcast({ type: 'agentToolStart', id: agentId, toolId: toolCallId, toolName: ui.name, status: ui.status });
  } else if (phase === 'done' || phase === 'error') {
    console.log(`[Tool] ${phase}  ${name} (${toolCallId})`);
    broadcast({ type: 'agentToolDone', id: agentId, toolId: toolCallId });
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
      const v = msg.payload.server?.version;
      console.log(`[OpenClaw] Connected! Server ${v}, protocol ${msg.payload.protocol}`);

      // Announce all resident agents to the UI
      for (const r of RESIDENTS) {
        broadcast({ type: 'agentCreated', id: r.id, folderName: r.label, resident: true });
        broadcast({ type: 'agentStatus', id: r.id, status: 'idle' });
      }
      return;
    }

    // ── connect error ──
    if (msg.type === 'res' && !msg.ok && !openclawReady) {
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
          // New session discovered — register a new agent
          const newId = nextAgentId++;
          const short = shortSessionKey(evtSession);
          sessionToAgent.set(evtSession, newId);
          sessionToAgent.set(short, newId);
          agentToSession.set(newId, short); // short name for chat.send
          const resident = !isSubagentSession(evtSession);
          broadcast({ type: 'agentCreated', id: newId, folderName: short, resident });
          broadcast({ type: 'agentStatus', id: newId, status: 'idle' });
          console.log(`[Session] New session "${evtSession}" (short: ${short}) → agentId=${newId}`);
        }
        agentId = sessionToAgent.get(evtSession);
        currentAgentId = agentId; // keep currentAgentId in sync for fallback
      }

      if (stream === 'assistant' && d?.text) {
        broadcast({ type: 'agentStatus', id: agentId, status: 'active' });
        broadcast({ type: 'agentOutput', id: agentId, text: d.text });
      }

      if (stream === 'tool') {
        handleToolEvent(agentId, d ?? {});
      }

      if (stream === 'lifecycle') {
        if (d?.phase === 'start') {
          broadcast({ type: 'agentStatus', id: agentId, status: 'active' });
        } else if (d?.phase === 'end') {
          broadcast({ type: 'agentToolsClear', id: agentId });
          broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
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
  });

  openclawWs.on('close', (code, reason) => {
    console.log(`[OpenClaw] Disconnected (${code}) — reconnecting in 5s...`);
    openclawReady = false;
    setTimeout(connectToOpenClaw, 5000);
  });
}

connectToOpenClaw();

// ── REST endpoints ────────────────────────────────────────────────────────────

// Test endpoint: POST /api/test-session?key=lexi&message=hello
// Sends a chat.send to any sessionKey to trigger the session registry
app.post('/api/test-session', (req, res) => {
  const sessionKey = req.query.key;
  const message = req.query.message ?? 'olá';
  if (!sessionKey) return res.status(400).json({ error: 'key is required' });
  if (!openclawReady) return res.status(503).json({ error: 'OpenClaw not connected' });

  const id = crypto.randomUUID();
  openclawSend({ type: 'req', id, method: 'chat.send', params: { sessionKey, message, idempotencyKey: id } });
  console.log(`[Test] chat.send → sessionKey=${sessionKey} message="${message}"`);
  res.json({ ok: true, sessionKey, message });
});

app.post('/api/spawn-agent', (_req, res) => {
  const agentId = nextAgentId++;
  currentAgentId = agentId;
  console.log(`Spawning Agent ID: ${agentId}`);
  broadcast({ type: 'agentCreated', id: agentId });
  broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
  res.json({ success: true, agentId });
});

app.listen(port, () => {
  console.log(`Proxy Backend running on http://localhost:${port}`);
  console.log(`WebSocket running on ws://localhost:3002`);
});
