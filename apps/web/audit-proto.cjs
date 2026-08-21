// Capture toutes les pages du prototype pour audit UX
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const screens = [
    ['publications', 'http://127.0.0.1:4311/publications.html'],
    ['detail-creer', 'http://127.0.0.1:4311/detail.html?mode=creer'],
    ['detail-reviser', 'http://127.0.0.1:4311/detail.html?mode=reviser'],
    ['detail-valider', 'http://127.0.0.1:4311/detail.html?mode=valider'],
    ['detail-programmer', 'http://127.0.0.1:4311/detail.html?mode=programmer'],
    ['calendrier', 'http://127.0.0.1:4311/calendrier.html'],
    ['documents', 'http://127.0.0.1:4311/documents.html'],
    ['bibliotheque', 'http://127.0.0.1:4311/bibliotheque.html'],
    ['charte', 'http://127.0.0.1:4311/charte.html']
  ];

  for (const [name, url] of screens) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/Users/victorlebarbier/Atelier/audit-' + name + '.png' });
  }
  console.log('9 captures OK');
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
