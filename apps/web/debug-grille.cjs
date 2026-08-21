// Compte les cartes dans la grille locale (debug e2e)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.waitForSelector('.draft-card, .card', { timeout: 15000 });
  const n = await p.locator('.draft-card, .card').count();
  console.log('Cartes grille locale:', n);
  const titres = await p.locator('.draft-card, .card').allTextContents();
  titres.slice(0, 8).forEach((t) => console.log(' -', t.replace(/\s+/g, ' ').slice(0, 60)));
  await b.close();
})();
