// Nettoyage : remet la conversation du brouillon a vide
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
  // updateBrouillon accepte conversation via le patch generic
  await app.fetch(new Request(`http://localhost/api/brouillon/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation: '[]' })
  }));
  const d = await (await app.fetch(new Request(`http://localhost/api/brouillon/${id}`))).json();
  console.log('Conversation apres cleanup:', d.conversation, '| OK si []');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
