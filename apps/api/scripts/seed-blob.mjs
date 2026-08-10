// Seed one-shot : uploade les slides du brouillon existant vers Vercel Blob
// et met a jour slides.blob_url en base Postgres (Neon).
// Usage : node scripts/seed-blob.cjs  (charge ~/.env.local)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';
import pg from 'pg';

const { Client } = pg;

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv(path.resolve(fileURLToPath(import.meta.url), '../../../../.env.local'));
for (const k of ['POSTGRES_URL', 'BLOB_READ_WRITE_TOKEN']) {
  if (!env[k]) {
    console.error(`Manque ${k} dans .env.local`);
    process.exit(1);
  }
  process.env[k] = env[k];
}

const SEED_DIR = '/Users/victorlebarbier/Bordeluche/.hermes-instagram/brouillons';
const ID = 'carrousel-bordeluche-v7';

const client = new Client({ connectionString: env.POSTGRES_URL });
await client.connect();

// Lire les slides en base
const { rows } = await client.query(
  'SELECT id, fichier, blob_url FROM slides WHERE brouillon_id = $1 ORDER BY position',
  [ID]
);
console.log(`Slides en base : ${rows.length}`);

let uploaded = 0;
for (const row of rows) {
  if (row.blob_url) {
    console.log(`  = ${row.fichier} (deja en blob)`);
    continue;
  }
  // Fichier local source (le prototype a les PNG originaux)
  const local = path.join(SEED_DIR, ID, row.fichier);
  if (!fs.existsSync(local)) {
    console.log(`  ! ${row.fichier} introuvable localement (${local})`);
    continue;
  }
  const buffer = fs.readFileSync(local);
  const blob = await put(`${ID}/${row.fichier}`, buffer, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true
  });
  await client.query('UPDATE slides SET blob_url = $1 WHERE id = $2', [blob.url, row.id]);
  console.log(`  + ${row.fichier} → ${blob.url.slice(0, 80)}`);
  uploaded++;
}

console.log(`\n${uploaded} slide(s) uploadee(s) vers Blob.`);
await client.end();
