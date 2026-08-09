import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type Sqlite = Database.Database;
export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

/** Ouvre (ou cree) le fichier SQLite. Utilise ':memory:' pour les tests. */
export function openSqlite(filePath: string): Sqlite {
  const sqlite = new Database(filePath);
  sqlite.pragma('journal_mode = WAL');
  return sqlite;
}

export function createDb(sqlite: Sqlite): AppDb {
  return drizzle(sqlite, { schema });
}
