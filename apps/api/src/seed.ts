import fs from 'node:fs';
import path from 'node:path';
import { brouillons, slides } from './db/schema.js';
import type { AppDb } from './db/client.js';

interface PrototypeMeta {
  titre?: string;
  statut?: string;
  notes?: string;
  reseaux?: Record<string, unknown>;
  updated?: string;
}

/**
 * Importe les brouillons existants du prototype (dossier <sourceDir>/<id>/{slides/,meta.json})
 * vers la base SQLite + dataDir (copie physique des PNG). Idempotent : ignore les id deja presents.
 */
export function seedFromPrototype(db: AppDb, sourceDir: string, dataDir: string): number {
  if (!fs.existsSync(sourceDir)) return 0;

  let imported = 0;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const entry of entries) {
    const id = entry.name;
    const existing = db.select().from(brouillons).all().find((b) => b.id === id);
    if (existing) continue;

    const srcDir = path.join(sourceDir, id);
    const metaPath = path.join(srcDir, 'meta.json');
    let meta: PrototypeMeta = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        meta = {};
      }
    }

    const srcSlidesDir = path.join(srcDir, 'slides');
    const destDir = path.join(dataDir, id);
    const destSlidesDir = path.join(destDir, 'slides');
    let fichiers: string[] = [];

    if (fs.existsSync(srcSlidesDir)) {
      fs.mkdirSync(destSlidesDir, { recursive: true });
      fichiers = fs
        .readdirSync(srcSlidesDir)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .sort();
      for (const f of fichiers) {
        fs.copyFileSync(path.join(srcSlidesDir, f), path.join(destSlidesDir, f));
      }
    }

    db.insert(brouillons)
      .values({
        id,
        titre: meta.titre || id.replace(/[-_]/g, ' '),
        statut: meta.statut || 'brouillon',
        notes: meta.notes || '',
        reseaux: JSON.stringify(meta.reseaux || {}),
        updatedAt: meta.updated || new Date().toISOString()
      })
      .run();

    fichiers.forEach((f, i) => {
      db.insert(slides)
        .values({ brouillonId: id, fichier: `slides/${f}`, position: i })
        .run();
    });

    imported += 1;
  }

  return imported;
}
