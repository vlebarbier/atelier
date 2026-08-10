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

function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function fetchBrouillons(): Promise<Brouillon[]> {
  const res = await fetch(apiUrl('/api/brouillons'));
  return handle<Brouillon[]>(res);
}

export async function fetchBrouillon(id: string): Promise<BrouillonDetail> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}`));
  return handle<BrouillonDetail>(res);
}

export async function updateBrouillon(
  id: string,
  patch: Partial<Pick<BrouillonDetail, 'statut' | 'notes' | 'reseaux' | 'sourceHtml'>>
): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  return handle<{ ok: boolean }>(res);
}
