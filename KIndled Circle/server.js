// server.js -- vanilla Node (no express)
// Node 18+ required (for global fetch).
// Run: OPENAI_API_KEY="sk-..." node server.js

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

// ---- utils for __dirname in ESM ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- CONFIG -----
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const STATIC_DIR = path.join(__dirname); // serve files from project root (where index.html sits)

if (!OPENAI_KEY) {
  console.error('ERROR: set OPENAI_API_KEY env var (e.g. OPENAI_API_KEY=sk-...)');
  process.exit(1);
}

// ---- Character system prompts ----
const CHARACTER_PROMPTS = {
  seer: `You are "Seer" — poetic, helpful, and careful with spoilers. Answer about game lore and magic builds in a lyrical tone. When relevant, give step-by-step instructions or examples.`,
  knight: `You are "Knight" — blunt, tactical, and practical. Give concise, actionable weapon/armor/build advice and clear combat tips.`,
  dragon: `You are "Dragon" — majestic and concise. Offer high-level boss strategies, phase breakdowns, and positional advice. Avoid verbosity unless user asks for details.`,
};

// ---- In-memory simple conversation store (demo) ----
const historyStore = new Map(); // key: character -> [{ role, content, ts }]
function pushHistory(character, role, content) {
  const arr = historyStore.get(character) || [];
  arr.push({ role, content, ts: Date.now() });
  // keep last 150 items
  historyStore.set(character, arr.slice(-150));
}
function buildMessages(character, userMessage, maxHistory = 8) {
  const sys = CHARACTER_PROMPTS[character] || 'You are a helpful game character.';
  const hist = historyStore.get(character) || [];
  const last = hist.slice(-maxHistory);
  const messages = [{ role: 'system', content: sys }];
  last.forEach(h => messages.push({ role: h.role, content: h.content }));
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// ---- Simple IP rate limiter (vanilla, sliding window) ----
const RATE_WINDOW_MS = 15 * 1000; // 15s
const RATE_LIMIT_MAX = 20; // max requests per IP per window
const ipHits = new Map(); // ip -> [timestamps]

function recordAndCheckRate(ip) {
  const now = Date.now();
  const arr = ipHits.get(ip) || [];
  // keep only recent
  const recent = arr.filter(t => t > now - RATE_WINDOW_MS);
  recent.push(now);
  ipHits.set(ip, recent);
  return recent.length <= RATE_LIMIT_MAX;
}

// ---- Simple static file server helper ----
function sendFile(res, filePath, contentType='text/plain', status=200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type':'text/plain'});
      res.end('Not found');
      return;
    }
    res.writeHead(status, {'Content-Type': contentType});
    res.end(data);
  });
}

function mimeTypeFor(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

// ---- OpenAI call (vanilla fetch to Chat Completions) ----
async function callOpenAI(messages, opts = {}) {
  const payload = {
    model: opts.model || (process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    messages,
    temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.6,
    max_tokens: opts.max_tokens || 700,
    top_p: 0.95
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    const err = new Error(`OpenAI ${resp.status}: ${txt}`);
    err.status = resp.status;
    throw err;
  }
  const j = await resp.json();
  const content = j?.choices?.[0]?.message?.content ?? '';
  return content.trim();
}

// ---- HTTP server ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.socket.remoteAddress || 'unknown';

  // Simple routes
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    // rate limit
    if (!recordAndCheckRate(ip)) {
      res.writeHead(429, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'rate_limited' }));
      return;
    }

    // read body
    let body = '';
    for await (const chunk of req) body += chunk;
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'invalid_json' }));
      return;
    }

    const { character, message } = payload;
    if (!character || !message) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'character_and_message_required' }));
      return;
    }
    if (typeof message !== 'string' || message.length > 6000) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'invalid_message_length' }));
      return;
    }

    try {
      // build message array (system + recent history + user)
      const messages = buildMessages(character, message, 10);

      // per-character temperature tuning
      const temperature = character === 'seer' ? 0.8 : character === 'knight' ? 0.25 : 0.5;
      const reply = await callOpenAI(messages, { temperature });

      // persist
      pushHistory(character, 'user', message);
      pushHistory(character, 'assistant', reply);

      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error('OpenAI error', err);
      res.writeHead(502, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'openai_error', detail: String(err.message) }));
    }
    return;
  }

  // config endpoint (discord invite optional)
  if (req.method === 'GET' && url.pathname === '/api/config') {
    const cfg = { discordInvite: process.env.DISCORD_INVITE || null, appName: 'Embers' };
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify(cfg));
    return;
  }

  // Serve static files: index.html, css, js, img
  // Normalize path
  let filePath = path.join(STATIC_DIR, url.pathname);
  // if path is directory, serve index.html
  if (url.pathname === '/' || url.pathname === '') {
    filePath = path.join(STATIC_DIR, 'index.html');
  }
  // Security: prevent escaping the static dir
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403, {'Content-Type':'text/plain'});
    res.end('Forbidden');
    return;
  }
  // If file doesn't exist, fallback to index.html (SPA style)
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // try index.html
      const fallback = path.join(STATIC_DIR, 'index.html');
      if (fs.existsSync(fallback)) {
        sendFile(res, fallback, 'text/html; charset=utf-8');
      } else {
        res.writeHead(404, {'Content-Type':'text/plain'});
        res.end('Not found');
      }
    } else {
      const mime = mimeTypeFor(filePath);
      sendFile(res, filePath, mime);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Vanilla server listening on http://localhost:${PORT}`);
});
