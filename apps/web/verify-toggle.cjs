// Vérifie : toggle grille/liste fonctionnel + badge-type en vue liste
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Grille par défaut
  console.log('Grille active:', await page.locator('.pubs:not(.vue-liste)').count() === 1);
  const badgeCoverVisible = await page.locator('.pub .cover .badge-type').first().isVisible();
  const badgeListeVisible = await page.locator('.badge-type-liste').first().isVisible();
  console.log('Grille → badge sur cover visible:', badgeCoverVisible, '| badge-liste caché:', !badgeListeVisible);

  // Basculer en liste
  await page.click('.view-toggle button:nth-child(2)');
  await page.waitForTimeout(400);
  const listeActive = await page.locator('.pubs.vue-liste').count() === 1;
  const badgeCoverCache = !(await page.locator('.pub .cover .badge-type').first().isVisible());
  const badgeListeOk = await page.locator('.badge-type-liste').first().isVisible();
  console.log('Vue liste active:', listeActive, '| badge cover caché:', badgeCoverCache, '| badge-liste visible:', badgeListeOk);
  console.log('Badges liste:', await page.locator('.badge-type-liste').allTextContents());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-liste2.png' });

  // Retour grille
  await page.click('.view-toggle button:nth-child(1)');
  await page.waitForTimeout(300);
  console.log('Retour grille OK:', await page.locator('.pubs:not(.vue-liste)').count() === 1);

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
