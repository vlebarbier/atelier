// Test cycle complet : créer un brouillon puis le supprimer (mode Postgres local)
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
  const created = await (await app.fetch(new Request('http://localhost/api/brouillons', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
  }))).json();
  console.log('Créé:', created.id);

  const delRes = await app.fetch(new Request('http://localhost/api/brouillon/' + created.id, { method: 'DELETE' }));
  console.log('DELETE →', delRes.status);

  const list = await (await app.fetch(new Request('http://localhost/api/brouillons'))).json();
  console.log('Disparu de la liste:', !list.find((b) => b.id === created.id));
  console.log('Total brouillons:', list.length);
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
