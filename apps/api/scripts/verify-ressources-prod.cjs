// Vérif prod : cycle ressources complet avec upload réel
const BASE = 'https://atelier-api-three.vercel.app';
const fs = require('fs');

// Vraie image : slide 1 du carrousel (déjà en prod via /b/...)
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function main() {
  // 1. POST upload réel
  const post = await fetch(`${BASE}/api/ressources`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nom: 'photo-prod-test.png', type: 'image', categorie: 'visuel', contenu: PNG_1PX })
  });
  const p = await post.json();
  console.log('POST upload prod →', post.status, '| id:', p.id);

  // 2. GET liste
  const list = await (await fetch(`${BASE}/api/ressources`)).json();
  console.log('GET liste →', list.length, 'ressources');

  // 3. GET détail avec URL signée
  const detail = await (await fetch(`${BASE}/api/ressource/${p.id}`)).json();
  console.log('GET détail → url:', detail.url ? 'signée OK' : 'null');
  if (detail.url) {
    const img = await fetch(detail.url);
    console.log('Fichier Blob →', img.status, img.headers.get('content-type'));
  }

  // 4. DELETE
  const del = await fetch(`${BASE}/api/ressource/${p.id}`, { method: 'DELETE' });
  console.log('DELETE →', del.status);
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
