// Capture page Charte (éditeur + import) en prod
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  // Clic sur Charte graphique dans la sidebar
  await page.getByRole('button', { name: /Charte graphique/i }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/charte-page.png' });

  // Test l'import : coller un CSS de test et cliquer Traiter
  await page.fill('textarea[aria-label="CSS de la charte a importer"]',
    ':root { --accent: #123456; --font-display: "Fraunces", serif; --radius-btn: 8px; }');
  await page.getByRole('button', { name: /Traiter le CSS/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/charte-import-result.png' });

  const stats = await page.textContent('.brand-import-stats').catch(() => 'aucune');
  console.log('Stats import UI:', stats.trim());
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
