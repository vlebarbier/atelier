import { eq } from 'drizzle-orm';
import { brouillons, slides, chartes } from './schema-pg.js';
import type { AppDbPg } from './client.js';
import type { BrouillonPatch, BrouillonRow, CharteRow, NewBrouillon, NewCharte, NewSlide, Repo, SlideRow } from './repo.js';

/** Implementation Repo pour Postgres (node-postgres via drizzle-orm/node-postgres, nativement asynchrone). */
export function createPgRepo(db: AppDbPg): Repo {
  return {
    async listBrouillons(): Promise<BrouillonRow[]> {
      return db.select().from(brouillons);
    },

    async getBrouillon(id: string): Promise<BrouillonRow | undefined> {
      const rows = await db.select().from(brouillons).where(eq(brouillons.id, id)).limit(1);
      return rows[0];
    },

    async brouillonExists(id: string): Promise<boolean> {
      const rows = await db.select().from(brouillons).where(eq(brouillons.id, id)).limit(1);
      return rows.length > 0;
    },

    async listSlides(brouillonId: string): Promise<SlideRow[]> {
      return db.select().from(slides).where(eq(slides.brouillonId, brouillonId));
    },

    async findSlideByFichier(brouillonId: string, fichier: string): Promise<SlideRow | undefined> {
      const rows = await db.select().from(slides).where(eq(slides.brouillonId, brouillonId));
      return rows.find((s) => s.fichier === fichier);
    },

    async updateBrouillon(id: string, patch: BrouillonPatch): Promise<void> {
      await db.update(brouillons).set(patch).where(eq(brouillons.id, id));
    },

    async insertBrouillon(row: NewBrouillon): Promise<void> {
      await db.insert(brouillons).values(row);
    },

    async insertSlide(row: NewSlide): Promise<void> {
      await db.insert(slides).values(row);
    },

    async deleteBrouillon(id: string): Promise<void> {
      await db.delete(slides).where(eq(slides.brouillonId, id));
      await db.delete(brouillons).where(eq(brouillons.id, id));
    },

    async getCharte(id: string): Promise<CharteRow | undefined> {
      const rows = await db.select().from(chartes).where(eq(chartes.id, id)).limit(1);
      return rows[0];
    },

    async saveCharte(row: NewCharte): Promise<void> {
      const existing = await db.select().from(chartes).where(eq(chartes.id, row.id)).limit(1);
      if (existing.length > 0) {
        await db.update(chartes)
          .set({ nom: row.nom, data: row.data, updatedAt: row.updatedAt })
          .where(eq(chartes.id, row.id));
      } else {
        await db.insert(chartes).values(row);
      }
    }
  };
}
