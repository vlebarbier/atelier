import { eq } from 'drizzle-orm';
import { brouillons, slides, chartes, ressources } from './schema.js';
import type { AppDb } from './client.js';
import type { BrouillonPatch, BrouillonRow, CharteRow, NewBrouillon, NewCharte, NewRessource, NewSlide, Repo, RessourceRow, SlideRow } from './repo.js';

/** Implementation Repo pour SQLite (better-sqlite3 est synchrone, enveloppe en Promise). */
export function createSqliteRepo(db: AppDb): Repo {
  return {
    async listBrouillons(): Promise<BrouillonRow[]> {
      return db.select().from(brouillons).all();
    },

    async getBrouillon(id: string): Promise<BrouillonRow | undefined> {
      return db.select().from(brouillons).where(eq(brouillons.id, id)).get();
    },

    async brouillonExists(id: string): Promise<boolean> {
      const row = db.select().from(brouillons).where(eq(brouillons.id, id)).get();
      return Boolean(row);
    },

    async listSlides(brouillonId: string): Promise<SlideRow[]> {
      return db.select().from(slides).where(eq(slides.brouillonId, brouillonId)).all();
    },

    async findSlideByFichier(brouillonId: string, fichier: string): Promise<SlideRow | undefined> {
      return db
        .select()
        .from(slides)
        .where(eq(slides.brouillonId, brouillonId))
        .all()
        .find((s) => s.fichier === fichier);
    },

    async updateBrouillon(id: string, patch: BrouillonPatch): Promise<void> {
      db.update(brouillons).set(patch).where(eq(brouillons.id, id)).run();
    },

    async insertBrouillon(row: NewBrouillon): Promise<void> {
      db.insert(brouillons).values(row).run();
    },

    async insertSlide(row: NewSlide): Promise<void> {
      db.insert(slides).values(row).run();
    },

    async deleteBrouillon(id: string): Promise<void> {
      db.delete(slides).where(eq(slides.brouillonId, id)).run();
      db.delete(brouillons).where(eq(brouillons.id, id)).run();
    },

    async deleteSlides(brouillonId: string): Promise<void> {
      db.delete(slides).where(eq(slides.brouillonId, brouillonId)).run();
    },

    async getCharte(id: string): Promise<CharteRow | undefined> {
      return db.select().from(chartes).where(eq(chartes.id, id)).get();
    },

    async saveCharte(row: NewCharte): Promise<void> {
      const existing = db.select().from(chartes).where(eq(chartes.id, row.id)).get();
      if (existing) {
        db.update(chartes)
          .set({ nom: row.nom, data: row.data, updatedAt: row.updatedAt })
          .where(eq(chartes.id, row.id))
          .run();
      } else {
        db.insert(chartes).values(row).run();
      }
    },

    async listRessources(): Promise<RessourceRow[]> {
      return db.select().from(ressources).orderBy(ressources.updatedAt).all() as RessourceRow[];
    },

    async getRessource(id: string): Promise<RessourceRow | undefined> {
      return db.select().from(ressources).where(eq(ressources.id, id)).get() as RessourceRow | undefined;
    },

    async insertRessource(row: NewRessource): Promise<void> {
      db.insert(ressources).values(row).run();
    },

    async deleteRessource(id: string): Promise<void> {
      db.delete(ressources).where(eq(ressources.id, id)).run();
    }
  };
}
