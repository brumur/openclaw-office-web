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
let nextAgentId = 1;
let currentAgentId = 1;

wss.on('connection', (ws) => {
  console.log('Browser client connected');
  clients.push(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'stdin') {
        const text = data.text;
        console.log(`[Chat] Sending: ${text.slice(0, 80)}`);

        if (!openclawReady) {
          console.warn('[OpenClaw] Not connected yet — message dropped');
          return;
        }

        broadcast({ type: 'agentStatus', id: currentAgentId, status: 'active' });

        const id = crypto.randomUUID();
        openclawSend({ type: 'req', id, method: 'chat.send', params: {
          sessionKey: 'main',
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

function parseStdoutToUiEvents(id, text) {
  broadcast({ type: 'agentStatus', id, status: 'active' });
  broadcast({ type: 'agentOutput', id, text });

  const lower = text.toLowerCase();
  let matchedTool = null;
  if (lower.includes('search') || lower.includes('pesquisa') || lower.includes('procurar')) {
    matchedTool = { toolId: 'search_1', name: 'Search', status: 'Pesquisando...' };
  } else if (lower.includes('read') || lower.includes('examine') || lower.includes('explore') || lower.includes('ler')) {
    matchedTool = { toolId: 'read_1', name: 'Reading', status: 'Lendo arquivos...' };
  } else if (lower.includes('run') || lower.includes('executar') || lower.includes('cmd')) {
    matchedTool = { toolId: 'run_1', name: 'Terminal', status: 'Rodando comando...' };
  } else if (lower.includes('write') || lower.includes('edit') || lower.includes('escrever')) {
    matchedTool = { toolId: 'write_1', name: 'Writing', status: 'Escrevendo código...' };
  } else {
    matchedTool = { toolId: 'think_1', name: 'Thinking', status: 'Pensando...' };
  }

  if (matchedTool) {
    broadcast({ type: 'agentToolStart', id, toolId: matchedTool.toolId, status: matchedTool.status, toolName: matchedTool.name });
    setTimeout(() => broadcast({ type: 'agentToolDone', id, toolId: matchedTool.toolId }), 3000);
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

      // Announce agent to the UI
      broadcast({ type: 'agentCreated', id: currentAgentId });
      broadcast({ type: 'agentStatus', id: currentAgentId, status: 'idle' });
      return;
    }

    // ── connect error ──
    if (msg.type === 'res' && !msg.ok && !openclawReady) {
      console.error('[OpenClaw] Connect failed:', msg.error?.message, msg.error?.details);
      return;
    }

    // ── agent streaming events ──
    if (msg.type === 'event' && msg.event === 'agent') {
      const { stream, data: d, done } = msg.payload ?? {};
      if (stream === 'assistant' && d?.text) {
        parseStdoutToUiEvents(currentAgentId, d.text);
      }
      if (done) {
        broadcast({ type: 'agentStatus', id: currentAgentId, status: 'idle' });
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

// ── REST endpoint ─────────────────────────────────────────────────────────────

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
