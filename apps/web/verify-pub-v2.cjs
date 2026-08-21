// Vérifie l'écran Publications v2 : badges, statuts, filtres, vues, accent unifié
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  console.log('Badges type:', await page.locator('.badge-type').allTextContents());
  console.log('Bouton Nouveau près du titre:', await page.locator('.liste-head .btn.primary').count());
  console.log('Select type (volet déroulant):', await page.locator('.filtre-type .select').count());
  console.log('Tri:', await page.locator('.liste-tools .select').count(), '| toggle vue:', await page.locator('.view-toggle button').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-dark.png' });

  // Vue liste
  await page.click('.view-toggle button:nth-child(2)');
  await page.waitForTimeout(300);
  console.log('Vue liste active:', await page.locator('.pubs.vue-liste').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-liste.png' });

  // Mode clair : accent doit être le MÊME doré
  await page.evaluate(() => localStorage.setItem('proto-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim());
  console.log('Accent light:', accent, '(doit être #E8C97A)');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-light.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
