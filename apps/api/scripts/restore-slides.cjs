// Restauration : les 9 slides originales du carrousel depuis le prototype local
// (le test de la route slides avait ecrase la base de prod par des PNG 1px)
const fs = require('fs');
const path = require('path');
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
  const dir = '/Users/victorlebarbier/Bordeluche/.hermes-instagram/brouillons/carrousel-bordeluche-v7/slides';
  const slides = [];
  for (let i = 1; i <= 9; i++) {
    const file = path.join(dir, `slide-${String(i).padStart(2, '0')}.png`);
    const buf = fs.readFileSync(file);
    slides.push(`data:image/png;base64,${buf.toString('base64')}`);
  }
  console.log('Slides a restaurer:', slides.length);

  const res = await app.fetch(new Request('http://localhost/api/brouillon/carrousel-bordeluche-v7/slides', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides })
  }));
  console.log('POST slides →', res.status);
  const body = await res.json();
  console.log('Restaure:', JSON.stringify(body));

  const detail = await (await app.fetch(new Request('http://localhost/api/brouillon/carrousel-bordeluche-v7'))).json();
  console.log('slides en base:', detail.slideCount, '· OK si 9');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
