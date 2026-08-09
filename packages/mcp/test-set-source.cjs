// Test MCP set_source : un agent dépose sa source HTML dans Atelier (le "réceptacle").
const { spawn } = require('node:child_process');

const server = spawn('node', ['dist/index.js'], {
  cwd: __dirname,
  env: { ...process.env, ATELIER_API_URL: 'http://localhost:4310' },
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
const HTML = '<!DOCTYPE html><html><head><style>.slide{width:1080px;height:1080px}</style></head><body><div class="slide">Test agent</div></body></html>';

setTimeout(() => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't-source', version: '1' } } }), 100);
setTimeout(() => send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }), 500);
setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'set_source', arguments: { id: ID, source_html: HTML } } }), 1000);
setTimeout(() => send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'lire_brouillon', arguments: { id: ID } } }), 2000);

setTimeout(() => {
  const set = responses.find((r) => r.id === 2);
  const lire = responses.find((r) => r.id === 3);
  const setText = set?.result?.content?.[0]?.text || '';
  const lireText = lire?.result?.content?.[0]?.text || '';
  const lireData = lireText ? JSON.parse(lireText) : {};

  console.log('set_source →', setText.slice(0, 90).replace(/\n/g, ' '));
  console.log('lire_brouillon → sourceHtml:', lireData.sourceHtml ? 'OK (' + lireData.sourceHtml.slice(0, 40) + '...)' : 'ABSENT');

  const ok = setText.includes('"ok": true') && lireData.sourceHtml && lireData.sourceHtml.includes('Test agent');
  console.log(ok ? '✅ MCP SET_SOURCE OK (le receptacle reçoit le HTML)' : '❌ PROBLEME');
  server.kill();
  process.exit(ok ? 0 : 1);
}, 4000);
