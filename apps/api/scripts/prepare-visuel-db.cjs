// Cree une COPIE de la base SQLite locale enrichie de quelques actions agent
// recents (pour la capture visuelle). N'ecrit JAMAIS dans la base d'origine.
const fs = require('node:fs');
const Database = require('better-sqlite3');

const SRC = '/Users/victorlebarbier/Atelier/apps/api/data/atelier.db';
const DST = '/tmp/atelier-visuel.db';
fs.copyFileSync(SRC, DST);

const db = new Database(DST);
const now = Date.now();
const t = (minAgo) => new Date(now - minAgo * 60 * 1000).toISOString();

const insert = db.prepare(
  `INSERT INTO journal (type, auteur, brouillon_id, brouillon_titre, message, details, created_at)
   VALUES (?, 'agent', ?, ?, ?, ?, ?)`
);

const seed = [
  ['depot_source', 'carrousel-bordeluche-v7', 'Carrousel, Pourquoi Bordeluche existe (v7)', 'a depose la source HTML (carrousel-v7.html)', '{"octets":48213}', t(6)],
  ['regeneration', 'carrousel-bordeluche-v7', 'Carrousel, Pourquoi Bordeluche existe (v7)', 'a regenere les 9 slides depuis la source', '{"nb":9}', t(25)],
  ['reponse_chat', 'carrousel-bordeluche-v7', 'Carrousel, Pourquoi Bordeluche existe (v7)', 'a repondu dans la conversation (214 caracteres)', '{}', t(47)],
  ['depot_ressource', null, null, 'a depose une ressource : "photos-terrasse.png"', '{"type":"image","categorie":"photos"}', t(90)]
];
for (const s of seed) insert.run(...s);
db.close();
console.log('copie enrichie : /tmp/atelier-visuel.db (' + seed.length + ' actions agent ajoutees)');
