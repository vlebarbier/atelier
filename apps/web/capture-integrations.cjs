// Capture de la page Integrations (dark + light) pour verification visuelle.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const mode of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme: mode });
    // Theme local persiste entre les captures : l'effacer pour que le mode
    // emule par emulateMedia soit respecte (sinon light retombe sur dark).
    await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('atelier-theme'));
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    // Aller sur Integrations via la sidebar
    await page.getByRole('button', { name: /Intégrations|Integrations/ }).first().click();
    await page.waitForTimeout(2500); // laisser le ping + journal + statut se charger
    await page.screenshot({ path: `/tmp/integrations-${mode}.png`, fullPage: true });
  }
  console.log('captures ok, erreurs console:', errors.length ? errors : 'aucune');
  await browser.close();
})();
