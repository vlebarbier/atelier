export type Statut = 'brouillon' | 'a-valider' | 'valide' | 'publie';
export type Reseau = 'instagram' | 'linkedin' | 'facebook' | 'x' | 'tiktok' | 'gmb';

/** Programmation d'une publication : { date, heure, reseau }. */
export interface Programme {
  date?: string;
  heure?: string;
  reseau?: string;
}

/**
 * Normalise le champ programme : l'API le renvoie deja parse (objet), l'UI
 * l'envoie en JSON string. Les deux formes existent en runtime, donc on
 * accepte les deux et on renvoie null si absent/invalide.
 */
export function parseProgramme(raw: unknown): Programme | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === 'object' ? (v as Programme) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as Programme;
  return null;
}

/** Métadonnées article de blog (colonne JSON `article` du brouillon de type 'article'). */
export interface ArticleMeta {
  /** Slug URL dans le CMS (identifiant de réconciliation : _id = 'article-<slug>' côté Sanity). */
  slug?: string;
  /** Résumé / chapo, affiché sur la carte du listing blog (150-200 car. recommandés). */
  chapo?: string;
  /** SEO, balise <title> (max 70 car.). */
  seoTitle?: string;
  /** SEO, meta description (max 170 car.). */
  seoDescription?: string;
  /** Catégorie du blog (miroir du schéma Sanity post.category). */
  category?: string;
  /** Date de publication au format YYYY-MM-DD. */
  publishedAt?: string;
  /** Temps de lecture estimé (minutes). */
  readingTime?: number;
  /** Identifiant du document dans le CMS (rempli après publication). */
  cmsId?: string;
  /** URL publique de l'article publié. */
  cmsUrl?: string;
  cmsSlug?: string;
}

export function parseArticle(raw: unknown): ArticleMeta | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === 'object' ? (v as ArticleMeta) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as ArticleMeta;
  return null;
}

/** Une slide figee AVANT la derniere regeneration (snapshot cote serveur). */
export interface DiffAvant {
  fichier: string;
  blobUrl: string | null;
  typeMedia: string;
}

/** Diff visuel de la derniere regeneration : les slides avant, pour l'avant/apres. */
export interface DiffData {
  at: string;
  avant: DiffAvant[];
  nbAvant: number;
  nbApres: number;
}

/**
 * Normalise le champ diff : l'API le renvoie deja parse (objet), mais certaines
 * sources peuvent le donner en JSON string. Accepte les deux formes.
 */
export function parseDiff(raw: unknown): DiffData | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === 'object' ? (v as DiffData) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as DiffData;
  return null;
}

export interface Brouillon {
  id: string;
  titre: string;
  statut: Statut;
  slideCount: number;
  slides: string[];
  updated: string | null;
  type?: string;
  /** Reseaux cibles (cles presentes dans le champ reseaux du brouillon). */
  reseaux?: string[];
  programme?: string | Programme | null;
  article?: string | ArticleMeta | null;
}

export interface ReseauEntry {
  caption: string;
  hashtags: string;
  statut: Statut;
}

export interface BrouillonDetail extends Omit<Brouillon, 'reseaux'> {
  notes: string;
  type: string;
  reseaux: Record<string, ReseauEntry>;
  sourceHtml?: string | null;
  charteId?: string;
  checklist?: string;
  conversation?: string;
  annotations?: string;
  programme?: string | Programme | null;
  article?: string | ArticleMeta | null;
  diff?: string | DiffData | null;
  versions?: VersionSource[];
}

export interface MessageChat {
  role: 'user' | 'agent';
  texte: string;
  at: string;
}

/** Une version snapshot de la source HTML (chantier 5 : versioning + restauration). */
export interface VersionSource {
  numero: number;
  fichier: string;
  blobUrl: string | null;
  at: string;
  auteur: string;
  taille: number;
}

/** Annotation de revision attachee a une slide (pattern proofing Krock/Ziflow).
 *  x/y sont des fractions 0..1 du visuel : les marqueurs se superposent a la
 *  slide quel que soit son affichage. slide = index de la slide (0-based). */
export interface Annotation {
  id: string;
  slide: number;
  x: number;
  y: number;
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

export async function createBrouillon(
  titre?: string,
  type?: string,
  conversation?: { role: 'user' | 'agent'; texte: string }[]
): Promise<Brouillon> {
  const res = await fetch(apiUrl('/api/brouillons'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(titre ? { titre } : {}),
      ...(type ? { type } : {}),
      ...(conversation && conversation.length > 0 ? { conversation } : {})
    })
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

/**
 * POST /api/brouillon/:id/dupliquer → copie complete (source + slides), statut
 * remis a brouillon. Renvoie le nouveau brouillon (id, titre, type...).
 */
export async function dupliquerBrouillon(id: string): Promise<Brouillon> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/dupliquer`), {
    method: 'POST'
  });
  return handle<Brouillon>(res);
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
  patch: Partial<Pick<BrouillonDetail, 'titre' | 'statut' | 'notes' | 'reseaux' | 'sourceHtml' | 'checklist' | 'type' | 'programme' | 'article' | 'annotations'>>
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
): Promise<{ ok: boolean; slideCount: number; slides?: string[]; diff?: DiffData | null }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/slides`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides })
  });
  return handle<{ ok: boolean; slideCount: number }>(res);
}

/**
 * Restaure la source HTML depuis une version snapshot (chantier 5).
 * La restauration = set_source + regenerer : l'API remet le contenu de la version
 * dans sourceHtml (et la version restauree devient la version courante), le client
 * regenere ensuite les slides avec le bouton « Regenerer les slides ».
 */
export async function restaurerVersion(
  id: string,
  numero: number
): Promise<{ ok: boolean; sourceHtml: string; versions: VersionSource[] }> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/versions/${numero}/restaurer`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handle<{ ok: boolean; sourceHtml: string; versions: VersionSource[] }>(res);
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

// ── Publication vers le CMS (Sanity) ──────────────────────────────────

export interface PublicationCms {
  ok: boolean;
  cmsId: string;
  cmsUrl: string;
  slug: string;
  statut: string;
}

/**
 * POST /api/brouillon/:id/publier-cms, publie un article (type 'article', statut
 * 'valide') vers le CMS Sanity. Le statut passe à 'publie' uniquement après succès.
 */
export async function publierCms(id: string): Promise<PublicationCms> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/publier-cms`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handle<PublicationCms>(res);
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

// ── Journal d'activite ────────────────────────────────────────────────

export interface PostizDraftResult {
  ok: boolean;
  postId: string;
  integrationId: string;
  reseau: string;
  slides_uploaded: number;
  date: string;
  statut: 'draft';
}

/**
 * POST /api/brouillon/:id/postiz : depuis un brouillon VALIDÉ, crée le
 * brouillon de publication Postiz (upload slides + légende + hashtags +
 * date programmée). JAMAIS de publication automatique : le post reste un
 * draft, la programmation est un acte humain dans Postiz.
 */
export async function envoyerVersPostiz(
  id: string,
  opts: { reseau?: string; caption?: string; hashtags?: string; date?: string; heure?: string; integration_id?: string } = {}
): Promise<PostizDraftResult> {
  const res = await fetch(apiUrl(`/api/brouillon/${encodeURIComponent(id)}/postiz`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts)
  });
  return handle<PostizDraftResult>(res);
}

/** GET /api/health → heartbeat : { ok, mode: 'sqlite'|'postgres', at }. */
export async function fetchHealth(): Promise<{ ok: boolean; mode: string; at: string }> {
  const res = await fetch(apiUrl('/api/health'));
  return handle<{ ok: boolean; mode: string; at: string }>(res);
}

// ── Statut des canaux de publication ─────────────────────────────────

export interface PostizStatut {
  configure: boolean;
  apiUrl: string | null;
  joignable: boolean | null;
  canaux: number | null;
  erreur: string | null;
}

export interface IntegrationsStatut {
  postiz: PostizStatut;
  sanity: { configure: boolean; projectId: string | null };
  buffer: { configure: boolean; aVenir: boolean };
}

/** GET /api/integrations/statut → etat reel des raccords (Postiz, Sanity, Buffer). */
export async function fetchIntegrationsStatut(): Promise<IntegrationsStatut> {
  const res = await fetch(apiUrl('/api/integrations/statut'));
  return handle<IntegrationsStatut>(res);
}

export interface JournalEntry {
  id: number;
  type: string;
  auteur: 'agent' | 'user' | 'system';
  brouillonId: string | null;
  brouillonTitre: string | null;
  message: string;
  details: Record<string, unknown>;
  at: string;
}

/** GET /api/journal → le fil d'activite reel (depots, regenerations, reponses chat, statuts). */
export async function fetchJournal(limit = 100): Promise<JournalEntry[]> {
  const res = await fetch(apiUrl(`/api/journal?limit=${limit}`));
  return handle<JournalEntry[]>(res);
}
