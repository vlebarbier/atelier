/**
 * Snapshot "avant" pour le diff visuel (chantier 3, le facteur de confiance).
 *
 * Quand les slides d'un brouillon sont remplacees (POST /slides, regeneration),
 * les anciennes images sont copiees sous avant/<horodatage>/ AVANT que le nouveau
 * rendu ne les ecrase (en Blob, allowOverwrite:true ecrase le meme pathname ; en
 * local, le disque est ecrase). Ces copies restent servies par la route /b/:id/*
 * (fichier = 'avant/<ts>/slide-NN.png'), ce qui permet a l'UI d'afficher un
 * avant/apres cote a cote avec les zones modifiees encadrees.
 *
 * Le chantier 5 (versioning source HTML) utilisera un prefixe distinct (versions/),
 * ces deux mecanismes sont complementaires : ici on capture les PIXELS avant,
 * la-bas on versionne la SOURCE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isBlobEnabled, storeSlide } from './storage/blob.js';
import type { SlideRow } from './db/repo.js';

export interface DiffAvant {
  /** Chemin relatif (servi par /b/:id/*), ex: 'avant/2026-08-12T11-30-05-123Z/slide-01.png'. */
  fichier: string;
  /** URL du blob prive (uniquement en mode cloud ; null en local). */
  blobUrl: string | null;
  typeMedia: string;
}

export interface SnapshotAvant {
  at: string;
  avant: DiffAvant[];
}

/** Horodatage lisible et sans collision pour le dossier avant/<ts>/. */
export function horodatageDiff(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

/**
 * Lit le contenu d'un blob prive Vercel via une URL presignee (pattern identique
 * a la route /b/:id/* : issueSignedToken + presignUrl, pathname sans slash initial).
 */
async function lireBlobPrive(blobUrl: string): Promise<Buffer> {
  const { issueSignedToken, presignUrl } = await import('@vercel/blob');
  const pathname = new URL(blobUrl).pathname.replace(/^\//, '');
  const signedToken = await issueSignedToken({
    token: process.env.BLOB_READ_WRITE_TOKEN!,
    pathname,
    operations: ['get']
  });
  const { presignedUrl } = await presignUrl(signedToken, { pathname, access: 'private', operation: 'get' });
  const res = await fetch(presignedUrl);
  if (!res.ok) throw new Error(`blob ${pathname} illisible (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Copie les slides actuelles vers avant/<ts>/ avant leur remplacement.
 * Chaque echec individuel est ignore (le diff est partiel plutot que de faire
 * echouer la regeneration) ; si aucune copie ne reussit, avant est vide et
 * l'appelant ne stockera pas de diff.
 */
export async function snapshotSlidesAvant(
  slides: SlideRow[],
  brouillonId: string,
  dataDir: string
): Promise<SnapshotAvant> {
  const at = horodatageDiff();
  const avant: DiffAvant[] = [];

  for (const slide of slides) {
    const base = path.basename(slide.fichier);
    const cible = `avant/${at}/${base}`;
    try {
      let buffer: Buffer;
      if (slide.blobUrl) {
        buffer = await lireBlobPrive(slide.blobUrl);
      } else {
        const source = path.join(dataDir, brouillonId, slide.fichier);
        if (!fs.existsSync(source)) continue;
        buffer = fs.readFileSync(source);
      }
      const result = await storeSlide(brouillonId, cible, buffer, dataDir);
      avant.push({ fichier: result.fichier, blobUrl: result.blobUrl, typeMedia: slide.typeMedia || 'image' });
    } catch (err) {
      console.warn(`[diff] snapshot avant echoue pour ${slide.fichier}:`, err instanceof Error ? err.message : err);
    }
  }

  return { at, avant };
}
