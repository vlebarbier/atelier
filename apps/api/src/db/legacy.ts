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
      source_html TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brouillon_id TEXT NOT NULL,
      fichier TEXT NOT NULL,
      position INTEGER NOT NULL,
      blob_url TEXT
    );
    CREATE TABLE IF NOT EXISTS chartes (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL DEFAULT 'Charte principale',
      data TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT
    );
  `);
  // Migration douce : ajoute les colonnes si la table existait sans elles.
  const brouillonsCols = sqlite.prepare(`PRAGMA table_info(brouillons)`).all() as { name: string }[];
  if (!brouillonsCols.some((c) => c.name === 'source_html')) {
    sqlite.exec(`ALTER TABLE brouillons ADD COLUMN source_html TEXT;`);
  }
  if (!brouillonsCols.some((c) => c.name === 'charte_id')) {
    sqlite.exec(`ALTER TABLE brouillons ADD COLUMN charte_id TEXT DEFAULT 'principale';`);
  }
  if (!brouillonsCols.some((c) => c.name === 'checklist')) {
    sqlite.exec(`ALTER TABLE brouillons ADD COLUMN checklist TEXT NOT NULL DEFAULT '[]';`);
  }
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ressources (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'fichier',
      categorie TEXT NOT NULL DEFAULT 'autre',
      fichier TEXT,
      blob_url TEXT,
      taille INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      updated_at TEXT
    );
  `);
  const slidesCols = sqlite.prepare(`PRAGMA table_info(slides)`).all() as { name: string }[];
  if (!slidesCols.some((c) => c.name === 'blob_url')) {
    sqlite.exec(`ALTER TABLE slides ADD COLUMN blob_url TEXT;`);
  }
}
