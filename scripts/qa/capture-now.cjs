// Capture fraîche : grille + détail (état actuel pour audit)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/audit-grille-now.png' });
  await page.locator('.card').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/audit-detail-now.png' });
  await browser.close();
  console.log('Captures faites');
})();
