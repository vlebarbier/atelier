// Test stdio du serveur MCP Atelier : handshake JSON-RPC, liste des outils, appel d'un outil.
// Lance le serveur en processus, envoie des messages JSON-RPC sur stdin, lit les réponses sur stdout.
const { spawn } = require('node:child_process');

const server = spawn('node', ['dist/index.js'], {
  cwd: __dirname,
  env: { ...process.env, ATELIER_API_URL: 'http://localhost:4320' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';
const responses = [];
server.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) {
      try {
        responses.push(JSON.parse(line));
      } catch { /* lignes non-JSON (logs) ignorées */ }
    }
  }
});

const stderrLog = [];
server.stderr.on('data', (c) => stderrLog.push(c.toString().slice(0, 300)));

function send(msg) {
  server.stdin.write(JSON.stringify(msg) + '\n');
}

const timeout = setTimeout(() => {
  console.error('TIMEOUT — réponses:', JSON.stringify(responses).slice(0, 500));
  server.kill();
  process.exit(1);
}, 15000);

// Handshake : initialize puis initialized/notifications
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'test-stdio', version: '0.0.1' }
}});

setTimeout(() => {
  send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
}, 500);

setTimeout(() => {
  // Liste des outils
  send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
}, 1000);

setTimeout(() => {
  // Appel réel : liste_brouillons
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'liste_brouillons', arguments: {} } });
}, 2000);

setTimeout(() => {
  clearTimeout(timeout);
  const init = responses.find((r) => r.id === 1);
  const tools = responses.find((r) => r.id === 2);
  const call = responses.find((r) => r.id === 3);
  const toolNames = tools?.result?.tools?.map((t) => t.name) || [];

  console.log('Initialize:', init?.result?.serverInfo?.name ? 'OK' : 'ECHEC');
  console.log('Outils découverts:', toolNames.length, '→', toolNames.join(', '));
  const text = call?.result?.content?.[0]?.text || '';
  const parsed = text ? JSON.parse(text) : null;
  console.log('liste_brouillons →', Array.isArray(parsed) ? `${parsed.length} brouillon(s)` : 'ERREUR: ' + text.slice(0, 150));

  const ok = init?.result && toolNames.length === 7 && Array.isArray(parsed);
  console.log(ok ? '✅ MCP STDIO OK' : '❌ PROBLEME');
  if (stderrLog.length) console.log('stderr:', stderrLog[0]);
  server.kill();
  process.exit(ok ? 0 : 1);
}, 4000);
