import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Table brouillons : un brouillon de contenu (carrousel, post, story, article).
 * reseaux est stocke en JSON serialise (structure libre par reseau).
 */
export const brouillons = sqliteTable('brouillons', {
  id: text('id').primaryKey(),
  titre: text('titre').notNull(),
  statut: text('statut').notNull().default('brouillon'),
  notes: text('notes').notNull().default(''),
  reseaux: text('reseaux').notNull().default('{}'),
  /** Source HTML du document (le vrai "réceptacle" : l'agent produit du HTML, les PNG sont dérivés). */
  sourceHtml: text('source_html'),
  updatedAt: text('updated_at')
});

/**
 * Table slides : les visuels d'un brouillon, ordonnes par position.
 * blobUrl est renseigne uniquement en mode cloud (Vercel Blob) ; null en local (fichier sur disque).
 */
export const slides = sqliteTable('slides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  brouillonId: text('brouillon_id').notNull(),
  fichier: text('fichier').notNull(),
  position: integer('position').notNull(),
  blobUrl: text('blob_url')
});

/**
 * Table chartes : la direction artistique du client (couleurs, polices, logos),
 * stockee en JSON dans `data`. Une seule charte globale pour l'instant.
 * Elle est injectee dans le pipeline de rendu et les instructions agents.
 */
export const chartes = sqliteTable('chartes', {
  id: text('id').primaryKey(),
  nom: text('nom').notNull().default('Charte principale'),
  data: text('data').notNull().default('{}'),
  updatedAt: text('updated_at')
});

export type Brouillon = typeof brouillons.$inferSelect;
export type Slide = typeof slides.$inferSelect;
export type Charte = typeof chartes.$inferSelect;
