const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const MAX = 100;
let history = [];

function broadcast(obj) {
  const s = JSON.stringify(obj);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(s); });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'history', messages: history }));
  broadcast({ type: 'count', count: wss.clients.size });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.type !== 'chat') return;
    const name = String(m.name || '').trim().slice(0, 20);
    const text = String(m.text || '').trim().slice(0, 500);
    if (!name || !text) return;
    const entry = { name, text, ts: Date.now() };
    history.push(entry);
    if (history.length > MAX) history.shift();
    broadcast({ type: 'chat', message: entry });
  });

  ws.on('close', () => broadcast({ type: 'count', count: wss.clients.size }));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Chatroom on http://localhost:' + PORT));
