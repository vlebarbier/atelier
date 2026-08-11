// Vérif F-40 : cycle checklist (GET → POST → GET relu)
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
  const id = 'carrousel-bordeluche-v7';

  // 1. GET initial
  const d1 = await (await app.fetch(new Request(`http://localhost/api/brouillon/${id}`))).json();
  console.log('GET initial → checklist:', d1.checklist);

  // 2. POST la checklist cochée
  const checklist = JSON.stringify([
    { id: 'charte', label: 'Charte respectee', checked: true },
    { id: 'textes', label: 'Textes relus', checked: false },
    { id: 'liens', label: 'Liens verifies', checked: false },
    { id: 'formats', label: 'Formats par reseau', checked: true }
  ]);
  const res = await app.fetch(new Request(`http://localhost/api/brouillon/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checklist })
  }));
  console.log('POST checklist →', res.status);

  // 3. GET relu
  const d2 = await (await app.fetch(new Request(`http://localhost/api/brouillon/${id}`))).json();
  const parsed = JSON.parse(d2.checklist);
  console.log('GET relu →', parsed.length, 'items, charte:', parsed[0].checked, '· OK si 4 items');

  // 4. Restaurer vide
  await app.fetch(new Request(`http://localhost/api/brouillon/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checklist: '[]' })
  }));
  console.log('Restauré vide');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
