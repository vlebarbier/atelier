import { Hono } from 'hono';
import { cors } from 'hono/cors';
import path from 'node:path';
import fs from 'node:fs';
import { updateBrouillonSchema, decisionSchema } from './validation.js';
import { storeSlide, storeRessource } from './storage/blob.js';
import { snapshotSlidesAvant } from './diff.js';
import { snapshotSource, lireVersion, parseVersions } from './versions.js';
import { isPostgres } from './db/client.js';
import type { Repo } from './db/repo.js';

const RESEAUX_DEFAUT = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok', 'gmb'];

/** Libelles francais des statuts, pour le journal d'activite. */
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  'a-valider': 'A valider',
  valide: 'Valide',
  publie: 'Publie'
};

/**
 * Journal d'activite : inscrit une action (depot de source, regeneration,
 * reponse chat, changement de statut...) dans la table journal. La page
 * "Activite IA" lit ce journal. Ne doit jamais faire echouer l'action
 * principale : les erreurs d'ecriture sont avalees.
 */
async function journaliser(
  repo: Repo,
  e: {
    type: string;
    auteur: string;
    brouillonId?: string | null;
    brouillonTitre?: string | null;
    message: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await repo.insertJournal({
      type: e.type,
      auteur: e.auteur,
      brouillonId: e.brouillonId ?? null,
      brouillonTitre: e.brouillonTitre ?? null,
      message: e.message,
      details: JSON.stringify(e.details ?? {}),
      createdAt: new Date().toISOString()
    });
  } catch {
    /* le journal est best-effort : ne jamais bloquer l'action principale */
  }
}

/**
 * Execute p avec un delai maximal, rejette si le delai expire. Best-effort :
 * les raccords externes (Postiz local) ne doivent jamais bloquer une route.
 */
async function avecTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new Error(`delai depasse (${ms} ms)`)), ms);
      })
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

/**
 * Auteur de l'action : le client MCP envoie le header x-atelier-auteur: agent,
 * l'UI web n'envoie rien → 'user' par defaut.
 */
function auteurDe(c: { req: { header: (name: string) => string | undefined } }): string {
  const h = c.req.header('x-atelier-auteur');
  return h === 'agent' || h === 'system' ? h : 'user';
}

/**
 * Backfill du journal au premier boot : si la table journal est vide alors que
 * des brouillons/ressources/charte existent deja, on derive des updatedAt une
 * entree par objet. C'est le "derive des updatedAt" de la spec : le fil d'activite
 * est vrai des le premier chargement, avant meme la prochaine action.
 */
export async function backfillJournal(repo: Repo): Promise<void> {
  try {
    if ((await repo.countJournal()) > 0) return;
    const brouillons = await repo.listBrouillons();
    for (const b of brouillons) {
      await repo.insertJournal({
        type: 'creation',
        auteur: 'system',
        brouillonId: b.id,
        brouillonTitre: b.titre,
        message: `brouillon cree : "${b.titre}"`,
        details: JSON.stringify({ type: b.type || 'carrousel' }),
        createdAt: b.updatedAt || new Date().toISOString()
      });
    }
    const ressources = await repo.listRessources();
    for (const r of ressources) {
      await repo.insertJournal({
        type: 'depot_ressource',
        auteur: 'system',
        message: `ressource deposee : "${r.nom}"`,
        details: JSON.stringify({ type: r.type, categorie: r.categorie }),
        createdAt: r.updatedAt || new Date().toISOString()
      });
    }
    const charte = await repo.getCharte('principale');
    if (charte && charte.data !== '{}') {
      await repo.insertJournal({
        type: 'charte_maj',
        auteur: 'system',
        message: 'charte graphique enregistree',
        createdAt: charte.updatedAt || new Date().toISOString()
      });
    }
  } catch {
    /* best-effort */
  }
}

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

  // GET /api/health → heartbeat pour la page Integrations (test de connexion).
  // Renvoie le mode de stockage (sqlite local / postgres cloud) sans toucher
  // la base : utile pour verifier qu'une instance est joignable depuis l'UI.
  app.get('/api/health', (c) => {
    return c.json({
      ok: true,
      mode: isPostgres() ? 'postgres' : 'sqlite',
      at: new Date().toISOString()
    });
  });

  // GET /api/integrations/statut → etat reel des raccords de publication pour
  // la page Integrations : Postiz (configure + joignable + canaux connectes),
  // Sanity CMS, Buffer (a venir). Best-effort : Postiz est un raccord local
  // (self-hosted), son ping peut echouer depuis le cloud sans config fausse.
  app.get('/api/integrations/statut', async (c) => {
    const { getPostizConfig, postizListIntegrations } = await import('./integrations/postiz.js');
    const { getSanityConfig } = await import('./integrations/sanity.js');

    const postizConfig = getPostizConfig();
    const postiz: {
      configure: boolean;
      apiUrl: string | null;
      joignable: boolean | null;
      canaux: number | null;
      erreur: string | null;
    } = {
      configure: postizConfig !== null,
      apiUrl: postizConfig?.apiUrl ?? null,
      joignable: null,
      canaux: null,
      erreur: null
    };
    if (postizConfig) {
      try {
        const canaux = await avecTimeout(postizListIntegrations(postizConfig), 4000);
        postiz.joignable = true;
        postiz.canaux = canaux.length;
      } catch (err) {
        postiz.joignable = false;
        postiz.erreur = err instanceof Error ? err.message : String(err);
      }
    }

    const sanityConfig = getSanityConfig();
    return c.json({
      postiz,
      sanity: { configure: sanityConfig !== null, projectId: sanityConfig?.projectId ?? null },
      buffer: { configure: false, aVenir: true }
    });
  });

  app.get('/api/brouillons', async (c) => {
    const rows = await repo.listBrouillons();
    const result = (
      await Promise.all(
        rows.map(async (row) => {
          const fichiers = await slideFichiersDe(repo, row.id);
          let reseaux: string[] = [];
          try {
            reseaux = Object.keys(JSON.parse(row.reseaux || '{}'));
          } catch {
            reseaux = [];
          }
          return {
            id: row.id,
            titre: row.titre,
            statut: row.statut,
            type: row.type || 'carrousel',
            programme: row.programme ? JSON.parse(row.programme) : null,
            article: row.article ? JSON.parse(row.article) : null,
            reseaux,
            slideCount: fichiers.length,
            slides: fichiers,
            updated: row.updatedAt
          };
        })
      )
    ).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    return c.json(result);
  });

  // GET /api/conversations/en-attente → les conversations qui attendent une
  // reponse de l'agent (worker asynchrone). Un brouillon est "en attente" ssi
  // sa conversation n'est pas vide ET que le DERNIER message a role: 'user'
  // (etat derive, pas de flag : une reponse agent bascule l'etat atomiquement).
  // Source de verite unique : le worker (cron) et l'UI consomment la meme
  // definition. Sortie stable (tri par id) pour que le monitor du worker soit
  // deterministe ; `messages` = queue (≤ 8) pour donner le contexte au worker.
  app.get('/api/conversations/en-attente', async (c) => {
    const rows = await repo.listBrouillons();
    const result: {
      id: string;
      titre: string;
      statut: string;
      type: string;
      updated: string | null;
      messages: { role: string; texte: string; at: string }[];
    }[] = [];
    for (const row of rows) {
      let conversation: { role: string; texte: string; at: string }[] = [];
      try {
        conversation = JSON.parse(row.conversation || '[]');
      } catch {
        conversation = [];
      }
      if (!Array.isArray(conversation) || conversation.length === 0) continue;
      const dernier = conversation[conversation.length - 1];
      if (!dernier || dernier.role !== 'user') continue;
      result.push({
        id: row.id,
        titre: row.titre,
        statut: row.statut,
        type: row.type || 'carrousel',
        updated: row.updatedAt,
        messages: conversation.slice(-8)
      });
    }
    result.sort((a, b) => a.id.localeCompare(b.id));
    return c.json(result);
  });

  app.post('/api/brouillons', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      titre?: string;
      type?: string;
      conversation?: { role?: string; texte?: string }[];
    };
    const id = `brouillon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const titre = (body.titre || 'Nouveau brouillon').trim();
    const type = body.type || 'carrousel';

    // Conversation pre-remplie (porte d'entree creation : phrase libre ou template).
    // Le timestamp est genere serveur, jamais envoye par le client.
    let conversation = '[]';
    if (Array.isArray(body.conversation) && body.conversation.length > 0) {
      const messages: { role: 'agent' | 'user'; texte: string; at: string }[] = [];
      for (const m of body.conversation) {
        if (!m || typeof m.texte !== 'string' || !m.texte.trim()) continue;
        messages.push({
          role: m.role === 'agent' ? 'agent' : 'user',
          texte: m.texte.trim(),
          at: new Date().toISOString()
        });
      }
      if (messages.length > 0) conversation = JSON.stringify(messages);
    }

    await repo.insertBrouillon({
      id,
      titre,
      statut: 'brouillon',
      type,
      notes: '',
      reseaux: '{}',
      sourceHtml: null,
      charteId: 'principale',
      conversation,
      updatedAt: new Date().toISOString()
    });
    await journaliser(repo, {
      type: 'creation',
      auteur: auteurDe(c),
      brouillonId: id,
      brouillonTitre: titre,
      message: `a cree le brouillon "${titre}"`,
      details: { type, avecDemande: conversation !== '[]' }
    });
    return c.json({ id, titre, statut: 'brouillon', slideCount: 0, slides: [], updated: new Date().toISOString() }, 201);
  });

  app.delete('/api/brouillon/:id', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);
    await repo.deleteBrouillon(id);
    await journaliser(repo, {
      type: 'suppression',
      auteur: auteurDe(c),
      brouillonId: id,
      brouillonTitre: row.titre,
      message: `a supprime le brouillon "${row.titre}"`
    });
    return c.json({ ok: true });
  });

  // POST /api/brouillon/:id/dupliquer → copie le brouillon (metadonnees + source
  // + slides physiques) sous un nouvel id, statut remis a brouillon. L'action
  // "Dupliquer" au survol de l'ecran Publications s'appuie dessus : la copie
  // est une base de travail, jamais une publication (statut brouillon force).
  app.post('/api/brouillon/:id/dupliquer', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const newId = `brouillon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const titre = `${row.titre} (copie)`;

    await repo.insertBrouillon({
      id: newId,
      titre,
      statut: 'brouillon',
      type: row.type || 'carrousel',
      notes: row.notes,
      reseaux: row.reseaux,
      sourceHtml: row.sourceHtml,
      charteId: row.charteId,
      checklist: row.checklist,
      conversation: '[]',
      programme: null,
      article: row.article,
      diff: null,
      annotations: '[]',
      updatedAt: new Date().toISOString()
    });

    // Copie des slides physiques : fichier local → recopie disque, blob → copy SDK.
    const slidesSource = await repo.listSlides(id);
    let copies = 0;
    for (const s of slidesSource) {
      try {
        if (s.blobUrl) {
          const { copy } = await import('@vercel/blob');
          const fromPath = new URL(s.blobUrl).pathname.replace(/^\//, '');
          const toPath = `${newId}/${s.fichier}`;
          const result = await copy(fromPath, toPath, {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true
          });
          await repo.insertSlide({
            brouillonId: newId,
            fichier: s.fichier,
            position: s.position,
            typeMedia: s.typeMedia,
            blobUrl: result.url
          });
        } else {
          const src = path.join(options.dataDir, id, s.fichier);
          if (fs.existsSync(src)) {
            const buffer = fs.readFileSync(src);
            const stored = await storeSlide(newId, s.fichier, buffer, options.dataDir);
            await repo.insertSlide({
              brouillonId: newId,
              fichier: s.fichier,
              position: s.position,
              typeMedia: s.typeMedia,
              blobUrl: stored.blobUrl
            });
          } else {
            await repo.insertSlide({
              brouillonId: newId,
              fichier: s.fichier,
              position: s.position,
              typeMedia: s.typeMedia,
              blobUrl: null
            });
          }
        }
        copies++;
      } catch {
        /* une slide non copiee ne bloque pas la duplication */
      }
    }

    await journaliser(repo, {
      type: 'duplication',
      auteur: auteurDe(c),
      brouillonId: newId,
      brouillonTitre: titre,
      message: `a duplique "${row.titre}" (${copies} slide${copies > 1 ? 's' : ''} copiees)`,
      details: { sourceId: id, copies }
    });

    return c.json(
      { id: newId, titre, statut: 'brouillon', type: row.type || 'carrousel', slideCount: copies, updated: new Date().toISOString() },
      201
    );
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
    await journaliser(repo, {
      type: 'charte_maj',
      auteur: auteurDe(c),
      message: `a mis a jour la charte graphique "${nom}"`
    });
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
    const stats = {
      couleurs: Object.keys(parsed.couleurs).length,
      polices: [parsed.polices.titre, parsed.polices.texte].filter(Boolean).length,
      rayons: Object.keys(parsed.rayons).length,
      logos: parsed.logos.length
    };
    await journaliser(repo, {
      type: 'charte_import',
      auteur: auteurDe(c),
      message: `a importe une charte graphique depuis du CSS (${stats.couleurs} couleurs, ${stats.polices} polices)`,
      details: stats
    });
    return c.json({
      id: 'principale',
      nom,
      data,
      updatedAt,
      stats
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
      annotations: row.annotations || '[]',
      programme: row.programme ? JSON.parse(row.programme) : null,
      article: row.article ? JSON.parse(row.article) : null,
      diff: row.diff ? JSON.parse(row.diff) : null,
      versions: parseVersions(row.versions),
      decision: row.decision ? JSON.parse(row.decision) : null,
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
    const auteur = auteurDe(c);
    const currentReseaux: Record<string, unknown> = JSON.parse(row.reseaux || '{}');
    const nextReseaux = patch.reseaux ? { ...currentReseaux, ...patch.reseaux } : currentReseaux;
    const updatedAt = new Date().toISOString();
    const nextStatut = patch.statut ?? row.statut;
    const nextNotes = patch.notes ?? row.notes;
    const nextSourceHtml = patch.sourceHtml !== undefined ? patch.sourceHtml : row.sourceHtml;
    const nextChecklist = patch.checklist !== undefined ? patch.checklist : row.checklist;
    const nextConversation = patch.conversation !== undefined ? patch.conversation : row.conversation;
    const nextAnnotations = patch.annotations !== undefined ? patch.annotations : row.annotations;
    const nextType = patch.type !== undefined ? patch.type : row.type;
    const nextProgramme = patch.programme !== undefined ? patch.programme : row.programme;
    const nextArticle = patch.article !== undefined ? patch.article : row.article;

    // Chantier 5 (versioning) : chaque depot d'une source non vide ajoute une version
    // (versions/v{n}.html en Blob ou disque, liste JSON en base). Une source vide
    // (effacement) ne cree pas de version : le receptacle n'a plus de document.
    let nextVersions = parseVersions(row.versions);
    if (
      patch.sourceHtml !== undefined &&
      patch.sourceHtml !== row.sourceHtml &&
      patch.sourceHtml.trim() !== ''
    ) {
      nextVersions = await snapshotSource(id, patch.sourceHtml, auteur, options.dataDir, nextVersions);
    }

    await repo.updateBrouillon(id, {
      statut: nextStatut,
      notes: nextNotes,
      reseaux: JSON.stringify(nextReseaux),
      sourceHtml: nextSourceHtml,
      checklist: nextChecklist,
      conversation: nextConversation,
      annotations: nextAnnotations,
      type: nextType,
      programme: nextProgramme,
      article: nextArticle,
      updatedAt,
      ...(nextVersions.length > 0 ? { versions: JSON.stringify(nextVersions) } : {})
    });

    // Journal : une entree par action reelle (statut change, source deposee, programme).
    if (patch.statut !== undefined && patch.statut !== row.statut) {
      await journaliser(repo, {
        type: 'changement_statut',
        auteur,
        brouillonId: id,
        brouillonTitre: row.titre,
        message: `a change le statut de ${STATUT_LABELS[row.statut] ?? row.statut} a ${STATUT_LABELS[nextStatut] ?? nextStatut}`,
        details: { de: row.statut, vers: nextStatut }
      });
    }
    if (patch.sourceHtml !== undefined && patch.sourceHtml !== row.sourceHtml) {
      await journaliser(repo, {
        type: 'depot_source',
        auteur,
        brouillonId: id,
        brouillonTitre: row.titre,
        message: patch.sourceHtml ? `a depose la source HTML du document` : `a retire la source HTML du document`
      });
    }
    if (patch.programme !== undefined && patch.programme !== row.programme) {
      const prog = patch.programme ? JSON.parse(patch.programme) : null;
      await journaliser(repo, {
        type: 'programmation',
        auteur,
        brouillonId: id,
        brouillonTitre: row.titre,
        message: prog ? `a programme la publication (${prog.date ?? '?'} a ${prog.heure ?? '?'} sur ${prog.reseau ?? '?'})` : `a annule la programmation`,
        details: { programme: prog }
      });
    }

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
    if (role === 'agent') {
      await journaliser(repo, {
        type: 'reponse_chat',
        auteur: 'agent',
        brouillonId: id,
        brouillonTitre: row.titre,
        message: `a repondu dans la conversation (${texte.length} caracteres)`,
        details: { apercu: texte.slice(0, 120) }
      });
    } else {
      await journaliser(repo, {
        type: 'message_user',
        auteur: 'user',
        brouillonId: id,
        brouillonTitre: row.titre,
        message: `a envoye un message a l'agent (${texte.length} caracteres)`,
        details: { apercu: texte.slice(0, 120) }
      });
    }
    return c.json({ ok: true, conversation: garde });
  });

  // POST /api/brouillon/:id/versions/:numero/restaurer → restaure la source HTML
  // depuis une version snapshot (chantier 5). La restauration = set_source + regenerer :
  // le contenu de la version remplace sourceHtml, le client regenere ensuite les slides.
  app.post('/api/brouillon/:id/versions/:numero/restaurer', async (c) => {
    const id = c.req.param('id');
    const numeroRaw = c.req.param('numero');
    const numero = Number(numeroRaw);
    if (!Number.isInteger(numero) || numero < 1) {
      return c.json({ error: 'numero de version invalide' }, 400);
    }
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const versions = parseVersions(row.versions);
    const version = versions.find((v) => v.numero === numero);
    if (!version) return c.json({ error: `Version v${numero} introuvable` }, 404);

    let contenu: string;
    try {
      contenu = await lireVersion(id, version, options.dataDir);
    } catch (err) {
      return c.json({ error: `Lecture de la version v${numero} impossible: ${err instanceof Error ? err.message : 'erreur'}` }, 502);
    }

    const auteur = auteurDe(c);
    const updatedAt = new Date().toISOString();

    // Restauration = un depot : le contenu restaure devient la version courante
    // (pattern "restore = commit"), l'historique des versions reste intact.
    const versionsApres = await snapshotSource(id, contenu, auteur, options.dataDir, versions);
    await repo.updateBrouillon(id, {
      sourceHtml: contenu,
      versions: JSON.stringify(versionsApres),
      updatedAt
    });
    await journaliser(repo, {
      type: 'restauration_source',
      auteur,
      brouillonId: id,
      brouillonTitre: row.titre,
      message: `a restaure la source depuis la version v${numero}`,
      details: { numero }
    });

    return c.json({ ok: true, sourceHtml: contenu, versions: versionsApres });
  });

  // POST /api/brouillon/:id/decision → decision explicite maker/checker (UX A3).
  // Quand le brouillon est en attente de validation, deux actions claires :
  //   - 'approuver'       → statut 'valide' (approbation tracee : qui, quand)
  //   - 'demander-modifs' → statut 'brouillon' (note obligatoire, transmise a l'agent)
  // Remplace le menu statut generique pour ce statut. La decision est conservee
  // dans la colonne decision (JSON) et journalisee (Activite IA).
  app.post('/api/brouillon/:id/decision', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'JSON invalide' }, 400);
    }
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Validation echouee', details: parsed.error.flatten() }, 400);
    }
    const { decision, note } = parsed.data;

    // La decision explicite n'a de sens que sur un brouillon en attente de validation.
    if (row.statut !== 'a-valider') {
      return c.json({ error: `Decision impossible : statut actuel '${row.statut}' (attendu 'a-valider')` }, 409);
    }

    const auteur = auteurDe(c);
    const at = new Date().toISOString();
    const nextStatut = decision === 'approuver' ? 'valide' : 'brouillon';
    const trace = { decision, note: note?.trim() || null, par: auteur, at };

    await repo.updateBrouillon(id, {
      statut: nextStatut,
      decision: JSON.stringify(trace),
      updatedAt: at
    });

    await journaliser(repo, {
      type: 'decision',
      auteur,
      brouillonId: id,
      brouillonTitre: row.titre,
      message:
        decision === 'approuver'
          ? 'a approuve le contenu'
          : `a demande des modifications : ${(note ?? '').trim()}`,
      details: { decision, note: note?.trim() || null, vers: nextStatut }
    });

    return c.json({ ok: true, statut: nextStatut, decision: trace });
  });

  app.post('/api/brouillon/:id/slides', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const body = (await c.req.json().catch(() => ({}))) as { slides?: unknown };
    if (!Array.isArray(body.slides) || body.slides.length === 0) {
      return c.json({ error: 'slides requis (tableau de dataURL PNG ou MP4)' }, 400);
    }

    // Remplace toutes les slides : supprime l'existant, stocke les nouvelles.
    // Avant l'ecrasement, on copie les slides actuelles sous avant/<ts>/ pour le
    // diff visuel avant/apres (chantier 3) : l'UI affiche ce que l'agent a change.
    const slidesActuelles = await repo.listSlides(id);
    let diffData: {
      at: string;
      avant: { fichier: string; blobUrl: string | null; typeMedia: string }[];
      nbAvant: number;
      nbApres: number;
    } | null = null;
    if (slidesActuelles.length > 0) {
      const snap = await snapshotSlidesAvant(slidesActuelles, id, options.dataDir);
      if (snap.avant.length > 0) {
        diffData = { at: snap.at, avant: snap.avant, nbAvant: snap.avant.length, nbApres: body.slides.length };
      }
    }
    await repo.deleteSlides(id);
    const stored: { fichier: string; blobUrl: string | null }[] = [];
    for (let i = 0; i < body.slides.length; i++) {
      const dataUrl = body.slides[i];
      if (typeof dataUrl !== 'string' || (!dataUrl.startsWith('data:image/') && !dataUrl.startsWith('data:video/'))) {
        await repo.deleteSlides(id); // rollback
        return c.json({ error: `slide ${i + 1} invalide (dataURL image ou video attendu)` }, 400);
      }
      const base64 = dataUrl.split(',')[1] ?? '';
      const buffer = Buffer.from(base64, 'base64');
      const isVideo = dataUrl.startsWith('data:video/');
      const ext = isVideo ? 'mp4' : 'png';
      const typeMedia = isVideo ? 'video' : 'image';
      const fichier = `slides/slide-${String(i + 1).padStart(2, '0')}.${ext}`;
      const result = await storeSlide(id, fichier, buffer, options.dataDir);
      await repo.insertSlide({
        brouillonId: id,
        fichier: result.fichier,
        position: i + 1,
        typeMedia,
        blobUrl: result.blobUrl
      });
      stored.push(result);
    }

    const updatedAt = new Date().toISOString();
    await repo.updateBrouillon(id, { updatedAt, ...(diffData ? { diff: JSON.stringify(diffData) } : {}) });

    await journaliser(repo, {
      type: 'regeneration',
      auteur: auteurDe(c),
      brouillonId: id,
      brouillonTitre: row.titre,
      message: `a regenere les ${stored.length} slide${stored.length > 1 ? 's' : ''}`,
      details: { nb: stored.length }
    });

    return c.json({
      ok: true,
      slideCount: stored.length,
      slides: stored.map((s) => s.fichier),
      ...(diffData ? { diff: diffData } : {})
    });
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
    const rowOrdre = await repo.getBrouillon(id);
    await journaliser(repo, {
      type: 'reorganisation',
      auteur: auteurDe(c),
      brouillonId: id,
      brouillonTitre: rowOrdre?.titre ?? id,
      message: `a reordonne les slides`
    });
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
      await journaliser(repo, {
        type: 'depot_ressource',
        auteur: auteurDe(c),
        message: `a archive la page web "${nom}"`,
        details: { categorie, sourceUrl: String(body.sourceUrl).slice(0, 120) }
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
    await journaliser(repo, {
      type: 'depot_ressource',
      auteur: auteurDe(c),
      message: `a depose la ressource "${nom}" (${type}) dans la bibliotheque`,
      details: { categorie, taille: buffer.length }
    });
    return c.json({ ok: true, id });
  });

  // DELETE /api/ressource/:id
  app.delete('/api/ressource/:id', async (c) => {
    const id = c.req.param('id');
    const r = await repo.getRessource(id);
    if (r) {
      await repo.deleteRessource(id);
      await journaliser(repo, {
        type: 'suppression',
        auteur: auteurDe(c),
        message: `a supprime la ressource "${r.nom}" de la bibliotheque`
      });
    }
    return c.json({ ok: true });
  });

  // ═════════════════ JOURNAL D'ACTIVITE ════════════════════════════════

  // GET /api/journal → le fil d'activite reel (depots, regenerations, reponses
  // chat, statuts changes...), les plus recentes en premier. La page "Activite IA"
  // l'affiche au lieu d'un fil simule.
  app.get('/api/journal', async (c) => {
    const limitRaw = Number(c.req.query('limit') || 100);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 200);
    const rows = await repo.listJournal(limit);
    return c.json(
      rows.map((row) => ({
        id: row.id,
        type: row.type,
        auteur: row.auteur,
        brouillonId: row.brouillonId,
        brouillonTitre: row.brouillonTitre,
        message: row.message,
        details: row.details ? JSON.parse(row.details) : {},
        at: row.createdAt
      }))
    );
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

  // ═════════════════ RACCORD POSTIZ (issue #5) ═════════════════════════════
  // Depuis un brouillon VALIDÉ, crée le brouillon de publication Postiz :
  // upload des slides + post en statut draft (JAMAIS schedule — la programmation
  // reste un acte humain dans Postiz, workflow inaliénable brouillon → validation → publication).
  app.post('/api/brouillon/:id/postiz', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    if (row.statut !== 'valide') {
      return c.json({ error: `Statut '${row.statut}' : seul un brouillon 'valide' peut être envoyé vers Postiz` }, 409);
    }

    const fichiers = await slideFichiersDe(repo, id);
    if (!fichiers.length) return c.json({ error: 'Aucune slide dans ce brouillon' }, 400);

    const { getPostizConfig, postizListIntegrations, postizUpload, postizCreateDraft } = await import('./integrations/postiz.js');
    const config = getPostizConfig();
    if (!config) {
      return c.json(
        { error: 'Raccord Postiz non configuré (POSTIZ_API_URL / POSTIZ_API_KEY introuvables). Le raccord ne fonctionne qu’en local, là où Postiz self-hosted tourne.' },
        503
      );
    }

    let body: { reseau?: string; caption?: string; hashtags?: string; date?: string; heure?: string; integration_id?: string } = {};
    try {
      body = (await c.req.json().catch(() => ({}))) as typeof body;
    } catch { /* body vide → tout vient du brouillon */ }

    // Résolution du réseau : body > programme du brouillon > instagram
    let programme: { date?: string; heure?: string; reseau?: string } | null = null;
    try {
      programme = row.programme ? JSON.parse(row.programme) : null;
    } catch { programme = null; }

    const reseau = body.reseau || programme?.reseau || 'instagram';
    const reseaux: Record<string, { caption?: string; hashtags?: string }> = JSON.parse(row.reseaux || '{}');
    const entry = reseaux[reseau] || {};
    const caption = (body.caption ?? entry.caption ?? '').trim();
    const hashtags = (body.hashtags ?? entry.hashtags ?? '').trim();
    const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;
    if (!fullCaption) {
      return c.json({ error: `Légende vide pour le réseau '${reseau}' (body ou brouillon)` }, 400);
    }

    // Date de programmation : body > programme > maintenant (draft : la date reste indicative)
    const dateStr = body.date || programme?.date || new Date().toISOString().slice(0, 10);
    const heureStr = body.heure || programme?.heure || '10:00';
    const iso = new Date(`${dateStr}T${heureStr}:00`).toISOString();

    // Id d'intégration : body > env dédiée > premier canal actif de Postiz
    let integrationId = body.integration_id || process.env.ATELIER_INSTAGRAM_INTEGRATION_ID || '';
    if (!integrationId) {
      const channels = await postizListIntegrations(config);
      if (!channels.length) return c.json({ error: 'Aucun canal connecté dans Postiz' }, 502);
      const first = channels[0];
      if (!first) return c.json({ error: 'Aucun canal connecté dans Postiz' }, 502);
      integrationId = first.id;
    }

    // Upload des slides (lecture disque local : le raccord Postiz est un raccord local)
    const mediaUrls: string[] = [];
    try {
      for (const fichier of fichiers) {
        const safe = path.normalize(fichier).replace(/^(\\.\\.[/\\\\])+/, '');
        const filePath = path.join(options.dataDir, id, safe);
        if (!filePath.startsWith(path.join(options.dataDir, id))) {
          return c.json({ error: `Chemin de slide refusé : ${fichier}` }, 400);
        }
        if (!fs.existsSync(filePath)) {
          return c.json(
            { error: `Slide introuvable sur disque : ${fichier} (le raccord Postiz lit les fichiers locaux — mode local requis)` },
            422
          );
        }
        const buffer = fs.readFileSync(filePath);
        mediaUrls.push(await postizUpload(config, buffer, path.basename(fichier)));
      }
    } catch (e) {
      return c.json({ error: `Upload Postiz: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }

    let postId = '';
    try {
      postId = await postizCreateDraft(config, {
        integrationId,
        caption: fullCaption,
        mediaUrls,
        date: iso,
        settings: { post_type: 'post' }
      });
    } catch (e) {
      return c.json({ error: `Création du brouillon Postiz: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }

    return c.json({
      ok: true,
      postId,
      integrationId,
      reseau,
      slides_uploaded: mediaUrls.length,
      date: iso,
      statut: 'draft' // jamais publié automatiquement
    }, 201);
  });

  // POST /api/brouillon/:id/publier-cms → publie un article (type 'article') vers le CMS
  // Sanity. Réconciliation avec le pipeline Notion→Sanity existant : le module
  // integrations/sanity.ts utilise _id = 'article-<slug>' (createOrReplace idempotent).
  // Garde-fou inaliénable : seul un brouillon 'valide' part au CMS, et le statut
  // passe à 'publie' uniquement après succès (jamais de publication automatique).
  app.post('/api/brouillon/:id/publier-cms', async (c) => {
    const id = c.req.param('id');
    const row = await repo.getBrouillon(id);
    if (!row) return c.json({ error: 'Inconnu' }, 404);

    const type = row.type || 'carrousel';
    if (type !== 'article') {
      return c.json({ error: `Type '${type}' : seuls les brouillons 'article' se publient vers le CMS` }, 409);
    }
    if (row.statut !== 'valide') {
      return c.json({ error: `Statut '${row.statut}' : seul un article 'valide' peut être publié vers le CMS` }, 409);
    }

    let article: Record<string, unknown> = {};
    try {
      article = row.article ? JSON.parse(row.article) : {};
    } catch {
      article = {};
    }
    const slug = typeof article.slug === 'string' && article.slug.trim() ? article.slug.trim() : '';
    const chapo = typeof article.chapo === 'string' ? article.chapo : '';
    const corpsHtml = row.sourceHtml || '';
    if (!slug) return c.json({ error: 'Slug manquant : renseignez le slug de l\'article avant publication' }, 400);
    if (!corpsHtml.trim()) return c.json({ error: 'Corps vide : déposez la source HTML de l\'article avant publication' }, 400);

    const { getSanityConfig, publishArticle } = await import('./integrations/sanity.js');
    if (!getSanityConfig()) {
      return c.json(
        { error: 'CMS non configuré : PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN requis (env Vercel).' },
        503
      );
    }

    let result: { id: string; url: string; slug: string };
    try {
      const pub = await publishArticle(getSanityConfig()!, {
        slug,
        title: row.titre,
        excerpt: chapo,
        rawHtml: corpsHtml,
        seoTitle: typeof article.seoTitle === 'string' ? article.seoTitle : undefined,
        seoDescription: typeof article.seoDescription === 'string' ? article.seoDescription : undefined,
        category: typeof article.category === 'string' ? article.category : undefined,
        publishedAt: typeof article.publishedAt === 'string' ? article.publishedAt : undefined,
        readingTime: typeof article.readingTime === 'number' ? article.readingTime : undefined
      });
      result = { id: pub.cmsId, url: pub.url, slug: pub.slug };
    } catch (e) {
      return c.json({ error: `Publication CMS: ${e instanceof Error ? e.message : String(e)}` }, 502);
    }

    // Persiste l'identifiant CMS + l'URL + le statut publié (uniquement après succès).
    const nextArticle = { ...article, cmsId: result.id, cmsUrl: result.url, cmsSlug: result.slug };
    const updatedAt = new Date().toISOString();
    await repo.updateBrouillon(id, {
      article: JSON.stringify(nextArticle),
      statut: 'publie',
      updatedAt
    });
    await journaliser(repo, {
      type: 'publication_cms',
      auteur: auteurDe(c),
      brouillonId: id,
      brouillonTitre: row.titre,
      message: `a publié l'article \"${row.titre}\" vers le CMS (${result.slug})`,
      details: { cmsId: result.id, cmsUrl: result.url }
    });

    return c.json({
      ok: true,
      cmsId: result.id,
      cmsUrl: result.url,
      slug: result.slug,
      statut: 'publie'
    }, 201);
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
        const repo = createPgRepo(db);
        // Derive le journal des updatedAt existants la premiere fois (base deja peuplee).
        await backfillJournal(repo);
        return repo;
      }
      const DB_PATH = process.env.API_DB_PATH || '/tmp/atelier.db';
      const sqlite = openSqlite(DB_PATH);
      ensureLegacyTables(sqlite);
      migrateWithDrizzle(sqlite);
      const db = createDb(sqlite);
      const repo = createSqliteRepo(db);
      await backfillJournal(repo);
      return repo;
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
