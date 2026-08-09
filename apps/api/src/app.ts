import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { eq } from 'drizzle-orm';
import path from 'node:path';
import fs from 'node:fs';
import { brouillons, slides } from './db/schema.js';
import { updateBrouillonSchema } from './validation.js';
import type { AppDb } from './db/client.js';

const RESEAUX_DEFAUT = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok'];

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export interface AppOptions {
  /** Dossier racine ou vivent les brouillons (un sous-dossier par id, avec slides/). */
  dataDir: string;
}

function slideFichiersDe(db: AppDb, brouillonId: string): string[] {
  return db
    .select()
    .from(slides)
    .where(eq(slides.brouillonId, brouillonId))
    .all()
    .sort((a, b) => a.position - b.position)
    .map((s) => s.fichier);
}

/** Cree l'app Hono. Prend db + options en parametres pour rester testable en memoire. */
export function createApp(db: AppDb, options: AppOptions) {
  const app = new Hono();

  app.use('*', cors({ origin: '*' }));

  app.get('/api/brouillons', (c) => {
    const rows = db.select().from(brouillons).all();
    const result = rows
      .map((row) => {
        const fichiers = slideFichiersDe(db, row.id);
        return {
          id: row.id,
          titre: row.titre,
          statut: row.statut,
          slideCount: fichiers.length,
          slides: fichiers,
          updated: row.updatedAt
        };
      })
      .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return c.json(result);
  });

  app.get('/api/brouillon/:id', (c) => {
    const id = c.req.param('id');
    const row = db.select().from(brouillons).where(eq(brouillons.id, id)).get();
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const fichiers = slideFichiersDe(db, id);
    const reseauxParsed: Record<string, unknown> = JSON.parse(row.reseaux || '{}');
    const reseaux: Record<string, unknown> = { ...reseauxParsed };
    for (const r of RESEAUX_DEFAUT) {
      if (!reseaux[r]) reseaux[r] = { caption: '', hashtags: '', statut: 'brouillon' };
    }

    return c.json({
      id: row.id,
      titre: row.titre,
      statut: row.statut,
      notes: row.notes,
      reseaux,
      updated: row.updatedAt,
      slideCount: fichiers.length,
      slides: fichiers
    });
  });

  app.post('/api/brouillon/:id', async (c) => {
    const id = c.req.param('id');
    const row = db.select().from(brouillons).where(eq(brouillons.id, id)).get();
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'JSON invalide' }, 400);
    }

    const parsed = updateBrouillonSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation echouee', details: parsed.error.flatten() }, 400);
    }

    const patch = parsed.data;
    const currentReseaux: Record<string, unknown> = JSON.parse(row.reseaux || '{}');
    const nextReseaux = patch.reseaux ? { ...currentReseaux, ...patch.reseaux } : currentReseaux;
    const updatedAt = new Date().toISOString();
    const nextStatut = patch.statut ?? row.statut;
    const nextNotes = patch.notes ?? row.notes;

    db.update(brouillons)
      .set({ statut: nextStatut, notes: nextNotes, reseaux: JSON.stringify(nextReseaux), updatedAt })
      .where(eq(brouillons.id, id))
      .run();

    return c.json({
      ok: true,
      meta: { statut: nextStatut, notes: nextNotes, reseaux: nextReseaux, updated: updatedAt }
    });
  });

  app.get('/b/:id/*', (c) => {
    const id = c.req.param('id');
    // `param('*')` ne fonctionne pas dans cette version de Hono → extraire de c.req.path
    const prefix = `/b/${id}/`;
    const rest = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
    const safe = path.normalize(rest).replace(/^(\\.\\.[/\\\\])+/, '');
    const baseDir = path.join(options.dataDir, id);
    const filePath = path.join(baseDir, safe);

    if (!filePath.startsWith(baseDir)) return c.body('Forbidden', 403);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return c.body('Not found', 404);

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    return c.body(new Uint8Array(data), 200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  });

  return app;
}
