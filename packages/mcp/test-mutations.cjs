// Test des outils de mutation MCP : lire_brouillon + set_statut + set_legende (round-trip).
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
      try { responses.push(JSON.parse(line)); } catch { /* ignore */ }
    }
  }
});
server.stderr.on('data', () => { /* silence */ });

function send(msg) { server.stdin.write(JSON.stringify(msg) + '\n'); }
const ID = 'carrousel-bordeluche-v7';

setTimeout(() => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't2', version: '1' } } }), 100);
setTimeout(() => send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }), 500);
setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'lire_brouillon', arguments: { id: ID } } }), 1000);
setTimeout(() => send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'set_statut', arguments: { id: ID, statut: 'a-valider' } } }), 2000);
setTimeout(() => send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'set_legende', arguments: { id: ID, reseau: 'instagram', caption: 'test mcp', hashtags: '#test' } } }), 3000);

setTimeout(() => {
  const lire = responses.find((r) => r.id === 2);
  const statut = responses.find((r) => r.id === 3);
  const legende = responses.find((r) => r.id === 4);

  const lireText = lire?.result?.content?.[0]?.text || '';
  const lireData = lireText ? JSON.parse(lireText) : {};
  const statutText = statut?.result?.content?.[0]?.text || '';
  const legendeText = legende?.result?.content?.[0]?.text || '';

  console.log('lire_brouillon → titre:', lireData.titre, '· slides:', lireData.slideCount);
  console.log('set_statut →', statutText.slice(0, 80));
  console.log('set_legende →', legendeText.slice(0, 80));

  const ok = lireData.titre && statutText.includes('"ok": true') && legendeText.includes('"ok": true');
  console.log(ok ? '✅ MCP MUTATIONS OK' : '❌ PROBLEME');
  server.kill();
  process.exit(ok ? 0 : 1);
}, 5000);
