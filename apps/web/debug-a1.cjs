// Debug 2 : le vrai rendu de la grille + erreur 500
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('response', r => { if (r.status() >= 400) errs.push('HTTP ' + r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const body = (await p.textContent('body') || '').replace(/\s+/g, ' ').slice(0, 500);
  console.log('BODY:', body);
  console.log('ERRS:', errs.length ? errs.join(' | ') : '0');
  await b.close();
})();
