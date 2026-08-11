import { eq, desc } from 'drizzle-orm';
import { brouillons, slides, chartes, ressources, journal } from './schema-pg.js';
import type { AppDbPg } from './client.js';
import type { BrouillonPatch, BrouillonRow, CharteRow, JournalRow, NewBrouillon, NewCharte, NewJournal, NewRessource, NewSlide, Repo, RessourceRow, SlideRow } from './repo.js';

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

    async deleteSlides(brouillonId: string): Promise<void> {
      await db.delete(slides).where(eq(slides.brouillonId, brouillonId));
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
    },

    async listRessources(): Promise<RessourceRow[]> {
      return db.select().from(ressources).orderBy(ressources.updatedAt);
    },

    async getRessource(id: string): Promise<RessourceRow | undefined> {
      const rows = await db.select().from(ressources).where(eq(ressources.id, id)).limit(1);
      return rows[0];
    },

    async insertRessource(row: NewRessource): Promise<void> {
      await db.insert(ressources).values(row);
    },

    async deleteRessource(id: string): Promise<void> {
      await db.delete(ressources).where(eq(ressources.id, id));
    },

    async listJournal(limit: number): Promise<JournalRow[]> {
      return db
        .select()
        .from(journal)
        .orderBy(desc(journal.createdAt), desc(journal.id))
        .limit(limit) as unknown as Promise<JournalRow[]>;
    },

    async countJournal(): Promise<number> {
      const rows = await db.select({ n: journal.id }).from(journal).limit(1);
      // count rapide : un SELECT COUNT(*) est plus lisible que drizzle pour ce cas.
      const pool = (db as unknown as { $client?: { query?: (sql: string) => Promise<{ rows: unknown[] }> } }).$client;
      if (pool?.query) {
        const r = await pool.query('SELECT COUNT(*) AS n FROM journal');
        return Number((r.rows[0] as { n: string }).n);
      }
      return rows.length > 0 ? 1 : 0;
    },

    async insertJournal(row: NewJournal): Promise<void> {
      await db.insert(journal).values(row);
    }
  };
}
