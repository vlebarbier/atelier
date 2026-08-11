// Test import charte : POST /api/charte/import avec le design-tokens.css de Bordeluche
const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('/Users/victorlebarbier/Atelier/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
process.env.POSTGRES_URL = env.POSTGRES_URL;
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;

import('/Users/victorlebarbier/Atelier/apps/api/dist/app.js').then(async (mod) => {
  const app = mod.default;

  // Le CSS de charte Bordeluche (extrait des tokens reels)
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
    .hero { background: url('https://bordeluche.com/logo.svg'); border-radius: var(--radius-card); }
  `;

  const res = await app.fetch(new Request('http://localhost/api/charte/import', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ css, nom: 'Bordeluche (import)' })
  }));
  console.log('POST /api/charte/import →', res.status);
  const body = await res.json();
  console.log('Stats:', JSON.stringify(body.stats));
  const parsed = JSON.parse(body.data);
  console.log('Couleurs:', JSON.stringify(parsed.couleurs));
  console.log('Polices:', JSON.stringify(parsed.polices));
  console.log('Rayons:', JSON.stringify(parsed.rayons));
  console.log('Logos:', JSON.stringify(parsed.logos));
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
