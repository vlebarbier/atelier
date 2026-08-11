import { describe, it, expect } from 'vitest';
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
