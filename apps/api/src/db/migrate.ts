import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Sqlite } from './client.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(dir, '..', '..', 'drizzle');

interface JournalEntry {
  idx: number;
  tag: string;
}

interface Journal {
  entries: JournalEntry[];
}

/**
 * Applique les migrations generees par drizzle-kit (apps/api/drizzle/).
 *
 * Particularite : la base atelier.db existante en Phase 1 a ete creee par un
 * CREATE TABLE manuel (ensureLegacyTables), pas par une migration drizzle.
 * Rejouer telle quelle la migration 0000 generee (qui contient les memes
 * CREATE TABLE) casserait sur "table already exists". On "baseline" donc :
 * si les tables existent deja, on enregistre les migrations comme deja
 * appliquees dans __drizzle_migrations sans rejouer leur SQL. Sur une base
 * neuve (pas de table brouillons), le SQL est reellement execute.
 *
 * Schema futur : `npm run db:generate` (apps/api) puis relancer l'API (ou
 * `npm run db:migrate`) rejoue uniquement les nouvelles migrations.
 */
export function migrateWithDrizzle(sqlite: Sqlite): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at NUMERIC
    );
  `);

  if (!fs.existsSync(migrationsDir)) return;
  const journalPath = path.join(migrationsDir, 'meta', '_journal.json');
  if (!fs.existsSync(journalPath)) return;

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8')) as Journal;
  const applied = new Set(
    (sqlite.prepare('SELECT hash FROM __drizzle_migrations').all() as { hash: string }[]).map((r) => r.hash)
  );

  const hasBrouillons = Boolean(
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='brouillons'").get()
  );
  const isBaselineRun = hasBrouillons && applied.size === 0;

  const insertStmt = sqlite.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)');

  for (const entry of journal.entries) {
    if (applied.has(entry.tag)) continue;

    if (!isBaselineRun) {
      const sqlFile = path.join(migrationsDir, `${entry.tag}.sql`);
      if (fs.existsSync(sqlFile)) {
        const sql = fs.readFileSync(sqlFile, 'utf8');
        sqlite.exec(sql);
      }
    }
    // En baseline (base legacy deja peuplee), on marque simplement comme applique.

    insertStmt.run(entry.tag, Date.now());
  }
}
