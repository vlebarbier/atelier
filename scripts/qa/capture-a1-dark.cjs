// Capture dark : modes CREER (S0) et S2 (valide sans programme)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
const API = 'http://127.0.0.1:4320';
const WEB = 'http://localhost:4173';
const DATAURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, ...j };
}
(async () => {
  const cree = await api('/api/brouillons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titre: 'a1-dark-test', type: 'carrousel' }) });
  const id = cree.brouillon?.id || cree.id;
  await api('/api/brouillon/' + id + '/slides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slides: [DATAURL] }) });

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 120)));

  // S2 : statut valide sans programme
  await api('/api/brouillon/' + id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'valide' }) });
  await p.goto(WEB + '/', { waitUntil: 'networkidle' });
  await p.waitForSelector('.draft-card, .card', { timeout: 15000 });
  await p.locator('.draft-card, .card').filter({ hasText: 'a1-dark-test' }).first().click();
  await p.waitForSelector('#detail', { timeout: 10000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-dark-s2.png' });
  console.log('dark S2: mode=' + (await p.getAttribute('#detail', 'data-mode')) + ' sugg=' + (await p.locator('.suggestion-band').count()));
  await b.close();
  await api('/api/brouillon/' + id, { method: 'DELETE' });
  console.log('ERRS:', errs.length ? errs.join(' | ') : '0');
})();
