import express from 'express';
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';
import cors from 'cors';

const app = express();
app.use(cors());
const port = 3000;

// Config WebSocket Server on port 3002
const wss = new WebSocketServer({ port: 3002 });

let clients = [];
let nextAgentId = 1;

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  clients.push(ws);
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

function broadcast(msg) {
  clients.forEach(c => {
    if (c.readyState === 1) { // OPEN
      c.send(JSON.stringify(msg));
    }
  });
}

function parseStdoutToUiEvents(id, chunk) {
  const text = chunk.toString();
  console.log(`[Gemini CLI Output]: ${text}`);

  // Send an active status
  broadcast({ type: 'agentStatus', id, status: 'active' });

  // Simulate tool use dynamically if the output resembles steps (e.g., "[Tool: Search]")
  // Since we don't know the exact format, we just say it's active.
  if (text.toLowerCase().includes('search')) {
    broadcast({ type: 'agentToolStart', id, toolId: 'search_1', status: 'Searching Code', toolName: 'Search' });
    setTimeout(() => { broadcast({ type: 'agentToolDone', id, toolId: 'search_1' }) }, 2000);
  }
}

app.post('/api/spawn-agent', (req, res) => {
  const agentId = nextAgentId++;
  console.log(`Spawning Gemini Agent ID: ${agentId}`);
  
  // Notify UI
  broadcast({ type: 'agentCreated', id: agentId });
  broadcast({ type: 'agentStatus', id: agentId, status: 'waiting' });
  
  // Try to spawn 'gemini' CLI. 
  try {
      // In a real CLI, you'd spawn exactly:
      const proc = spawn('gemini', [], { shell: true });
      
      proc.stdout.on('data', (data) => parseStdoutToUiEvents(agentId, data));
      proc.stderr.on('data', (data) => console.log(`[Stderr] ${data}`));
      proc.on('close', (code) => {
        console.log(`Gemini agent exited with code ${code}`);
        broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
      });
  } catch (e) {
      console.error(e);
      // Fallback
      broadcast({ type: 'agentStatus', id: agentId, status: 'idle' });
  }

  res.json({ success: true, agentId });
});

app.listen(port, () => {
  console.log(`Proxy Backend running on http://localhost:${port}`);
  console.log(`WebSocket running on ws://localhost:3001`);
});
