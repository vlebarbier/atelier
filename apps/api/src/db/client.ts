import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as schemaPg from './schema-pg.js';

export type Sqlite = Database.Database;
export type AppDb = ReturnType<typeof drizzleSqlite<typeof schema>>;
export type AppDbPg = ReturnType<typeof drizzlePg<typeof schemaPg>>;

/** Ouvre (ou cree) le fichier SQLite. Utilise ':memory:' pour les tests. */
export function openSqlite(filePath: string): Sqlite {
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  return sqlite;
}

export function createDb(sqlite: Sqlite): AppDb {
  return drizzleSqlite(sqlite, { schema });
}

/**
 * Determine si l'API doit fonctionner en mode cloud (Postgres) plutot qu'en
 * mode local (SQLite). Sur Vercel, POSTGRES_URL / DATABASE_URL sont fournies
 * automatiquement par l'integration Neon. En local sans ces variables, on
 * reste sur better-sqlite3 (comportement historique, inchange).
 */
export function isPostgres(): boolean {
  return Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

function postgresConnectionString(): string {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('POSTGRES_URL ou DATABASE_URL requis en mode Postgres');
  }
  return url;
}

/** Cree le pool node-postgres. La chaine Neon impose SSL. */
export function createPgPool(): Pool {
  return new Pool({
    connectionString: postgresConnectionString(),
    ssl: { rejectUnauthorized: false }
  });
}

export function createDbPg(pool: Pool): AppDbPg {
  return drizzlePg(pool, { schema: schemaPg });
}
