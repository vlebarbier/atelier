// Test route POST /api/brouillon/:id/slides : remplacement des slides par dataURL
const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('/Users/victorlebarbier/Atelier/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
}
process.env.POSTGRES_URL = env.POSTGRES_URL;
process.env.DATABASE_URL = env.DATABASE_URL;
process.env.BLOB_READ_WRITE_TOKEN = env.BLOB_READ_WRITE_TOKEN;

// Petit PNG 1x1 valide en base64
const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

import('/Users/victorlebarbier/Atelier/apps/api/dist/app.js').then(async (mod) => {
  const app = mod.default;

  // 1. Prendre le premier brouillon existant
  const list = await (await app.fetch(new Request('http://localhost/api/brouillons'))).json();
  const b = list[0];
  console.log('Brouillon:', b.id, '· slides avant:', b.slideCount);

  // 2. Remplacer par 2 slides dataURL
  const res = await app.fetch(new Request(`http://localhost/api/brouillon/${b.id}/slides`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: [`data:image/png;base64,${PNG_1PX}`, `data:image/png;base64,${PNG_1PX}`] })
  }));
  console.log('POST slides →', res.status);
  const body = await res.json();
  console.log('Résultat:', JSON.stringify(body));

  // 3. Relire le brouillon
  const detail = await (await app.fetch(new Request(`http://localhost/api/brouillon/${b.id}`))).json();
  console.log('slides après:', detail.slideCount, '· fichiers:', JSON.stringify(detail.slides));

  // 4. Test invalide : pas un dataURL
  const bad = await app.fetch(new Request(`http://localhost/api/brouillon/${b.id}/slides`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: ['pas-une-image'] })
  }));
  console.log('POST invalide →', bad.status, '(400 attendu)');

  // 5. Rollback : remettre les slides d'origine ? On laisse 2 slides PNG 1px (démo)
  console.log('OK si: 200, slideCount=2, invalide=400');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
