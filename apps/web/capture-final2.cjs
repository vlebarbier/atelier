// Capture finale : vue détail dark (checklist + source) après polish
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.locator('.card').first().click();
  await page.waitForTimeout(1300);
  // Ouvrir la source
  await page.getByRole('button', { name: /Source/i }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/final-detail-dark.png' });
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
