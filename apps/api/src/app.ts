import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import fs from 'node:fs';
import { updateBrouillonSchema } from './validation.js';
import type { Repo } from './db/repo.js';

const RESEAUX_DEFAUT = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok'];

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export interface AppOptions {
  /** Dossier racine ou vivent les brouillons (un sous-dossier par id, avec slides/). Utilise en mode local uniquement. */
  dataDir: string;
}

async function slideFichiersDe(repo: Repo, brouillonId: string): Promise<string[]> {
  const rows = await repo.listSlides(brouillonId);
  return rows.sort((a, b) => a.position - b.position).map((s) => s.fichier);
}

/**
 * Cree l'app Hono. Prend le repository (couche d'acces donnees, SQLite ou
 * Postgres) + options en parametres pour rester testable en memoire et
 * independante du driver de stockage.
 */
export function createApp(repo: Repo, options: AppOptions) {
  const app = new Hono();

  app.use('*', cors({ origin: '*' }));

  app.get('/api/brouillons', async (c) => {
    const rows = await repo.listBrouillons();
    const result = (
      await Promise.all(
        rows.map(async (row) => {
          const fichiers = await slideFichiersDe(repo, row.id);
          return {
            id: row.id,
            titre: row.titre,
            statut: row.statut,
            slideCount: fichiers.length,
            slides: fichiers,
            updated: row.updatedAt
          };
        })
      )
    ).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return c.json(result);
  });

  app.post('/api/brouillons', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { titre?: string };
    const id = `brouillon-${Date.now().toString(36)}`;
    const titre = (body.titre || 'Nouveau brouillon').trim();
    await repo.insertBrouillon({
      id,
      titre,
      statut: 'brouillon',
      notes: '',
      reseaux: '{}',
      sourceHtml: null,
      updatedAt: new Date().toISOString()
    });
    return c.json({ id, titre, statut: 'brouillon', slideCount: 0, slides: [], updated: new Date().toISOString() }, 201);
  });

  app.delete('/api/brouillon/:id', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);
    await repo.deleteBrouillon(id);
    return c.json({ ok: true });
  });

  app.get('/api/charte', async (c) => {
    const charte = await repo.getCharte('principale');
    if (!charte) return c.json({ id: 'principale', nom: 'Charte principale', data: '{}', updatedAt: null });
    return c.json({ id: charte.id, nom: charte.nom, data: charte.data, updatedAt: charte.updatedAt });
  });

  app.put('/api/charte', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { nom?: string; data?: unknown };
    const nom = (body.nom || 'Charte principale').trim();
    const data = typeof body.data === 'string' ? body.data : JSON.stringify(body.data || {});
    const updatedAt = new Date().toISOString();
    await repo.saveCharte({ id: 'principale', nom, data, updatedAt });
    return c.json({ id: 'principale', nom, data, updatedAt });
  });

  app.post('/api/charte/import', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { css?: string; nom?: string };
    const css = body.css || '';
    if (!css.trim()) return c.json({ error: 'Aucun CSS fourni' }, 400);

    const { parseCssCharte } = await import('./charte-parser.js');
    const parsed = parseCssCharte(css);
    const nom = (body.nom || 'Charte importee').trim();
    const updatedAt = new Date().toISOString();
    const data = JSON.stringify(parsed);

    await repo.saveCharte({ id: 'principale', nom, data, updatedAt });
    return c.json({
      id: 'principale',
      nom,
      data,
      updatedAt,
      stats: {
        couleurs: Object.keys(parsed.couleurs).length,
        polices: [parsed.polices.titre, parsed.polices.texte].filter(Boolean).length,
        rayons: Object.keys(parsed.rayons).length,
        logos: parsed.logos.length
      }
    });
  });

  app.get('/api/brouillon/:id', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const fichiers = await slideFichiersDe(repo, id);
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
      sourceHtml: row.sourceHtml || null,
      reseaux,
      updated: row.updatedAt,
      slideCount: fichiers.length,
      slides: fichiers
    });
  });

  app.post('/api/brouillon/:id', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
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
    const nextSourceHtml = patch.sourceHtml !== undefined ? patch.sourceHtml : row.sourceHtml;

    await repo.updateBrouillon(id, {
      statut: nextStatut,
      notes: nextNotes,
      reseaux: JSON.stringify(nextReseaux),
      sourceHtml: nextSourceHtml,
      updatedAt
    });

    return c.json({
      ok: true,
      meta: {
        statut: nextStatut,
        notes: nextNotes,
        reseaux: nextReseaux,
        sourceHtml: nextSourceHtml,
        updated: updatedAt
      }
    });
  });

  app.get('/b/:id/*', async (c) => {
    const id = c.req.param('id');
    // `param('*')` ne fonctionne pas dans cette version de Hono → extraire de c.req.path
    const prefix = `/b/${id}/`;
    const rest = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';

    // Mode cloud : le fichier a ete uploade vers Vercel Blob au seed. Store privé
    // → on genere une URL presignee (token de lecture limite au pathname, expire en 1h)
    // puis on redirige. Pas de disque persistant en serverless.
    const slide = await repo.findSlideByFichier(id, rest);
    if (slide?.blobUrl) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { issueSignedToken, presignUrl } = await import('@vercel/blob');
        try {
          // pathname SANS slash initial : presignUrl ajoute le sien, sinon double slash → 404
          const pathname = new URL(slide.blobUrl).pathname.replace(/^\//, '');
          const signedToken = await issueSignedToken({
            token: process.env.BLOB_READ_WRITE_TOKEN,
            pathname,
            operations: ['get']
          });
          const { presignedUrl } = await presignUrl(signedToken, {
            pathname,
            access: 'private',
            operation: 'get'
          });
          return c.redirect(presignedUrl, 302);
        } catch (err) {
          return c.json({ error: `Blob sign: ${err instanceof Error ? err.message : err}` }, 500);
        }
      }
      return c.redirect(slide.blobUrl, 302);
    }

    // Mode local : lecture disque classique.
    const safe = path.normalize(rest).replace(/^(\.\.[/\\])+/, '');
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

// ═════════════════ ENTRÉE SERVERLESS VERCEL ═══════════════════════════════
// Vercel (framework Hono) lit src/app.ts comme module d'entrée et exige un
// default export qui est une fonction ou un serveur. Pas de top-level await
// (l'export deviendrait une Promise → "Invalid export"). Le repo est construit
// paresseusement au premier appel et mis en cache sur l'instance (Fluid compute).

let repoPromise: Promise<Repo> | null = null;

async function getRepo(): Promise<Repo> {
  if (!repoPromise) {
    const { createDbPg, createPgPool, isPostgres, createDb, openSqlite } = await import('./db/client.js');
    const { ensurePgTables } = await import('./db/migrate-pg.js');
    const { ensureLegacyTables } = await import('./db/legacy.js');
    const { migrateWithDrizzle } = await import('./db/migrate.js');
    const { createPgRepo } = await import('./db/repo-pg.js');
    const { createSqliteRepo } = await import('./db/repo-sqlite.js');

    repoPromise = (async () => {
      if (isPostgres()) {
        const pool = createPgPool();
        await ensurePgTables(pool);
        const db = createDbPg(pool);
        return createPgRepo(db);
      }
      const DB_PATH = process.env.API_DB_PATH || '/tmp/atelier.db';
      const sqlite = openSqlite(DB_PATH);
      ensureLegacyTables(sqlite);
      migrateWithDrizzle(sqlite);
      const db = createDb(sqlite);
      return createSqliteRepo(db);
    })();
  }
  return repoPromise;
}

const vercelApp = new Hono();

vercelApp.use('*', async (c, next) => {
  const repo = await getRepo();
  const app = createApp(repo, { dataDir: process.env.API_DATA_DIR || '/tmp/atelier-data' });
  const res = await app.fetch(c.req.raw, c.env);
  return res;
});

export default vercelApp;
