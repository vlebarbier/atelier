import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createDb, openSqlite } from './db/client.js';
import { ensureLegacyTables } from './db/legacy.js';
import { migrateWithDrizzle } from './db/migrate.js';
import { seedFromPrototype } from './seed.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dir, '..');

const PORT = Number(process.env.API_PORT) || 4310;
const DB_PATH = process.env.API_DB_PATH || path.join(apiRoot, 'data', 'atelier.db');
const DATA_DIR = path.join(apiRoot, 'data', 'brouillons');
const SEED_DIR =
  process.env.API_BROUILLONS_SEED_DIR ||
  '/Users/victorlebarbier/Bordeluche/.hermes-instagram/brouillons';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = openSqlite(DB_PATH);
ensureLegacyTables(sqlite);
migrateWithDrizzle(sqlite);
const db = createDb(sqlite);

const imported = seedFromPrototype(db, SEED_DIR, DATA_DIR);
if (imported > 0) {
  console.log(`Atelier API : ${imported} brouillon(s) importe(s) depuis le prototype.`);
}

const app = createApp(db, { dataDir: DATA_DIR });

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Atelier API sur http://localhost:${info.port}`);
  console.log(`Base : ${DB_PATH}`);
  console.log(`Donnees : ${DATA_DIR}`);
});
