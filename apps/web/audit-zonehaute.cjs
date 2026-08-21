// Capture haute résolution de la zone haute (topbar + titre + filtres)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const header = page.locator('.topbar');
  const box = await header.boundingBox();
  if (box) {
    await page.screenshot({ path: '/Users/victorlebarbier/Atelier/audit-zonehaute.png', clip: { x: 0, y: 0, width: 1440, height: 420 } });
  }
  console.log('Capture zone haute OK');
  await browser.close();
})();
