// Test prod : la régénération des slides fonctionne sans SecurityError
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('.card, .list-row').first().click();
  await page.waitForTimeout(2500);

  // Onglet Source
  const srcTab = page.getByRole('button', { name: /Source/ });
  if (await srcTab.count()) { await srcTab.first().click(); await page.waitForTimeout(400); }
  const regen = page.locator('button:has-text("Régénérer"), button:has-text("Regenerer"), button:has-text("régénérer")');
  console.log('Bouton régénérer:', await regen.count());
  if (await regen.count()) {
    await regen.first().click();
    await page.waitForTimeout(4000);
  }
  const secErr = errors.filter((e) => e.includes('SecurityError') || e.includes('cssRules'));
  console.log('Erreurs SecurityError après régénération:', secErr.length);
  console.log('Erreurs totales:', errors.length);
  await browser.close();
})();
