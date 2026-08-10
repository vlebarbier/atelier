import { Hono } from 'hono';
import { createApp } from './app.js';
import { createDbPg, createPgPool, isPostgres, createDb, openSqlite } from './db/client.js';
import { ensurePgTables } from './db/migrate-pg.js';
import { ensureLegacyTables } from './db/legacy.js';
import { migrateWithDrizzle } from './db/migrate.js';
import { createPgRepo } from './db/repo-pg.js';
import { createSqliteRepo } from './db/repo-sqlite.js';
import type { Repo } from './db/repo.js';

/**
 * Point d'entree serverless Vercel (framework Hono : src/server.ts, export default).
 *
 * IMPORTANT : pas de top-level await (Vercel ne le supporte pas dans le module
 * d'entree — l'export default serait une Promise, d'ou "Invalid export").
 * Le repo est construit paresseusement au premier appel et mis en cache sur
 * l'instance (Fluid compute). En mode Postgres (Vercel + Neon), aucun disque
 * persistant n'est necessaire. En fallback local (/tmp, jamais en prod), le
 * disque est ephemere : le seed se fait via scripts/seed-prod.ts.
 */
let repoPromise: Promise<Repo> | null = null;

async function getRepo(): Promise<Repo> {
  if (!repoPromise) {
    repoPromise = (async () => {
      if (isPostgres()) {
        const pool = createPgPool();
        await ensurePgTables(pool);
        const db = createDbPg(pool);
        return createPgRepo(db);
      }
      const DB_PATH = process.env.API_DB_PATH || '/tmp/atelier.db';
      const sqlite = openSqlite(DB_PATH);
      ensureLegacyTables(sqlite);
      migrateWithDrizzle(sqlite);
      const db = createDb(sqlite);
      return createSqliteRepo(db);
    })();
  }
  return repoPromise;
}

// Wrapper Hono : construit le repo au premier appel puis delègue a l'app reelle.
const wrapper = new Hono();

wrapper.use('*', async (c, next) => {
  const repo = await getRepo();
  const app = createApp(repo, { dataDir: process.env.API_DATA_DIR || '/tmp/atelier-data' });
  // Route la requete vers l'app interne, puis renvoie la reponse.
  const res = await app.fetch(c.req.raw, c.env);
  return res;
});

export default wrapper;
