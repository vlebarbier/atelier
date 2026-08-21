// Capture de l'écran Créer pour validation
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/detail.html?mode=creer', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v14-creer.png' });
  console.log('Capture OK | erreurs:', errors.length);
  await browser.close();
})();
