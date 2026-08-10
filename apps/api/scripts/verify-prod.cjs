// Vérification prod : POST /api/brouillons (création) + liste
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  const createRes = await fetch(`${BASE}/api/brouillons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'Démo réceptacle' })
  });
  console.log('POST prod →', createRes.status);
  const created = await createRes.json();
  console.log('Créé:', created.id, '·', created.titre);

  const listRes = await fetch(`${BASE}/api/brouillons`);
  const list = await listRes.json();
  console.log('Brouillons en prod:', list.length, '·', list.map((b) => b.titre.slice(0, 22)));

  // Nettoyer les brouillons de démo (garder le carrousel original)
  for (const b of list) {
    if (b.titre.startsWith('Démo') || b.titre.startsWith('Test') || b.titre === 'Nouveau brouillon') {
      const del = await fetch(`${BASE}/api/brouillon/${b.id}`, { method: 'DELETE' });
      console.log('Nettoyé:', b.titre, '→', del.status);
    }
  }
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
