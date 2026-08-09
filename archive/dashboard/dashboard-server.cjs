#!/usr/bin/env node
/**
 * Bordeluche — Dashboard de révision de contenu (brouillons avant publication)
 * Node natif, zéro dépendance. Sert sur http://localhost:4310
 *
 * Structure des brouillons :
 *   .hermes-instagram/brouillons/<nom-projet>/
 *     meta.json            { titre, statut, notes, reseaux: { <reseau>: { caption, hashtags, statut } }, updated }
 *     slides/slide-XX.png  les visuels (ordre alphabétique)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BROUILLONS = path.join(ROOT, 'brouillons');
const PORT = 4310;

const RESEAUX_DEFAUT = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

function readMeta(dir) {
  const mPath = path.join(dir, 'meta.json');
  if (fs.existsSync(mPath)) {
    try { return JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch { return {}; }
  }
  return {};
}

function writeMeta(dir, meta) {
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
}

function listSlides(dir) {
  const sDir = path.join(dir, 'slides');
  if (!fs.existsSync(sDir)) return [];
  return fs.readdirSync(sDir)
    .filter(f => /\.(png|jpe?g|webp)$/i.test(f))
    .sort()
    .map(f => `slides/${f}`);
}

function scanBrouillons() {
  if (!fs.existsSync(BROUILLONS)) return [];
  return fs.readdirSync(BROUILLONS, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const dir = path.join(BROUILLONS, d.name);
      const meta = readMeta(dir);
      const slides = listSlides(dir);
      return {
        id: d.name,
        titre: meta.titre || d.name.replace(/[-_]/g, ' '),
        statut: meta.statut || 'brouillon',
        notes: meta.notes || '',
        reseaux: meta.reseaux || {},
        updated: meta.updated || null,
        slideCount: slides.length,
        slides,
      };
    })
    .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON invalide')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  try {
    // Liste des brouillons
    if (p === '/api/brouillons' && req.method === 'GET') {
      sendJson(res, 200, scanBrouillons());
      return;
    }

    // Détail d'un brouillon (avec reseaux complétés)
    const detailMatch = p.match(/^\/api\/brouillon\/([^/]+)$/);
    if (detailMatch && req.method === 'GET') {
      const id = detailMatch[1];
      const dir = path.join(BROUILLONS, id);
      if (!fs.existsSync(dir)) { sendJson(res, 404, { error: 'Inconnu' }); return; }
      const meta = readMeta(dir);
      // Compléter les réseaux manquants avec des entrées vides
      const reseaux = { ...meta.reseaux };
      for (const r of RESEAUX_DEFAUT) {
        if (!reseaux[r]) reseaux[r] = { caption: '', hashtags: '', statut: 'brouillon' };
      }
      sendJson(res, 200, {
        id,
        titre: meta.titre || id.replace(/[-_]/g, ' '),
        statut: meta.statut || 'brouillon',
        notes: meta.notes || '',
        reseaux,
        updated: meta.updated || null,
        slideCount: listSlides(dir).length,
        slides: listSlides(dir),
      });
      return;
    }

    // Mise à jour d'un brouillon (statut / notes / reseaux)
    if (detailMatch && req.method === 'POST') {
      const id = detailMatch[1];
      const dir = path.join(BROUILLONS, id);
      if (!fs.existsSync(dir)) { sendJson(res, 404, { error: 'Inconnu' }); return; }
      const body = await readBody(req);
      const meta = readMeta(dir);
      if (body.statut !== undefined) meta.statut = body.statut;
      if (body.notes !== undefined) meta.notes = body.notes;
      if (body.reseaux !== undefined) {
        meta.reseaux = { ...(meta.reseaux || {}), ...body.reseaux };
      }
      meta.updated = new Date().toISOString();
      writeMeta(dir, meta);
      sendJson(res, 200, { ok: true, meta });
      return;
    }

    // Brouillon : /b/<id>/<fichier>
    const bMatch = p.match(/^\/b\/([^/]+)\/(.+)$/);
    if (bMatch) {
      const id = bMatch[1];
      const file = bMatch[2];
      const safe = path.normalize(file).replace(/^(\.\.(\/|\\))+/, '');
      const filePath = path.join(BROUILLONS, id, safe);
      if (!filePath.startsWith(path.join(BROUILLONS, id))) { res.writeHead(403); res.end('Forbidden'); return; }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        serveStatic(res, filePath);
      } else {
        res.writeHead(404); res.end('Not found');
      }
      return;
    }

    // Dashboard
    if (p === '/' || p === '/index.html') {
      serveStatic(res, path.join(ROOT, 'dashboard.html'));
      return;
    }

    res.writeHead(404); res.end('Not found');
  } catch (e) {
    sendJson(res, 400, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`📋 Bordeluche Content Review — http://localhost:${PORT}`);
  console.log(`   Brouillons : ${BROUILLONS}`);
});
