// Rend la maquette v2 à jour (avec cards d'information) en doré
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1900 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///Users/victorlebarbier/Atelier/apercu-da-v2.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('.info-cards').screenshot({ path: '/Users/victorlebarbier/Atelier/v2-infocards.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
