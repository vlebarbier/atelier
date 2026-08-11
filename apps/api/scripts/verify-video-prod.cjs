// Vérif prod : GET liste renvoie type/programme + POST slides accepte data:video
const API = 'https://atelier-api-three.vercel.app';

(async () => {
  // 1. Liste : type présent ?
  const list = await (await fetch(`${API}/api/brouillons`)).json();
  console.log('1. Liste:', Array.isArray(list) ? list.length + ' brouillons' : JSON.stringify(list));
  if (Array.isArray(list) && list[0]) {
    console.log('   type du premier:', list[0].type, '| programme:', JSON.stringify(list[0].programme));
  }

  // 2. POST slides avec un data:video (petit buffer) sur un brouillon de test
  const created = await (await fetch(`${API}/api/brouillons`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'Test video', type: 'video' })
  })).json();
  const testId = created.id;
  console.log('   brouillon cree:', testId, '| type:', created.type);
  // tiny fake video dataURL (1px mp4 pas valide mais test du routing MIME)
  const fakeVideo = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAA' +
    'IZnJlZQAAA21tb290aAAABtZtb292YQAAAaZoYXYwAAAAAFAAAABQAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const res = await fetch(`${API}/api/brouillon/${testId}/slides`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: [fakeVideo] })
  });
  const j = await res.json();
  console.log('2. POST slides video →', res.status, JSON.stringify(j));

  // 3. GET detail : le fichier est-il .mp4 ?
  const d = await (await fetch(`${API}/api/brouillon/${testId}`)).json();
  console.log('3. Detail → type:', d.type, '| slide:', d.slides?.[0], '| slideCount:', d.slideCount);

  // 4. cleanup
  await fetch(`${API}/api/brouillon/${testId}`, { method: 'DELETE' });
  console.log('4. Cleanup DELETE → OK');
})().catch((e) => { console.error('ERREUR:', e.message); process.exit(1); });
