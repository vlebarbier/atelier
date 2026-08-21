// Vérifie : plus de doublon Nouveau en topbar
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const topbarBtns = await page.locator('#proto-shell .topbar a.btn, #proto-shell .topbar .btn').count();
  const pageBtns = await page.locator('.liste-head .btn.primary').count();
  console.log('Boutons en topbar (attendu 0):', topbarBtns);
  console.log('Bouton principal près du titre (attendu 1):', pageBtns);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-final.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
