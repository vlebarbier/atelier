// Debug : liste des brouillons en prod + identifier le 404
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  const list = await (await fetch(`${BASE}/api/brouillons`)).json();
  console.log('Brouillons en prod:', list.length);
  for (const b of list) {
    const detail = await fetch(`${BASE}/api/brouillon/${b.id}`);
    console.log(`  ${b.id} → ${detail.status} (${b.titre.slice(0, 40)})`);
  }
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
