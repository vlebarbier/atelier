// Nettoyer les brouillons de test restants en prod
const BASE = 'https://atelier-api-three.vercel.app';

async function main() {
  const list = await (await fetch(`${BASE}/api/brouillons`)).json();
  for (const b of list) {
    if (b.titre === 'Nouveau brouillon' || b.titre.startsWith('Démo') || b.titre.startsWith('Test')) {
      const del = await fetch(`${BASE}/api/brouillon/${b.id}`, { method: 'DELETE' });
      console.log(`Supprimé: ${b.titre} → ${del.status}`);
    }
  }
  const final = await (await fetch(`${BASE}/api/brouillons`)).json();
  console.log('Reste:', final.map((b) => b.titre).join(', '));
}
main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
