// Test cycle charte : GET vide → PUT charte Bordeluche → GET relu
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

  // 1. GET initial (vide attendu)
  const g1 = await (await app.fetch(new Request('http://localhost/api/charte'))).json();
  console.log('GET initial →', g1.nom, '· data:', g1.data);

  // 2. PUT la charte Bordeluche
  const charte = {
    nom: 'Bordeluche',
    data: {
      couleurs: { bordeaux: '#422928', ivoire: '#f1efea', sauge: '#6f7f75', gold: '#e8c97a' },
      polices: { titre: 'Cormorant Garamond', texte: 'Jost' },
      logos: []
    }
  };
  const putRes = await app.fetch(new Request('http://localhost/api/charte', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(charte)
  }));
  console.log('PUT →', putRes.status);
  const saved = await putRes.json();
  console.log('Sauvé:', saved.nom, '· couleurs:', JSON.parse(saved.data).couleurs.bordeaux);

  // 3. GET relu
  const g2 = await (await app.fetch(new Request('http://localhost/api/charte'))).json();
  const parsed = JSON.parse(g2.data);
  console.log('GET relu →', g2.nom, '· polices:', parsed.polices.titre, '+', parsed.polices.texte);
  console.log('Persisté:', g2.nom === 'Bordeluche' && parsed.couleurs.gold === '#e8c97a');
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
