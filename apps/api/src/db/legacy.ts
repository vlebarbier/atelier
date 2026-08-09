import type { Sqlite } from './client.js';

/**
 * Cree les tables si elles n'existent pas encore.
 *
 * Ceci est le filet de securite historique de la Phase 1 (avant l'introduction
 * de drizzle-kit). On le garde volontairement : il est idempotent (IF NOT EXISTS)
 * et garantit que les tests en memoire ou une base jamais migree fonctionnent
 * meme si le dossier de migrations drizzle/ est absent ou desynchronise.
 * La Phase 2 ajoute par-dessus migrateWithDrizzle() (voir ./migrate.ts) qui
 * gere l'evolution de schema future via drizzle-kit generate + migrate.
 */
export function ensureLegacyTables(sqlite: Sqlite): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS brouillons (
      id TEXT PRIMARY KEY,
      titre TEXT NOT NULL,
      statut TEXT NOT NULL DEFAULT 'brouillon',
      notes TEXT NOT NULL DEFAULT '',
      reseaux TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brouillon_id TEXT NOT NULL,
      fichier TEXT NOT NULL,
      position INTEGER NOT NULL
    );
  `);
}
