import fs from 'node:fs';
import path from 'node:path';
import type { Repo } from './db/repo.js';
import { storeSlide } from './storage/blob.js';

interface PrototypeMeta {
  titre?: string;
  statut?: string;
  notes?: string;
  reseaux?: Record<string, unknown>;
  updated?: string;
}

/**
 * Importe les brouillons existants du prototype (dossier <sourceDir>/<id>/{slides/,meta.json})
 * vers le repository (SQLite ou Postgres) + stockage image actif (disque local ou
 * Vercel Blob). Idempotent : ignore les id deja presents en base.
 */
export async function seedFromPrototype(repo: Repo, sourceDir: string, dataDir: string): Promise<number> {
  if (!fs.existsSync(sourceDir)) return 0;

  let imported = 0;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const entry of entries) {
    const id = entry.name;
    if (await repo.brouillonExists(id)) continue;

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
    let fichiers: string[] = [];
    const blobUrls = new Map<string, string | null>();

    if (fs.existsSync(srcSlidesDir)) {
      fichiers = fs
        .readdirSync(srcSlidesDir)
        .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        .sort();
      for (const f of fichiers) {
        const buffer = fs.readFileSync(path.join(srcSlidesDir, f));
        const stored = await storeSlide(id, `slides/${f}`, buffer, dataDir);
        blobUrls.set(stored.fichier, stored.blobUrl);
      }
    }

    await repo.insertBrouillon({
      id,
      titre: meta.titre || id.replace(/[-_]/g, ' '),
      statut: meta.statut || 'brouillon',
      notes: meta.notes || '',
      reseaux: JSON.stringify(meta.reseaux || {}),
      updatedAt: meta.updated || new Date().toISOString()
    });

    for (let i = 0; i < fichiers.length; i += 1) {
      const fichier = `slides/${fichiers[i]}`;
      await repo.insertSlide({
        brouillonId: id,
        fichier,
        position: i,
        blobUrl: blobUrls.get(fichier) ?? null
      });
    }

    imported += 1;
  }

  return imported;
}
