import fs from 'node:fs';
import path from 'node:path';

/**
 * Abstraction du stockage des slides (PNG). En local (dev, self-host open source,
 * tests) : copie physique sur disque dans dataDir. En cloud (Vercel serverless,
 * pas de disque persistant) : upload vers Vercel Blob, l'URL publique est
 * enregistree dans slides.blob_url et servie par une redirection 302 (voir app.ts).
 *
 * Le mode est detecte via BLOB_READ_WRITE_TOKEN (fourni automatiquement par
 * l'integration Vercel Blob sur le projet atelier-api).
 */
export function isBlobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export interface StoredSlide {
  /** Chemin relatif utilise comme identifiant de fichier dans la base (ex: 'slides/slide-01.png'). */
  fichier: string;
  /** URL publique Vercel Blob, ou null en mode local (le fichier vit sur disque). */
  blobUrl: string | null;
}

/**
 * Persiste un fichier de slide (buffer lu depuis le prototype source) vers le
 * stockage actif. brouillonId + fichier forment un chemin unique (evite les
 * collisions entre brouillons qui auraient le meme nom de fichier).
 */
export async function storeSlide(
  brouillonId: string,
  fichier: string,
  buffer: Buffer,
  dataDir: string
): Promise<StoredSlide> {
  if (isBlobEnabled()) {
    const { put } = await import('@vercel/blob');
    const pathname = `${brouillonId}/${fichier}`;
    const blob = await put(pathname, buffer, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true
    });
    return { fichier, blobUrl: blob.url };
  }

  const destDir = path.join(dataDir, brouillonId, path.dirname(fichier));
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, brouillonId, fichier), buffer);
  return { fichier, blobUrl: null };
}
