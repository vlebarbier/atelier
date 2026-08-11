// Cleanup : supprime les ressources de test en prod (reste 1 : capture-ton2.cjs)
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  const list = await (await fetch(`${BASE}/api/ressources`)).json();
  console.log('Ressources en prod:', list.length);
  for (const r of list) {
    if (r.nom === 'capture-ton2.cjs' || r.nom === 'photo-prod-test.png') {
      await fetch(`${BASE}/api/ressource/${r.id}`, { method: 'DELETE' });
      console.log('Supprimé:', r.nom);
    }
  }
  const list2 = await (await fetch(`${BASE}/api/ressources`)).json();
  console.log('Après cleanup:', list2.length, 'ressource(s)');
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
