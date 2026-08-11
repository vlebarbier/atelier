// Test cycle ressources : POST upload (base64) -> GET liste -> GET detail -> DELETE
const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('/Users/victorlebarbier/Atelier/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
process.env.POSTGRES_URL = env.POSTGRES_URL;
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;

// Petit PNG 1x1 valide
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

import('/Users/victorlebarbier/Atelier/apps/api/dist/app.js').then(async (mod) => {
  const app = mod.default;

  // 1. POST upload
  const post = await app.fetch(new Request('http://localhost/api/ressources', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: 'photo-test.png', type: 'image', categorie: 'visuel', contenu: PNG_1PX })
  }));
  const postJson = await post.json();
  console.log('POST upload →', post.status, '| id:', postJson.id);
  const id = postJson.id;

  // 2. POST page archivee
  const postPage = await app.fetch(new Request('http://localhost/api/ressources', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: 'page-test', sourceUrl: 'https://bordeluche.com/accueil', contenu: 'Contenu de la page...' })
  }));
  console.log('POST page →', postPage.status, '| id:', (await postPage.json()).id);

  // 3. GET liste
  const list = await (await app.fetch(new Request('http://localhost/api/ressources'))).json();
  console.log('GET liste →', list.length, 'ressources | types:', list.map((r) => r.type).join(', '));

  // 4. GET detail (URL signee si Blob)
  const detail = await (await app.fetch(new Request(`http://localhost/api/ressource/${id}`))).json();
  console.log('GET detail →', detail.nom, '| taille:', detail.taille, '| url:', detail.url ? detail.url.slice(0, 40) + '...' : 'null');

  // 5. DELETE
  const del = await app.fetch(new Request(`http://localhost/api/ressource/${id}`, { method: 'DELETE' }));
  console.log('DELETE →', del.status);
  const list2 = await (await app.fetch(new Request('http://localhost/api/ressources'))).json();
  console.log('GET liste apres delete →', list2.length, 'ressources | OK si 1 (la page reste)');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
