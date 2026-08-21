// Capture les statuts distincts (Validee BLEUE / Publiee VERTE) en grille dark + liste dark.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const base = 'http://localhost:4173/';

  // grille dark (statuts couleurs)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/pub-statuts-dark.png' });
  console.log('grille-dark statuts erreurs=' + errors.length);

  // liste dark
  await page.locator('.view-toggle button').nth(1).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/pub-liste-dark.png' });
  console.log('liste-dark erreurs=' + errors.length);
  await ctx.close();
  await browser.close();
})();
