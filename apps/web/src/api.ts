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
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBrouillons(): Promise<Brouillon[]> {
  const res = await fetch('/api/brouillons');
  return handle<Brouillon[]>(res);
}

export async function fetchBrouillon(id: string): Promise<BrouillonDetail> {
  const res = await fetch(`/api/brouillon/${encodeURIComponent(id)}`);
  return handle<BrouillonDetail>(res);
}

export async function updateBrouillon(
  id: string,
  patch: Partial<Pick<BrouillonDetail, 'statut' | 'notes' | 'reseaux'>>
): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/brouillon/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  return handle<{ ok: boolean }>(res);
}
