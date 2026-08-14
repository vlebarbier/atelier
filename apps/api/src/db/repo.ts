/**
 * Couche repository : abstrait l'acces donnees pour que app.ts / seed.ts fonctionnent
 * a l'identique que la base soit SQLite locale (better-sqlite3, sync) ou Postgres
 * distante (node-postgres, async). Deux implementations (repo-sqlite.ts, repo-pg.ts),
 * mais toutes deux exposent la meme interface asynchrone : le driver sqlite est
 * simplement enveloppe dans des Promise.resolve(), le driver postgres est nativement
 * asynchrone. Ce choix (repository + interface commune) a ete prefere a un schema
 * pg parallele expose directement dans app.ts, ou a des requetes SQL brutes dupliquees :
 * il isole toute la logique specifique au driver dans db/repo-*.ts et laisse app.ts
 * et seed.ts totalement independants du moteur de stockage.
 */

export interface BrouillonRow {
  id: string;
  titre: string;
  statut: string;
  type: string;
  notes: string;
  reseaux: string;
  sourceHtml: string | null;
  charteId: string | null;
  checklist: string;
  conversation: string;
  programme: string | null;
  article: string | null;
  diff: string | null;
  versions: string | null;
  annotations: string;
  decision: string | null;
  updatedAt: string | null;
}

export interface SlideRow {
  id: number;
  brouillonId: string;
  fichier: string;
  position: number;
  typeMedia: string;
  blobUrl: string | null;
}

export interface BrouillonPatch {
  titre?: string;
  statut?: string;
  notes?: string;
  reseaux?: string;
  sourceHtml?: string | null;
  checklist?: string;
  conversation?: string;
  type?: string;
  programme?: string | null;
  article?: string | null;
  diff?: string | null;
  versions?: string | null;
  annotations?: string;
  decision?: string | null;
  updatedAt?: string;
}

export interface NewBrouillon {
  id: string;
  titre: string;
  statut: string;
  type?: string;
  notes: string;
  reseaux: string;
  sourceHtml?: string | null;
  charteId?: string | null;
  checklist?: string;
  conversation?: string;
  programme?: string | null;
  article?: string | null;
  diff?: string | null;
  annotations?: string;
  decision?: string | null;
  updatedAt: string | null;
}

export interface NewSlide {
  brouillonId: string;
  fichier: string;
  position: number;
  typeMedia?: string;
  blobUrl: string | null;
}

export interface Repo {
  listBrouillons(): Promise<BrouillonRow[]>;
  getBrouillon(id: string): Promise<BrouillonRow | undefined>;
  brouillonExists(id: string): Promise<boolean>;
  listSlides(brouillonId: string): Promise<SlideRow[]>;
  findSlideByFichier(brouillonId: string, fichier: string): Promise<SlideRow | undefined>;
  updateBrouillon(id: string, patch: BrouillonPatch): Promise<void>;
  insertBrouillon(row: NewBrouillon): Promise<void>;
  insertSlide(row: NewSlide): Promise<void>;
  deleteBrouillon(id: string): Promise<void>;
  deleteSlides(brouillonId: string): Promise<void>;
  getCharte(id: string): Promise<CharteRow | undefined>;
  saveCharte(row: NewCharte): Promise<void>;
  listRessources(): Promise<RessourceRow[]>;
  getRessource(id: string): Promise<RessourceRow | undefined>;
  insertRessource(row: NewRessource): Promise<void>;
  deleteRessource(id: string): Promise<void>;
  /** Journal d'activite : les N dernieres actions, les plus recentes en premier. */
  listJournal(limit: number): Promise<JournalRow[]>;
  countJournal(): Promise<number>;
  insertJournal(row: NewJournal): Promise<void>;
}

export interface CharteRow {
  id: string;
  nom: string;
  data: string;
  updatedAt: string | null;
}

export interface NewCharte {
  id: string;
  nom: string;
  data: string;
  updatedAt: string | null;
}

export interface RessourceRow {
  id: string;
  nom: string;
  type: string;
  categorie: string;
  fichier: string | null;
  blobUrl: string | null;
  taille: number;
  sourceUrl: string | null;
  updatedAt: string | null;
}

export interface NewRessource {
  id: string;
  nom: string;
  type: string;
  categorie: string;
  fichier: string | null;
  blobUrl: string | null;
  taille: number;
  sourceUrl: string | null;
  updatedAt: string | null;
}

export interface JournalRow {
  id: number;
  type: string;
  auteur: string;
  brouillonId: string | null;
  brouillonTitre: string | null;
  message: string;
  details: string;
  createdAt: string;
}

export interface NewJournal {
  type: string;
  auteur: string;
  brouillonId?: string | null;
  brouillonTitre?: string | null;
  message: string;
  details?: string;
  createdAt: string;
}
