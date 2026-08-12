import type { Pool } from 'pg';

/**
 * Cree les tables Postgres si elles n'existent pas encore (equivalent Postgres de
 * ensureLegacyTables pour SQLite). Idempotent (IF NOT EXISTS), pas de dependance a
 * drizzle-kit : garde le meme esprit "filet de securite" que le mode local.
 */
export async function ensurePgTables(pool: Pool): Promise<void> {
  await pool.query(`
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
      id SERIAL PRIMARY KEY,
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

  // Migration douce : ajoute les colonnes si la table existait dans une version anterieure.
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS source_html TEXT;`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS charte_id TEXT DEFAULT 'principale';`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS checklist TEXT NOT NULL DEFAULT '[]';`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS conversation TEXT NOT NULL DEFAULT '[]';`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'carrousel';`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS programme TEXT;`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS article TEXT;`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS diff TEXT;`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS versions TEXT;`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS annotations TEXT NOT NULL DEFAULT '[]';`);
  await pool.query(`ALTER TABLE brouillons ADD COLUMN IF NOT EXISTS decision TEXT;`);
  await pool.query(`ALTER TABLE slides ADD COLUMN IF NOT EXISTS type_media TEXT NOT NULL DEFAULT 'image';`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ressources (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'fichier',
    categorie TEXT NOT NULL DEFAULT 'autre',
    fichier TEXT,
    blob_url TEXT,
    taille INTEGER NOT NULL DEFAULT 0,
    source_url TEXT,
    updated_at TEXT
  );`);
  await pool.query(`ALTER TABLE slides ADD COLUMN IF NOT EXISTS blob_url TEXT;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS journal (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      auteur TEXT NOT NULL DEFAULT 'agent',
      brouillon_id TEXT,
      brouillon_titre TEXT,
      message TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `);
}
