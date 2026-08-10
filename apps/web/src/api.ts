export type Statut = 'brouillon' | 'a-valider' | 'valide' | 'publie';
export type Reseau = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok';

export interface Brouillon {
  id: string;
  titre: string;
  statut: Statut;
  slideCount: number;
  slides: string[];
  updated: string | null;
}

export interface ReseauEntry {
  caption: string;
  hashtags: string;
  statut: Statut;
}

export interface BrouillonDetail extends Brouillon {
  notes: string;
  reseaux: Record<string, ReseauEntry>;
  sourceHtml?: string | null;
  charteId?: string;
  checklist?: string;
}

export interface Charte {
  id: string;
  nom: string;
  data: string;
  updatedAt: string | null;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Base de l'API. En prod, VITE_API_URL pointe vers l'API déployée
 * (ex: https://atelier-api-three.vercel.app). En dev, vide → même origine,
 * le proxy Vite (/api et /b) route vers l'API locale.
 */
const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/** URL d'une image de slide (passe par la même base que l'API). */
export function slideUrl(id: string, fichier: string): string {
  return apiUrl(`/b/${encodeURIComponent(id)}/${fichier}`);
}

export async function fetchBrouillons(): Promise<Brouillon[]> {
  const res = await fetch(apiUrl('/api/brouillons'));
  return handle<Brouillon[]>(res);
}

export async function createBrouillon(titre?: string): Promise<Brouillon> {
  const res = await fetch(apiUrl('/api/brouillons'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(titre ? { titre } : {})
  });
  return handle<Brouillon>(res);
}

export async function fetchBrouillon(id: string): Promise<BrouillonDetail> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}`));
  return handle<BrouillonDetail>(res);
}

export async function deleteBrouillon(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}`), {
    method: 'DELETE'
  });
  return handle<{ ok: boolean }>(res);
}

export async function fetchCharte(): Promise<Charte> {
  const res = await fetch(apiUrl('/api/charte'));
  return handle<Charte>(res);
}

export async function saveCharte(nom: string, data: string): Promise<boolean> {
  const res = await fetch(apiUrl('/api/charte'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom, data })
  });
  return res.ok;
}

export interface ImportCharteResult {
  id: string;
  nom: string;
  data: string;
  updatedAt: string | null;
  stats: { couleurs: number; polices: number; rayons: number; logos: number };
}

export async function importCharte(css: string, nom?: string): Promise<ImportCharteResult> {
  const res = await fetch(apiUrl('/api/charte/import'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ css, nom })
  });
  return handle<ImportCharteResult>(res);
}

export async function updateBrouillon(
  id: string,
  patch: Partial<Pick<BrouillonDetail, 'statut' | 'notes' | 'reseaux' | 'sourceHtml' | 'checklist'>>
): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  return handle<{ ok: boolean }>(res);
}

export async function replaceSlides(
  id: string,
  slides: string[]
): Promise<{ ok: boolean; slideCount: number }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/slides`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides })
  });
  return handle<{ ok: boolean; slideCount: number }>(res);
}
