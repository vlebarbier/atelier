import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { createDb, openSqlite } from '../src/db/client.js';
import { ensureLegacyTables } from '../src/db/legacy.js';
import { brouillons, slides } from '../src/db/schema.js';

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

  const app = createApp(db, { dataDir: '/tmp/atelier-test-data' });
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
