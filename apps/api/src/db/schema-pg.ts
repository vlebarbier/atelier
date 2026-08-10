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
  notes: text('notes').notNull().default(''),
  reseaux: text('reseaux').notNull().default('{}'),
  sourceHtml: text('source_html'),
  charteId: text('charte_id').default('principale'),
  checklist: text('checklist').notNull().default('[]'),
  updatedAt: text('updated_at')
});

export const slides = pgTable('slides', {
  id: serial('id').primaryKey(),
  brouillonId: text('brouillon_id').notNull(),
  fichier: text('fichier').notNull(),
  position: integer('position').notNull(),
  blobUrl: text('blob_url')
});

/** Charte graphique du client : couleurs, polices, logos (JSON). Une seule charte pour l'instant. */
export const chartes = pgTable('chartes', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull().default('Charte principale'),
  data: text('data').notNull().default('{}'),
  updatedAt: text('updated_at')
});

export type BrouillonPg = typeof brouillons.$inferSelect;
export type SlidePg = typeof slides.$inferSelect;
export type ChartePg = typeof chartes.$inferSelect;
