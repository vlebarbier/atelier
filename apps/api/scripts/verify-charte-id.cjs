// Vérif F-32 : migration charte_id + GET détail renvoie charteId
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
  const detail = await (await app.fetch(new Request('http://localhost/api/brouillon/carrousel-bordeluche-v7'))).json();
  console.log('charteId du brouillon:', detail.charteId, '(principale attendu)');
  console.log('OK si: charteId=principale');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
