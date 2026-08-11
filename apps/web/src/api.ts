export type Statut = 'brouillon' | 'a-valider' | 'valide' | 'publie';
export type Reseau = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok';

export interface Brouillon {
  id: string;
  titre: string;
  statut: Statut;
  slideCount: number;
  slides: string[];
  updated: string | null;
  type?: string;
  programme?: string | null;
}

export interface ReseauEntry {
  caption: string;
  hashtags: string;
  statut: Statut;
}

export interface BrouillonDetail extends Brouillon {
  notes: string;
  type: string;
  reseaux: Record<string, ReseauEntry>;
  sourceHtml?: string | null;
  charteId?: string;
  checklist?: string;
  conversation?: string;
  programme?: string | null;
}

export interface MessageChat {
  role: 'user' | 'agent';
  texte: string;
  at: string;
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
  patch: Partial<Pick<BrouillonDetail, 'statut' | 'notes' | 'reseaux' | 'sourceHtml' | 'checklist' | 'type' | 'programme'>>
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

/** Reordonne les slides d'un brouillon (body: fichiers dans le nouvel ordre). */
export async function reorderSlides(
  id: string,
  fichiers: string[]
): Promise<{ ok: boolean; slideCount: number }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/order`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fichiers })
  });
  return handle<{ ok: boolean; slideCount: number }>(res);
}

// ── Bibliothèque (ressources) ──────────────────────────────────────────

export interface Ressource {
  id: string;
  nom: string;
  type: string;
  categorie: string;
  taille: number;
  sourceUrl: string | null;
  updated: string | null;
}

export interface RessourceDetail extends Ressource {
  url: string | null;
}

export async function fetchRessources(): Promise<Ressource[]> {
  const res = await fetch(apiUrl('/api/ressources'));
  return handle<Ressource[]>(res);
}

export async function fetchRessource(id: string): Promise<RessourceDetail> {
  const res = await fetch(apiUrl(`/api/ressource/${encodeURIComponent(id)}`));
  return handle<RessourceDetail>(res);
}

export async function createRessource(payload: {
  nom: string;
  type?: string;
  categorie?: string;
  contenu?: string;
  sourceUrl?: string;
}): Promise<{ ok: boolean; id: string }> {
  const res = await fetch(apiUrl('/api/ressources'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handle<{ ok: boolean; id: string }>(res);
}

export async function deleteRessource(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(apiUrl(`/api/ressource/${encodeURIComponent(id)}`), {
    method: 'DELETE'
  });
  return handle<{ ok: boolean }>(res);
}

// ── Conversation avec l'agent ─────────────────────────────────────────

export async function envoyerMessage(
  id: string,
  texte: string,
  role: 'user' | 'agent' = 'user'
): Promise<{ ok: boolean; conversation: MessageChat[] }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/message`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texte, role })
  });
  return handle<{ ok: boolean; conversation: MessageChat[] }>(res);
}
