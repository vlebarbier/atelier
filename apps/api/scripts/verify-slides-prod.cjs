// Vérif prod : route slides (remplacement) avec un vrai PNG
const BASE = 'https://atelier-api-three.vercel.app';
const fs = require('fs');

async function main() {
  // PNG réel (reprendre une slide existante du prototype)
  const buf = fs.readFileSync('/Users/victorlebarbier/Bordeluche/.hermes-instagram/brouillons/carrousel-bordeluche-v7/slides/slide-01.png');
  const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;

  // Test : remplacer par 1 slide puis restaurer les 9
  const res = await fetch(`${BASE}/api/brouillon/carrousel-bordeluche-v7/slides`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: [dataUrl, dataUrl, dataUrl] })
  });
  const body = await res.json();
  console.log('POST slides prod →', res.status, '· slideCount:', body.slideCount);

  // Image servie ?
  const img = await fetch(`${BASE}/b/carrousel-bordeluche-v7/slides/slide-01.png`, { redirect: 'follow' });
  console.log('Image servie →', img.status, img.headers.get('content-type'), (await img.arrayBuffer()).byteLength, 'octets');
}

main().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
