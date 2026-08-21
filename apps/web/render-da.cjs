// Rendu de l'apercu DA en PNG pour vérification visuelle
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 1700 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///Users/victorlebarbier/Atelier/apercu-da.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  // Section tokens
  await page.locator('.swatches').first().screenshot({ path: '/Users/victorlebarbier/Atelier/da-tokens.png' });
  // Mockup mode créer (le chat)
  const mockups = page.locator('.mockup');
  await mockups.nth(0).screenshot({ path: '/Users/victorlebarbier/Atelier/da-creer.png' });
  await mockups.nth(1).screenshot({ path: '/Users/victorlebarbier/Atelier/da-valider.png' });
  // Page entière
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-full.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
