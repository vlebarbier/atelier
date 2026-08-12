/**
 * Moteur du diff visuel avant/apres (chantier 3, le facteur de confiance).
 *
 * Le serveur a fige les slides AVANT la derniere regeneration (colonne diff,
 * snapshots sous avant/<ts>/). Ici, on compare les pixels de l'avant et de
 * l'apres dans le navigateur : les deux images sont echantillonnees sur une
 * grille reduite (12x12), les cellules dont la couleur moyenne a change sont
 * groupees en zones connexes, et chaque zone devient un rectangle encadre
 * (coordonnees normalisees 0..1, superposable a l'image affichee).
 *
 * Le calcul cote client evite toute dependance native cote serveur (pas de
 * sharp en serverless) et le CORS est ouvert sur l'API et les URLs Blob
 * presignees (verifie en prod : access-control-allow-origin: * partout).
 */
import type { DiffData } from './api';
import { slideUrl } from './api';

/** Rectangle de zone modifiee, en fractions de la slide (0..1). */
export interface ZoneDiff {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Comparaison {
  /** Slide sans equivalent avant (nouvellement creee). */
  nouvelle: boolean;
  zones: ZoneDiff[];
  /** Proportion de cellules modifiees (0..1), intensite du changement. */
  score: number;
}

/** Resolution de comparaison : la grille est un carre GRILLE x GRILLE de cellules. */
const GRILLE = 12;
/** Difference moyenne par pixel (sur 255) au-dessus de laquelle une cellule est modifiee. */
const SEUIL = 12;

function chargerImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image illisible pour la comparaison'));
    img.src = url;
  });
}

/** Echantillonne une image sur la grille GRILLE x GRILLE (moyenne par cellule via le downscale du canvas). */
async function echantillonner(url: string): Promise<Uint8ClampedArray> {
  const img = await chargerImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = GRILLE;
  canvas.height = GRILLE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(img, 0, 0, GRILLE, GRILLE);
  return ctx.getImageData(0, 0, GRILLE, GRILLE).data;
}

function differenceMoyenne(a: Uint8ClampedArray, b: Uint8ClampedArray, offset: number): number {
  const dr = Math.abs((a[offset] ?? 0) - (b[offset] ?? 0));
  const dg = Math.abs((a[offset + 1] ?? 0) - (b[offset + 1] ?? 0));
  const db = Math.abs((a[offset + 2] ?? 0) - (b[offset + 2] ?? 0));
  return (dr + dg + db) / 3;
}

interface Bbox {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/**
 * Compare les pixels d'une slide avant/ apres. Renvoie les zones modifiees en
 * coordonnees normalisees et un score d'intensite.
 */
export async function comparerSlides(avantUrl: string | null, apresUrl: string): Promise<Comparaison> {
  if (!avantUrl) return { nouvelle: true, zones: [], score: 0 };

  const [a, b] = await Promise.all([echantillonner(avantUrl), echantillonner(apresUrl)]);

  // Carte des cellules modifiees.
  const modifie: boolean[] = new Array(GRILLE * GRILLE).fill(false);
  let nb = 0;
  for (let i = 0; i < GRILLE * GRILLE; i++) {
    const m = differenceMoyenne(a, b, i * 4) > SEUIL;
    modifie[i] = m;
    if (m) nb++;
  }
  if (nb === 0) return { nouvelle: false, zones: [], score: 0 };

  // Composantes connexes (4-connectivite) : chaque composante devient une bbox.
  const vu: boolean[] = new Array(GRILLE * GRILLE).fill(false);
  const composantes: Bbox[] = [];
  for (let row = 0; row < GRILLE; row++) {
    for (let col = 0; col < GRILLE; col++) {
      const idx = row * GRILLE + col;
      if (!modifie[idx] || vu[idx]) continue;
      const pile: number[] = [idx];
      vu[idx] = true;
      let minCol = col;
      let maxCol = col;
      let minRow = row;
      let maxRow = row;
      while (pile.length > 0) {
        const cur = pile.pop() as number;
        const r = Math.floor(cur / GRILLE);
        const c = cur % GRILLE;
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        for (const v of [cur - GRILLE, cur + GRILLE, cur - 1, cur + 1]) {
          if (v < 0 || v >= GRILLE * GRILLE) continue;
          const vr = Math.floor(v / GRILLE);
          const vc = v % GRILLE;
          if (Math.abs(vr - r) + Math.abs(vc - c) !== 1) continue;
          if (!modifie[v] || vu[v]) continue;
          vu[v] = true;
          pile.push(v);
        }
      }
      composantes.push({ minCol, maxCol, minRow, maxRow });
    }
  }

  // Fusion des composantes dont les bbox dilatees d'un bloc se chevauchent
  // (un texte modifie en plusieurs fragments devient UNE zone lisible).
  const n = composantes.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i] as number] as number;
      i = parent[i] as number;
    }
    return i;
  };
  const union = (i: number, j: number): void => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ai = composantes[i] as Bbox;
      const aj = composantes[j] as Bbox;
      const dilate = (b: Bbox): Bbox => ({
        minCol: b.minCol - 1,
        maxCol: b.maxCol + 1,
        minRow: b.minRow - 1,
        maxRow: b.maxRow + 1
      });
      const di = dilate(ai);
      const dj = dilate(aj);
      if (di.minCol <= dj.maxCol && di.maxCol >= dj.minCol && di.minRow <= dj.maxRow && di.maxRow >= dj.minRow) {
        union(i, j);
      }
    }
  }

  const parRacine = new Map<number, Bbox>();
  for (let i = 0; i < n; i++) {
    const racine = find(i);
    const b = composantes[i] as Bbox;
    const existant = parRacine.get(racine);
    if (!existant) {
      parRacine.set(racine, { ...b });
    } else {
      existant.minCol = Math.min(existant.minCol, b.minCol);
      existant.maxCol = Math.max(existant.maxCol, b.maxCol);
      existant.minRow = Math.min(existant.minRow, b.minRow);
      existant.maxRow = Math.max(existant.maxRow, b.maxRow);
    }
  }

  const zones: ZoneDiff[] = [...parRacine.values()]
    .map((b) => ({
      x: b.minCol / GRILLE,
      y: b.minRow / GRILLE,
      w: (b.maxCol - b.minCol + 1) / GRILLE,
      h: (b.maxRow - b.minRow + 1) / GRILLE
    }))
    // Rejette les zones de moins d'une cellule reelle (artefacts du downscale).
    .filter((z) => z.w * GRILLE >= 1 && z.h * GRILLE >= 1);

  return { nouvelle: false, zones, score: nb / (GRILLE * GRILLE) };
}

/**
 * Construit les URLs avant/ apres pour une slide donnee.
 * L'avant passe TOUJOURS par slideUrl (la route /b presigne les blobs prives),
 * jamais par blobUrl nu qui n'est pas signe.
 */
export function urlsAvantApres(
  brouillonId: string,
  diff: DiffData,
  slideIndex: number,
  slidesActuelles: string[]
): { avantUrl: string | null; apresUrl: string | null } {
  const apres = slidesActuelles[slideIndex];
  const avant = diff.avant[slideIndex];
  return {
    avantUrl: avant ? slideUrl(brouillonId, avant.fichier) : null,
    apresUrl: apres ? slideUrl(brouillonId, apres) : null
  };
}

/** Nombre de slides modifiees (avec un equivalent avant), pour le libelle du CTA. */
export function nombreSlidesDiff(diff: DiffData, slidesActuelles: string[]): number {
  return Math.min(diff.avant.length, slidesActuelles.length);
}
