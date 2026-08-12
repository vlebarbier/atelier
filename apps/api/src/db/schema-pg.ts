import { pgTable, text, integer, serial } from 'drizzle-orm/pg-core';

/**
 * Equivalent Postgres du schema sqlite (src/db/schema.ts). Memes noms de colonnes,
 * memes contrats, pour que la couche repository (repo-pg.ts) reste un miroir de
 * repo-sqlite.ts. Voir schema.ts pour la description fonctionnelle des colonnes.
 */
export const brouillons = pgTable('brouillons', {
  id: text('id').primaryKey(),
  titre: text('titre').notNull(),
  statut: text('statut').notNull().default('brouillon'),
  type: text('type').notNull().default('carrousel'),
  notes: text('notes').notNull().default(''),
  reseaux: text('reseaux').notNull().default('{}'),
  sourceHtml: text('source_html'),
  charteId: text('charte_id').default('principale'),
  checklist: text('checklist').notNull().default('[]'),
  conversation: text('conversation').notNull().default('[]'),
  programme: text('programme'),
  article: text('article'),
  /** Diff visuel avant/apres de la derniere regeneration (voir schema.ts). */
  diff: text('diff'),
  /** Versions de la source HTML (JSON, voir schema.ts). */
  versions: text('versions'),
  /** Annotations de revision attachees au visuel (JSON, voir schema.ts). */
  annotations: text('annotations').notNull().default('[]'),
  /** Decision de validation maker/checker (JSON, voir schema.ts). */
  decision: text('decision'),
  updatedAt: text('updated_at')
});

export const slides = pgTable('slides', {
  id: serial('id').primaryKey(),
  brouillonId: text('brouillon_id').notNull(),
  fichier: text('fichier').notNull(),
  position: integer('position').notNull(),
  typeMedia: text('type_media').notNull().default('image'),
  blobUrl: text('blob_url')
});

/** Charte graphique du client : couleurs, polices, logos (JSON). Une seule charte pour l'instant. */
export const chartes = pgTable('chartes', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull().default('Charte principale'),
  data: text('data').notNull().default('{}'),
  updatedAt: text('updated_at')
});

/** Bibliotheque de contenus : photos, PDF, pages archivees, textes (la memoire de l'agent). */
export const ressources = pgTable('ressources', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull(),
  type: text('type').notNull().default('fichier'),
  categorie: text('categorie').notNull().default('autre'),
  fichier: text('fichier'),
  blobUrl: text('blob_url'),
  taille: integer('taille').notNull().default(0),
  sourceUrl: text('source_url'),
  updatedAt: text('updated_at')
});

/** Journal des actions agents (depots, regenerations, reponses chat, statuts) — voir schema.ts. */
export const journal = pgTable('journal', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  auteur: text('auteur').notNull().default('agent'),
  brouillonId: text('brouillon_id'),
  brouillonTitre: text('brouillon_titre'),
  message: text('message').notNull(),
  details: text('details').notNull().default('{}'),
  createdAt: text('created_at').notNull()
});

export type BrouillonPg = typeof brouillons.$inferSelect;
export type SlidePg = typeof slides.$inferSelect;
export type ChartePg = typeof chartes.$inferSelect;
export type RessourcePg = typeof ressources.$inferSelect;
export type JournalPg = typeof journal.$inferSelect;
