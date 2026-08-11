import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import fs from 'node:fs';
import { updateBrouillonSchema } from './validation.js';
import { storeSlide, storeRessource } from './storage/blob.js';
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
      type: 'carrousel',
      notes: '',
      reseaux: '{}',
      sourceHtml: null,
      charteId: 'principale',
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
      type: row.type || 'carrousel',
      notes: row.notes,
      sourceHtml: row.sourceHtml || null,
      charteId: row.charteId || 'principale',
      checklist: row.checklist || '[]',
      conversation: row.conversation || '[]',
      programme: row.programme ? JSON.parse(row.programme) : null,
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
    const nextChecklist = patch.checklist !== undefined ? patch.checklist : row.checklist;
    const nextConversation = patch.conversation !== undefined ? patch.conversation : row.conversation;
    const nextType = patch.type !== undefined ? patch.type : row.type;
    const nextProgramme = patch.programme !== undefined ? patch.programme : row.programme;

    await repo.updateBrouillon(id, {
      statut: nextStatut,
      notes: nextNotes,
      reseaux: JSON.stringify(nextReseaux),
      sourceHtml: nextSourceHtml,
      checklist: nextChecklist,
      conversation: nextConversation,
      type: nextType,
      programme: nextProgramme,
      updatedAt
    });

    return c.json({
      ok: true,
      meta: {
        statut: nextStatut,
        notes: nextNotes,
        reseaux: nextReseaux,
        sourceHtml: nextSourceHtml,
        checklist: nextChecklist,
        updated: updatedAt
      }
    });
  });

  // POST /api/brouillon/:id/message → ajoute un message user a la conversation avec l'agent.
  // L'agent (via MCP lire_brouillon) voit les messages en attente, execute, puis repond
  // via le meme endpoint avec { role: 'agent' } (ou via l'outil MCP dedie).
  app.post('/api/brouillon/:id/message', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);
    const body = await c.req.json().catch(() => null);
    const texte = typeof body?.texte === 'string' ? body.texte.trim() : '';
    if (!texte) return c.json({ error: 'texte requis' }, 400);
    const role = body?.role === 'agent' ? 'agent' : 'user';
    let conversation: { role: string; texte: string; at: string }[] = [];
    try {
      conversation = JSON.parse(row.conversation || '[]');
    } catch {
      conversation = [];
    }
    conversation.push({ role, texte, at: new Date().toISOString() });
    // Garde les 200 derniers messages (la conversation reste lisible pour l'agent).
    const garde = conversation.slice(-200);
    await repo.updateBrouillon(id, {
      conversation: JSON.stringify(garde),
      updatedAt: new Date().toISOString()
    });
    return c.json({ ok: true, conversation: garde });
  });

  app.post('/api/brouillon/:id/slides', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const body = (await c.req.json().catch(() => ({}))) as { slides?: unknown };
    if (!Array.isArray(body.slides) || body.slides.length === 0) {
      return c.json({ error: 'slides requis (tableau de dataURL PNG)' }, 400);
    }

    // Remplace toutes les slides : supprime l'existant, stocke les nouvelles.
    await repo.deleteSlides(id);
    const stored: { fichier: string; blobUrl: string | null }[] = [];
    for (let i = 0; i < body.slides.length; i++) {
      const dataUrl = body.slides[i];
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        await repo.deleteSlides(id); // rollback
        return c.json({ error: `slide ${i + 1} invalide (dataURL attendu)` }, 400);
      }
      const base64 = dataUrl.split(',')[1] ?? '';
      const buffer = Buffer.from(base64, 'base64');
      const fichier = `slides/slide-${String(i + 1).padStart(2, '0')}.png`;
      const result = await storeSlide(id, fichier, buffer, options.dataDir);
      await repo.insertSlide({ brouillonId: id, fichier: result.fichier, position: i + 1, blobUrl: result.blobUrl });
      stored.push(result);
    }

    const updatedAt = new Date().toISOString();
    await repo.updateBrouillon(id, { updatedAt });

    return c.json({ ok: true, slideCount: stored.length, slides: stored.map((s) => s.fichier) });
  });

  // POST /api/brouillon/:id/order → reordonne les slides (body: { fichiers: string[] })
  app.post('/api/brouillon/:id/order', async (c) => {
    const id = c.req.param('id');
    if (!(await repo.brouillonExists(id))) return c.json({ error: 'brouillon introuvable' }, 404);
    const body = await c.req.json().catch(() => null);
    const fichiers = body?.fichiers;
    if (!Array.isArray(fichiers) || fichiers.length === 0) {
      return c.json({ error: 'fichiers (tableau) attendu' }, 400);
    }
    const slides = await repo.listSlides(id);
    const parFichier = new Map(slides.map((s) => [s.fichier, s]));
    // Valide que chaque fichier existe
    for (const f of fichiers) {
      if (!parFichier.has(f)) return c.json({ error: `slide inconnue : ${f}` }, 400);
    }
    await repo.deleteSlides(id);
    for (let i = 0; i < fichiers.length; i++) {
      const s = parFichier.get(fichiers[i]);
      if (!s) continue;
      await repo.insertSlide({ brouillonId: id, fichier: s.fichier, position: i + 1, blobUrl: s.blobUrl });
    }
    await repo.updateBrouillon(id, { updatedAt: new Date().toISOString() });
    return c.json({ ok: true, slideCount: fichiers.length });
  });

  // ═════════════════ BIBLIOTHEQUE (ressources) ═══════════════════════════

  // GET /api/ressources → liste des ressources de la bibliotheque
  app.get('/api/ressources', async (c) => {
    const rows = await repo.listRessources();
    return c.json(rows.map((r) => ({
      id: r.id,
      nom: r.nom,
      type: r.type,
      categorie: r.categorie,
      taille: r.taille,
      sourceUrl: r.sourceUrl,
      updated: r.updatedAt
    })));
  });

  // GET /api/ressource/:id → detail (avec URL de lecture signee si Blob)
  app.get('/api/ressource/:id', async (c) => {
    const id = c.req.param('id');
    const r = await repo.getRessource(id);
    if (!r) return c.json({ error: 'ressource introuvable' }, 404);

    let url: string | null = null;
    if (r.blobUrl) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { issueSignedToken, presignUrl } = await import('@vercel/blob');
        const pathname = new URL(r.blobUrl).pathname.replace(/^\//, '');
        const signedToken = await issueSignedToken({ token: process.env.BLOB_READ_WRITE_TOKEN, pathname, operations: ['get'] });
        const { presignedUrl } = await presignUrl(signedToken, { pathname, access: 'private', operation: 'get' });
        url = presignedUrl;
      } else {
        url = r.blobUrl;
      }
    } else if (r.fichier) {
      url = `/r/${id}/${r.fichier}`;
    }

    return c.json({
      id: r.id,
      nom: r.nom,
      type: r.type,
      categorie: r.categorie,
      taille: r.taille,
      sourceUrl: r.sourceUrl,
      url,
      updated: r.updatedAt
    });
  });

  // POST /api/ressources → depose une ressource (base64) ou une page archivee (sourceUrl)
  app.post('/api/ressources', async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: 'corps JSON attendu' }, 400);
    const nom = String(body.nom || '').trim();
    if (!nom) return c.json({ error: 'nom requis' }, 400);
    const type = String(body.type || 'fichier');
    const categorie = String(body.categorie || 'autre');
    const id = `ressource-${Date.now()}`;

    // Cas 1 : page archivee (pas de fichier, juste une source URL + texte)
    if (body.sourceUrl) {
      const r = await repo.getRessource(id);
      void r;
      await repo.insertRessource({
        id,
        nom,
        type: 'page',
        categorie,
        fichier: null,
        blobUrl: null,
        taille: String(body.contenu || '').length,
        sourceUrl: String(body.sourceUrl),
        updatedAt: new Date().toISOString()
      });
      return c.json({ ok: true, id });
    }

    // Cas 2 : fichier (base64)
    if (typeof body.contenu !== 'string' || !body.contenu.startsWith('data:')) {
      return c.json({ error: 'contenu base64 (data:...) attendu' }, 400);
    }
    const base64 = body.contenu.split(',')[1] ?? '';
    const buffer = Buffer.from(base64, 'base64');
    const extMatch = nom.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1]?.toLowerCase() : 'bin';
    const fichier = `${id}.${ext}`;
    const stored = await storeRessource(id, fichier, buffer, options.dataDir);
    await repo.insertRessource({
      id,
      nom,
      type,
      categorie,
      fichier: stored.fichier,
      blobUrl: stored.blobUrl,
      taille: buffer.length,
      sourceUrl: null,
      updatedAt: new Date().toISOString()
    });
    return c.json({ ok: true, id });
  });

  // DELETE /api/ressource/:id
  app.delete('/api/ressource/:id', async (c) => {
    const id = c.req.param('id');
    await repo.deleteRessource(id);
    return c.json({ ok: true });
  });

  // GET /r/:id/* → sert le fichier local (mode sans Blob)
  app.get('/r/:id/*', async (c) => {
    const id = c.req.param('id');
    const prefix = `/r/${id}/`;
    const rest = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) : '';
    const r = await repo.getRessource(id);
    if (!r) return c.json({ error: 'ressource introuvable' }, 404);
    if (r.blobUrl) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { issueSignedToken, presignUrl } = await import('@vercel/blob');
        const pathname = new URL(r.blobUrl).pathname.replace(/^\//, '');
        const signedToken = await issueSignedToken({ token: process.env.BLOB_READ_WRITE_TOKEN, pathname, operations: ['get'] });
        const { presignedUrl } = await presignUrl(signedToken, { pathname, access: 'private', operation: 'get' });
        return c.redirect(presignedUrl, 302);
      }
      return c.redirect(r.blobUrl, 302);
    }
    const p = require('node:path');
    const fs = require('node:fs');
    const filePath = p.join(options.dataDir, 'ressources', id, rest);
    if (!fs.existsSync(filePath)) return c.json({ error: 'fichier introuvable' }, 404);
    return new Response(fs.readFileSync(filePath), { headers: { 'Content-Type': 'application/octet-stream' } });
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
