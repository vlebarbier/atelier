// Verifie le stockage des slides en mode SQLite local (dataURL -> fichier + GET image)
const API = 'http://127.0.0.1:4320';
const DATAURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, ...j };
}
(async () => {
  const cree = await api('/api/brouillons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titre: 'a1-slide-test', type: 'carrousel' }) });
  const id = cree.brouillon?.id || cree.id;
  console.log('id:', id);
  const up = await api('/api/brouillon/' + id + '/slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slides: [DATAURL] }) });
  console.log('upload:', up.status, JSON.stringify(up).slice(0, 150));
  const det = await api('/api/brouillon/' + id);
  console.log('detail slides:', JSON.stringify(det.brouillon?.slides || det.slides || det).slice(0, 200));
  const img = await fetch(API + '/b/' + id + '/slides/slide-01.png');
  console.log('GET image:', img.status, img.headers.get('content-type'), (await img.arrayBuffer()).byteLength + 'o');
  await api('/api/brouillon/' + id, { method: 'DELETE' });
  console.log('cleanup ok');
})();
