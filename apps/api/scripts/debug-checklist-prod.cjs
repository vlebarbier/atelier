// Debug : quel endpoint 404 ? Test du POST checklist en prod
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  // 1. GET détail
  const detail = await fetch(`${BASE}/api/brouillon/carrousel-bordeluche-v7`);
  console.log('GET détail →', detail.status);
  const d = await detail.json();
  console.log('checklist:', d.checklist, '· sourceHtml:', d.sourceHtml ? 'oui' : 'non');

  // 2. POST checklist
  const res = await fetch(`${BASE}/api/brouillon/carrousel-bordeluche-v7`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checklist: JSON.stringify([{ id: 'charte', label: 'Charte', checked: true }]) })
  });
  console.log('POST checklist →', res.status, JSON.stringify(await res.json()).slice(0, 120));
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
