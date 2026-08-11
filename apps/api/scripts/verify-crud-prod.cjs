// Vérif : les routes CRUD sont en prod après l'auto-deploy
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  // 1. Liste
  const list = await (await fetch(`${BASE}/api/brouillons`)).json();
  console.log('GET brouillons →', list.length, 'brouillon(s)');

  // 2. Créer
  const createRes = await fetch(`${BASE}/api/brouillons`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'Vérif auto-deploy' })
  });
  console.log('POST →', createRes.status);
  const created = await createRes.json();

  // 3. Supprimer
  const delRes = await fetch(`${BASE}/api/brouillon/${created.id}`, { method: 'DELETE' });
  console.log('DELETE →', delRes.status);

  // 4. Liste finale
  const final = await (await fetch(`${BASE}/api/brouillons`)).json();
  console.log('Après nettoyage →', final.length, 'brouillon(s)');
  console.log(final.map((b) => `- ${b.titre} (${b.statut})`).join('\n'));
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
