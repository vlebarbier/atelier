// Inspection read-only du journal de la vraie base SQLite locale (jamais modifiee).
const Database = require('better-sqlite3');
const db = new Database('/Users/victorlebarbier/Atelier/apps/api/data/atelier.db', { readonly: true });
const rows = db.prepare('SELECT auteur, type, count(*) n FROM journal GROUP BY auteur, type ORDER BY auteur').all();
console.log('PAR AUTEUR/TYPE');
rows.forEach((r) => console.log(r.auteur, r.type, r.n));
const agents = db.prepare("SELECT id, type, message, created_at FROM journal WHERE auteur='agent' ORDER BY id DESC LIMIT 6").all();
console.log('--- 6 dernieres actions agent ---');
agents.forEach((a) => console.log(a.type, '|', String(a.message).slice(0, 60), '|', a.created_at));
db.close();
