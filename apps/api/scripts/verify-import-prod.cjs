// Vérif prod : import charte + GET relu
const BASE = 'https://atelier-api-three.vercel.app';

const css = `
  :root {
    --bordeaux: #422928;
    --ivoire: #f1efea;
    --sauge: #6f7f75;
    --perle: #b0bbb4;
    --gold: #e8c97a;
    --font-titre: 'Cormorant Garamond', serif;
    --font-texte: 'Jost', sans-serif;
    --radius-card: 12px;
  }
  .logo { background: url('https://bordeluche.com/logo.svg'); }
`;

async function main() {
  // 1. Import en prod
  const res = await fetch(`${BASE}/api/charte/import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ css, nom: 'Bordeluche (prod)' })
  });
  const body = await res.json();
  console.log('POST import prod →', res.status, '· stats:', JSON.stringify(body.stats));

  // 2. GET relu en prod
  const g = await (await fetch(`${BASE}/api/charte`)).json();
  const parsed = JSON.parse(g.data);
  console.log('GET relu →', g.nom, '· couleurs:', Object.keys(parsed.couleurs).length, '· polices:', parsed.polices.titre || '-');
  console.log('PROD OK:', res.status === 200 && parsed.couleurs.bordeaux === '#422928');
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
