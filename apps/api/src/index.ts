import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp, backfillJournal } from './app.js';
import { createDb, createDbPg, createPgPool, isPostgres, openSqlite } from './db/client.js';
import { ensureLegacyTables } from './db/legacy.js';
import { migrateWithDrizzle } from './db/migrate.js';
import { ensurePgTables } from './db/migrate-pg.js';
import { createSqliteRepo } from './db/repo-sqlite.js';
import { createPgRepo } from './db/repo-pg.js';
import type { Repo } from './db/repo.js';
import { seedFromPrototype } from './seed.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dir, '..');

const PORT = Number(process.env.API_PORT) || 4310;
const DB_PATH = process.env.API_DB_PATH || path.join(apiRoot, 'data', 'atelier.db');
const DATA_DIR = path.join(apiRoot, 'data', 'brouillons');
const SEED_DIR =
  process.env.API_BROUILLONS_SEED_DIR ||
  '/Users/victorlebarbier/Bordeluche/.hermes-instagram/brouillons';

async function buildRepo(): Promise<Repo> {
  if (isPostgres()) {
    const pool = createPgPool();
    await ensurePgTables(pool);
    const db = createDbPg(pool);
    console.log('Atelier API : mode Postgres (Neon).');
    return createPgRepo(db);
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = openSqlite(DB_PATH);
  ensureLegacyTables(sqlite);
  migrateWithDrizzle(sqlite);
  const db = createDb(sqlite);
  console.log('Atelier API : mode SQLite local.');
  return createSqliteRepo(db);
}

const repo = await buildRepo();

const imported = await seedFromPrototype(repo, SEED_DIR, DATA_DIR);
if (imported > 0) {
  console.log(`Atelier API : ${imported} brouillon(s) importe(s) depuis le prototype.`);
}

// Derive le journal des updatedAt existants au premier boot : le fil d'activite
// est vrai des le premier chargement (meme comportement que le mode Postgres).
await backfillJournal(repo);

const app = createApp(repo, { dataDir: DATA_DIR });

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Atelier API sur http://localhost:${info.port}`);
  console.log(`Donnees : ${DATA_DIR}`);
});
