/**
 * Versioning de la source HTML (chantier 5, la securite qui debloque tout).
 *
 * A chaque depot de source (POST /api/brouillon/:id avec sourceHtml), le contenu
 * precedent est preserve : on ecrit le nouveau HTML sous versions/v{n}.html
 * (Blob prive en cloud, disque local sinon, via storeSlide) et on tient la liste
 * des versions en base (colonne brouillons.versions, JSON).
 *
 * La restauration ne supprime rien : remettre une ancienne version = creer une
 * NOUVELLE version courante avec ce contenu (pattern "restore = commit").
 * L'historique reste intact, la restauration est donc toujours annulable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { storeSlide } from './storage/blob.js';

/** Nombre maximal de versions conservees (les plus anciennes sont purgees). */
export const MAX_VERSIONS = 30;

export interface VersionSource {
  /** Numero de version (1-based, incremente a chaque depot). */
  numero: number;
  /** Chemin relatif stocke, ex 'versions/v1.html'. */
  fichier: string;
  /** URL du blob prive (cloud) ou null (disque local). */
  blobUrl: string | null;
  /** Horodatage ISO du depot. */
  at: string;
  /** Auteur du depot : 'agent' (header x-atelier-auteur) ou 'user'. */
  auteur: string;
  /** Taille du HTML en octets. */
  taille: number;
}

/** Parse la colonne versions (JSON) avec un fallback tolerant. */
export function parseVersions(raw: string | null | undefined): VersionSource[] {
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as VersionSource[]) : [];
  } catch {
    return [];
  }
}

/**
 * Snapshotte le contenu source actuel : ecrit versions/v{n}.html et retourne la
 * nouvelle liste de versions (avec purge au-dela de MAX_VERSIONS).
 */
export async function snapshotSource(
  brouillonId: string,
  sourceHtml: string,
  auteur: string,
  dataDir: string,
  versions: VersionSource[]
): Promise<VersionSource[]> {
  const numero = (versions.length > 0 ? versions[versions.length - 1]!.numero : 0) + 1;
  const fichier = `versions/v${numero}.html`;
  const buffer = Buffer.from(sourceHtml, 'utf-8');
  const stored = await storeSlide(brouillonId, fichier, buffer, dataDir);
  const nouvelle: VersionSource = {
    numero,
    fichier: stored.fichier,
    blobUrl: stored.blobUrl,
    at: new Date().toISOString(),
    auteur,
    taille: buffer.byteLength
  };
  const liste = [...versions, nouvelle];

  // Purge : supprime les fichiers des versions les plus anciennes (best-effort).
  const excedent = liste.length - MAX_VERSIONS;
  if (excedent > 0) {
    for (const v of liste.slice(0, excedent)) {
      try {
        await supprimerFichierVersion(brouillonId, v, dataDir);
      } catch {
        /* la purge ne doit jamais faire echouer le depot */
      }
    }
    return liste.slice(excedent);
  }
  return liste;
}

/** Supprime le fichier d'une version (Blob `del` en cloud, unlink en local). */
async function supprimerFichierVersion(brouillonId: string, v: VersionSource, dataDir: string): Promise<void> {
  if (v.blobUrl) {
    const { del } = await import('@vercel/blob');
    await del(v.blobUrl);
    return;
  }
  const p = path.join(dataDir, brouillonId, v.fichier);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

/**
 * Lit le contenu HTML d'une version. En cloud : URL presignee (pattern identique
 * a la route /b/:id/* : issueSignedToken + presignUrl, pathname sans slash initial).
 * En local : lecture disque.
 */
export async function lireVersion(
  brouillonId: string,
  v: VersionSource,
  dataDir: string
): Promise<string> {
  if (v.blobUrl) {
    const { issueSignedToken, presignUrl } = await import('@vercel/blob');
    const pathname = new URL(v.blobUrl).pathname.replace(/^\//, '');
    const signedToken = await issueSignedToken({
      token: process.env.BLOB_READ_WRITE_TOKEN!,
      pathname,
      operations: ['get']
    });
    const { presignedUrl } = await presignUrl(signedToken, { pathname, access: 'private', operation: 'get' });
    const res = await fetch(presignedUrl);
    if (!res.ok) throw new Error(`version ${v.fichier} illisible (${res.status})`);
    return await res.text();
  }
  const p = path.join(dataDir, brouillonId, v.fichier);
  if (!fs.existsSync(p)) throw new Error(`fichier ${v.fichier} introuvable`);
  return fs.readFileSync(p, 'utf-8');
}
