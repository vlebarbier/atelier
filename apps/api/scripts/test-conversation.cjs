// Test : conversation avec l'agent (POST message user + role agent + GET relu)
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

  // 1. GET initial : type + conversation vide
  const d0 = await (await app.fetch(new Request(`http://localhost/api/brouillon/${id}`))).json();
  console.log('GET initial → type:', d0.type, '| conversation:', d0.conversation);

  // 2. POST message user
  const m1 = await app.fetch(new Request(`http://localhost/api/brouillon/${id}/message`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texte: 'Change le texte de la slide 3 : mets en avant le duplex Gambetta.' })
  }));
  const j1 = await m1.json();
  console.log('POST message user →', m1.status, '| messages:', j1.conversation?.length);

  // 3. POST réponse agent (simule l'agent via MCP)
  const m2 = await app.fetch(new Request(`http://localhost/api/brouillon/${id}/message`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texte: 'C\'est fait, slide 3 mise à jour. Régénérée depuis le HTML source.', role: 'agent' })
  }));
  const j2 = await m2.json();
  console.log('POST reponse agent →', m2.status, '| derniere:', j2.conversation?.at(-1)?.role, '-', j2.conversation?.at(-1)?.texte?.slice(0, 40));

  // 4. GET relu
  const d2 = await (await app.fetch(new Request(`http://localhost/api/brouillon/${id}`))).json();
  const conv = JSON.parse(d2.conversation);
  console.log('GET relu →', conv.length, 'messages | roles:', conv.map((m) => m.role).join(', '), '| OK si user, agent');

  // 5. Nettoyer (restaurer conversation vide)
  await app.fetch(new Request(`http://localhost/api/brouillon/${id}/message`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texte: 'x' })
  }));
  await (await import('node:fs')).promises;
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
