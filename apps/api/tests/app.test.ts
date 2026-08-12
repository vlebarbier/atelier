import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb, openSqlite } from '../src/db/client.js';
import { ensureLegacyTables } from '../src/db/legacy.js';
import { brouillons, slides } from '../src/db/schema.js';
import { createSqliteRepo } from '../src/db/repo-sqlite.js';

/** L'app est testee en memoire (app.request()), pas de serveur reseau lance. */
function buildTestApp() {
  const sqlite = openSqlite(':memory:');
  ensureLegacyTables(sqlite);
  const db = createDb(sqlite);

  db.insert(brouillons)
    .values({
      id: 'carrousel-bordeluche-v7',
      titre: 'Carrousel, Pourquoi Bordeluche existe (v7)',
      statut: 'brouillon',
      notes: 'Test',
      reseaux: '{}',
      updatedAt: '2026-08-09T10:58:24.332Z'
    })
    .run();
  db.insert(slides).values({ brouillonId: 'carrousel-bordeluche-v7', fichier: 'slides/slide-01.png', position: 0 }).run();

  const repo = createSqliteRepo(db);
  const app = createApp(repo, { dataDir: '/tmp/atelier-test-data' });
  return { app, db };
}

describe('GET /api/brouillons', () => {
  it('repond 200 avec un tableau contenant le brouillon seede', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillons');
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect((body[0] as { id: string }).id).toBe('carrousel-bordeluche-v7');
    expect((body[0] as { slideCount: number }).slideCount).toBe(1);
  });
});

describe('GET /api/brouillon/:id', () => {
  it('repond 200 avec le detail complet et les reseaux par defaut', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reseaux: Record<string, unknown> };
    expect(body.reseaux.instagram).toBeDefined();
  });

  it('repond 404 pour un id inconnu', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/inconnu');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/brouillon/:id', () => {
  it('rejette un statut invalide avec 400 (validation Zod)', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'statut-invalide-xyz' })
    });
    expect(res.status).toBe(400);
  });

  it('accepte une mise a jour de statut valide et la persiste', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'a-valider' })
    });
    expect(res.status).toBe(200);

    const check = await app.request('/api/brouillon/carrousel-bordeluche-v7');
    const body = (await check.json()) as { statut: string };
    expect(body.statut).toBe('a-valider');
  });

  it('persiste des annotations de revision (JSON) et les renvoie dans le detail', async () => {
    const { app } = buildTestApp();
    const annotations = JSON.stringify([
      { id: 'ann-1', slide: 0, x: 0.32, y: 0.58, texte: 'Texte trop petit', at: '2026-08-12T10:00:00.000Z' },
      { id: 'ann-2', slide: 2, x: 0.5, y: 0.2, texte: 'Logo flou', at: '2026-08-12T10:05:00.000Z' }
    ]);
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations })
    });
    expect(res.status).toBe(200);

    const detail = await app.request('/api/brouillon/carrousel-bordeluche-v7');
    const body = (await detail.json()) as { annotations: string };
    const parsed = JSON.parse(body.annotations) as { id: string; x: number; y: number }[];
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ id: 'ann-1', x: 0.32, y: 0.58 });
  });
});

describe('Dissociation contenus / documents (type)', () => {
  it('POST /api/brouillons avec un type documentaire persiste le type', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Flyer test', type: 'flyer' })
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string };
    const detail = await app.request(`/api/brouillon/${created.id}`);
    const body = (await detail.json()) as { type: string };
    expect(body.type).toBe('flyer');
  });

  it('POST /api/brouillons sans type → carrousel par defaut', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Post sans type' })
    });
    const created = (await res.json()) as { id: string };
    const detail = await app.request(`/api/brouillon/${created.id}`);
    const body = (await detail.json()) as { type: string };
    expect(body.type).toBe('carrousel');
  });

  it('la liste renvoie le type de chaque brouillon (filtrage cote client possible)', async () => {
    const { app } = buildTestApp();
    await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Flyer test', type: 'flyer' })
    });
    const res = await app.request('/api/brouillons');
    const body = (await res.json()) as { type: string }[];
    const types = body.map((b) => b.type);
    expect(types).toContain('carrousel'); // brouillon seede
    expect(types).toContain('flyer');
  });

  it('POST /api/brouillons avec une conversation pre-remplie la persiste (porte entree creation)', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: 'Carrousel temoignage',
        type: 'carrousel',
        conversation: [{ role: 'user', texte: 'Cree un carrousel temoignage pour la Maison des Mûriers.' }]
      })
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as { id: string };
    const detail = await app.request(`/api/brouillon/${created.id}`);
    const body = (await detail.json()) as { conversation: string };
    const conv = JSON.parse(body.conversation) as { role: string; texte: string; at: string }[];
    expect(conv).toHaveLength(1);
    expect(conv[0]?.role).toBe('user');
    expect(conv[0]?.texte).toContain('temoignage');
    expect(conv[0]?.at).toBeDefined(); // timestamp genere serveur
  });
});

describe('GET /api/conversations/en-attente (worker asynchrone)', () => {
  it('ne liste rien quand aucune conversation ou dernier message agent', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/conversations/en-attente');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('liste un brouillon dont le dernier message est user, avec la queue de messages', async () => {
    const { app } = buildTestApp();
    await app.request('/api/brouillon/carrousel-bordeluche-v7/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: 'Corrige la slide 3' })
    });
    const res = await app.request('/api/conversations/en-attente');
    const body = (await res.json()) as {
      id: string;
      titre: string;
      statut: string;
      messages: { role: string; texte: string; at: string }[];
    }[];
    expect(body).toHaveLength(1);
    expect(body[0]?.id).toBe('carrousel-bordeluche-v7');
    expect(body[0]?.titre).toContain('Pourquoi Bordeluche');
    const dernier = body[0]?.messages[body[0].messages.length - 1];
    expect(dernier?.role).toBe('user');
    expect(dernier?.texte).toBe('Corrige la slide 3');
    expect(dernier?.at).toBeDefined();
  });

  it('sort le brouillon des en-attente des que l agent repond (etat derive, pas de flag)', async () => {
    const { app } = buildTestApp();
    await app.request('/api/brouillon/carrousel-bordeluche-v7/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: 'Corrige la slide 3' })
    });
    await app.request('/api/brouillon/carrousel-bordeluche-v7/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: 'C est fait.', role: 'agent' })
    });
    const res = await app.request('/api/conversations/en-attente');
    expect(await res.json()).toEqual([]);
  });

  it('renvoie une sortie triee par id (deterministe pour le monitor du worker)', async () => {
    const { app } = buildTestApp();
    const cree = [];
    for (const titre of ['Brouillon B', 'Brouillon A']) {
      const res = await app.request('/api/brouillons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre })
      });
      cree.push(((await res.json()) as { id: string }).id);
    }
    // Le POST /message sur des ids generes cote serveur (pas de collision de timestamp).
    for (const id of cree) {
      await app.request(`/api/brouillon/${id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texte: 'En attente' })
      });
    }
    const res = await app.request('/api/conversations/en-attente');
    const body = (await res.json()) as { id: string }[];
    expect(body.map((b) => b.id)).toEqual([...cree].sort());
  });
});

describe('POST /api/brouillon/:id/publier-cms (Blog → CMS Sanity)', () => {
  it('rejette 409 un brouillon qui n est pas de type article', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7/publier-cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('article');
  });

  it('rejette 409 un article non valide (statut brouillon)', async () => {
    const { app } = buildTestApp();
    const created = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Article test', type: 'article' })
    });
    const { id } = (await created.json()) as { id: string };
    const res = await app.request(`/api/brouillon/${id}/publier-cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(409);
  });

  it('rejette 400 un article valide sans slug', async () => {
    const { app } = buildTestApp();
    const created = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Article sans slug', type: 'article' })
    });
    const { id } = (await created.json()) as { id: string };
    await app.request(`/api/brouillon/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut: 'valide' })
    });
    const res = await app.request(`/api/brouillon/${id}/publier-cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Slug');
  });

  it('repond 503 quand le CMS n est pas configure (pas d env Sanity)', async () => {
    const { app } = buildTestApp();
    const created = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Article CMS', type: 'article' })
    });
    const { id } = (await created.json()) as { id: string };
    await app.request(`/api/brouillon/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statut: 'valide',
        article: JSON.stringify({ slug: 'article-cms', chapo: 'Chapo test' }),
        sourceHtml: '<p>Corps de l article</p>'
      })
    });
    const res = await app.request(`/api/brouillon/${id}/publier-cms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('CMS non configur');
  });
});

describe('Journal d activite (GET /api/journal)', () => {
  it('renvoie 200 avec un tableau (vide au depart)', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/journal');
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
  });

  it('inscrit un changement de statut et le header x-atelier-auteur: agent', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-atelier-auteur': 'agent' },
      body: JSON.stringify({ statut: 'a-valider' })
    });
    expect(res.status).toBe(200);

    const j = (await (await app.request('/api/journal')).json()) as {
      type: string;
      auteur: string;
      message: string;
      details: { de: string; vers: string };
    }[];
    expect(j).toHaveLength(1);
    expect(j[0]?.type).toBe('changement_statut');
    expect(j[0]?.auteur).toBe('agent');
    expect(j[0]?.details.de).toBe('brouillon');
    expect(j[0]?.details.vers).toBe('a-valider');
  });

  it('inscrit un depot de source HTML sans header → auteur user', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceHtml: '<html><body>test</body></html>' })
    });
    expect(res.status).toBe(200);

    const j = (await (await app.request('/api/journal')).json()) as {
      type: string;
      auteur: string;
      message: string;
    }[];
    expect(j[0]?.type).toBe('depot_source');
    expect(j[0]?.auteur).toBe('user');
  });

  it('inscrit une reponse agent (POST /message role agent)', async () => {
    const { app } = buildTestApp();
    await app.request('/api/brouillon/carrousel-bordeluche-v7/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texte: 'Slides regenerees.', role: 'agent' })
    });
    const j = (await (await app.request('/api/journal')).json()) as { type: string; auteur: string }[];
    expect(j[0]?.type).toBe('reponse_chat');
    expect(j[0]?.auteur).toBe('agent');
  });
});

// ═════════════════ RACCORD POSTIZ (F-45 / issue #5) ═══════════════════════
// Le routeur exige un brouillon 'valide', des slides, et une config Postiz
// (POSTIZ_API_URL + POSTIZ_API_KEY, ou POSTIZ_CLI_ENV). Les appels réseau vers
// Postiz sont mockés : on teste le contrat de la route, pas l'instance réelle.
describe('POST /api/brouillon/:id/postiz', () => {
  const ENV_KEYS = ['POSTIZ_API_URL', 'POSTIZ_API_KEY', 'POSTIZ_CLI_ENV', 'ATELIER_INSTAGRAM_INTEGRATION_ID'];
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  async function postizier(app: ReturnType<typeof buildTestApp>['app'], id: string, statut: string, reseaux: string) {
    // `reseaux` est un JSON string en entree de test ; l'API attend un objet (Zod record).
    let reseauxObj: Record<string, unknown> = {};
    try { reseauxObj = JSON.parse(reseaux); } catch { reseauxObj = {}; }
    return app.request(`/api/brouillon/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, reseaux: reseauxObj })
    });
  }

  it('repond 404 pour un brouillon inconnu', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/brouillon/inconnu/postiz', { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('rejette 409 si le statut n est pas valide (workflow inalienable)', async () => {
    const { app } = buildTestApp();
    // Le brouillon seede est en 'brouillon' : l envoi Postiz doit etre refuse.
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7/postiz', { method: 'POST' });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("seul un brouillon 'valide'");
  });

  it('rejette 400 si aucune slide', async () => {
    const { app } = buildTestApp();
    const created = await app.request('/api/brouillons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Sans slides' })
    });
    const b = (await created.json()) as { id: string };
    await postizier(app, b.id, 'valide', JSON.stringify({ instagram: { caption: 'Test', hashtags: '', statut: 'valide' } }));
    const res = await app.request(`/api/brouillon/${b.id}/postiz`, { method: 'POST' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('Aucune slide');
  });

  it('rejette 503 si le raccord Postiz n est pas configure', async () => {
    const { app } = buildTestApp();
    await postizier(app, 'carrousel-bordeluche-v7', 'valide', JSON.stringify({ instagram: { caption: 'Test', hashtags: '', statut: 'valide' } }));
    process.env.POSTIZ_CLI_ENV = '/nonexistent/cli.env';
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7/postiz', { method: 'POST' });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toContain('non configuré');
  });

  it('rejette 400 si la legende est vide (body et brouillon)', async () => {
    const { app } = buildTestApp();
    await postizier(app, 'carrousel-bordeluche-v7', 'valide', JSON.stringify({ instagram: { caption: '', hashtags: '', statut: 'valide' } }));
    process.env.POSTIZ_CLI_ENV = '/nonexistent/cli.env';
    process.env.POSTIZ_API_URL = 'http://localhost:4007/api';
    process.env.POSTIZ_API_KEY = 'test-key';
    const res = await app.request('/api/brouillon/carrousel-bordeluche-v7/postiz', { method: 'POST' });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('Légende vide');
  });
});

describe('GET /api/health', () => {
  it('repond 200 ok avec le mode de stockage (sqlite sans env Postgres)', async () => {
    const { app } = buildTestApp();
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; mode: string; at: string };
    expect(body.ok).toBe(true);
    expect(body.mode).toBe('sqlite');
    expect(typeof body.at).toBe('string');
  });
});

describe('GET /api/integrations/statut', () => {
  it('repond l etat des raccords de publication (aucun configure dans le test)', async () => {
    // Isolement de l env : getPostizConfig lit aussi ~/postiz/cli.env (machine
    // de dev) et les env directes. On pointe POSTIZ_CLI_ENV vers un chemin
    // inexistant et on neutralise le reste pour un test deterministe.
    const saved: Record<string, string | undefined> = {};
    for (const key of ['POSTIZ_API_URL', 'POSTIZ_API_KEY', 'SANITY_WRITE_TOKEN']) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    saved.POSTIZ_CLI_ENV = process.env.POSTIZ_CLI_ENV;
    process.env.POSTIZ_CLI_ENV = '/nonexistent-postiz-cli-env';
    try {
      const { app } = buildTestApp();
      const res = await app.request('/api/integrations/statut');
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        postiz: { configure: boolean; apiUrl: string | null; joignable: boolean | null; canaux: number | null; erreur: string | null };
        sanity: { configure: boolean; projectId: string | null };
        buffer: { configure: boolean; aVenir: boolean };
      };
      expect(body.postiz.configure).toBe(false);
      expect(body.postiz.apiUrl).toBe(null);
      expect(body.postiz.joignable).toBe(null);
      expect(body.sanity.configure).toBe(false);
      expect(body.buffer.aVenir).toBe(true);
    } finally {
      for (const key of Object.keys(saved)) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key] as string;
      }
    }
  });
});
