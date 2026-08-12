import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Table brouillons : un brouillon de contenu (carrousel, post, story, article).
 * reseaux est stocke en JSON serialise (structure libre par reseau).
 */
export const brouillons = sqliteTable('brouillons', {
  id: text('id').primaryKey(),
  titre: text('titre').notNull(),
  statut: text('statut').notNull().default('brouillon'),
  /** Type de contenu : carrousel (defaut), video, post, story. Pilote le rendu du stage
   *  et les contraintes reseau affichees dans le panneau d'edition. */
  type: text('type').notNull().default('carrousel'),
  notes: text('notes').notNull().default(''),
  reseaux: text('reseaux').notNull().default('{}'),
  /** Source HTML du document (le vrai "réceptacle" : l'agent produit du HTML, les PNG sont dérivés). */
  sourceHtml: text('source_html'),
  /** Charte graphique qui regit ce brouillon (reference vers chartes.id, defaut 'principale'). */
  charteId: text('charte_id').default('principale'),
  /** Checklist de validation (JSON : [{id,label,checked}]). */
  checklist: text('checklist').notNull().default('[]'),
  /** Conversation avec l'agent (JSON : [{role:'user'|'agent', texte, at}]). Le user demande
   *  des modifications, l'agent (via MCP) les execute et repond. */
  conversation: text('conversation').notNull().default('[]'),
  /** Programmation calendrier (JSON : {date, heure, reseau} ou null). Affiche le brouillon
   *  sur son jour planifie dans le calendrier. */
  programme: text('programme'),
  /** Metadonnees article de blog (JSON : {slug, chapo, seoTitle, seoDescription, category,
   *  publishedAt, readingTime, cmsId, cmsUrl} ou null). Utilise uniquement pour type 'article'.
   *  Le corps de l'article vit dans sourceHtml (le receptacle HTML). */
  article: text('article'),
  /** Diff visuel avant/apres de la derniere regeneration (JSON : {at, avant:[{fichier,blobUrl,typeMedia}], nbAvant, nbApres}).
   *  Capture les slides AVANT leur remplacement (chantier 3 : montrer ce que l'agent a change). */
  diff: text('diff'),
  /** Annotations de revision attachees au visuel (JSON : [{id, slide, x, y, texte, at}]).
   *  x/y en fractions 0..1 : les marqueurs se superposent a la slide quel que soit son
   *  affichage (pattern proofing Krock/Ziflow : le feedback est ancre au pixel, pas au chat). */
  annotations: text('annotations').notNull().default('[]'),
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
  /** Type de media : image (defaut) ou video. Le stage affiche <video> si video. */
  typeMedia: text('type_media').notNull().default('image'),
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

/**
 * Table ressources : la bibliotheque de contenus du user (photos, PDF, pages archivees,
 * textes). C'est la memoire qui nourrit l'agent : il les lit pour produire et peut en deposer.
 * Le contenu binaire va dans le Blob (cloud) ou sur disque (local) ; la table garde la reference.
 */
export const ressources = sqliteTable('ressources', {
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

/**
 * Table journal : le fil d'activite reel des agents (et du user) sur le produit.
 * Chaque action mutatrice (depot de source, regeneration, reponse chat,
 * changement de statut, creation, depot de ressource...) y est inscrite par
 * l'API. La page "Activite IA" lit ce journal au lieu d'un fil simule.
 * brouillonTitre est fige a l'instant de l'action (l'historique reste lisible
 * meme si le brouillon est renomme ou supprime).
 */
export const journal = sqliteTable('journal', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Type d'action : creation, depot_source, regeneration, reponse_chat, message_user,
   *  changement_statut, depot_ressource, charte_import, charte_maj, suppression, reorganisation. */
  type: text('type').notNull(),
  /** Qui a agi : 'agent' (via MCP/API), 'user' (via l'UI), 'system' (backfill, seed). */
  auteur: text('auteur').notNull().default('agent'),
  brouillonId: text('brouillon_id'),
  brouillonTitre: text('brouillon_titre'),
  /** Libelle humain de l'action (ex: "a change le statut de Brouillon a A valider"). */
  message: text('message').notNull(),
  /** Details structuraux en JSON (ex: {de, vers} pour un statut, {nb} pour une regeneration). */
  details: text('details').notNull().default('{}'),
  createdAt: text('created_at').notNull()
});

export type Brouillon = typeof brouillons.$inferSelect;
export type Slide = typeof slides.$inferSelect;
export type Charte = typeof chartes.$inferSelect;
export type Ressource = typeof ressources.$inferSelect;
export type Journal = typeof journal.$inferSelect;
