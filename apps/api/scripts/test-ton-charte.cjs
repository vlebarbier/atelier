// Test F-13 + F-20 + F-12 : charte avec ton -> get_charte renvoie le bloc instructions
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

  // 1. Sauvegarder la charte Bordeluche AVEC le ton et les mots à éviter
  const charteData = {
    couleurs: { bordeaux: '#422928', ivoire: '#f1efea', sauge: '#6f7f75', perle: '#b0bbb4', gold: '#e8c97a' },
    polices: { titre: 'Cormorant Garamond', texte: 'Jost' },
    logos: ['logo-bordeluche.svg'],
    ton: { voix: 'Expert ami, pas agence. Direct, sans jargon IA. Des chiffres, pas des adjectifs. Première personne : on/nous pour l\'opérationnel, je pour Victor.' },
    motsEviter: ['ultra', 'maximum', 'clé en main', 'exceptionnel']
  };
  const put = await app.fetch(new Request('http://localhost/api/charte', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: 'Bordeluche', data: JSON.stringify(charteData) })
  }));
  console.log('PUT charte avec ton →', put.status);

  // 2. GET relu
  const get = await (await app.fetch(new Request('http://localhost/api/charte'))).json();
  const parsed = JSON.parse(get.data);
  console.log('GET relu → ton:', parsed.ton.voix.slice(0, 40) + '...', '| motsEviter:', parsed.motsEviter.length);

  // 3. Simuler l'outil get_charte du MCP (formatage du bloc instructions)
  const couleurs = parsed.couleurs || {};
  const polices = parsed.polices || {};
  const ton = parsed.ton || {};
  const lignes = [];
  lignes.push('# Charte graphique : ' + (get.nom || 'principale'));
  if (Object.keys(couleurs).length) {
    lignes.push('## Couleurs (tokens)');
    for (const [n, v] of Object.entries(couleurs)) lignes.push('- ' + n + ': ' + v);
  }
  if (polices.titre || polices.texte) {
    lignes.push('## Typographie');
    if (polices.titre) lignes.push('- Titres: ' + polices.titre);
    if (polices.texte) lignes.push('- Texte: ' + polices.texte);
  }
  if (ton.voix) { lignes.push('## Ton'); lignes.push(ton.voix); }
  if (Array.isArray(parsed.motsEviter) && parsed.motsEviter.length) {
    lignes.push('## Mots à éviter');
    lignes.push(parsed.motsEviter.join(', '));
  }
  console.log('\n--- BLOC INSTRUCTIONS (ce que reçoit l\'agent) ---');
  console.log(lignes.join('\n'));
}).catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
