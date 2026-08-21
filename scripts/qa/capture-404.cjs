// Debug : capturer les URLs exactes des requêtes 404
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('.card').first().click();
  await page.waitForTimeout(1500);

  console.log('Réponses 4xx/5xx:');
  failed.forEach((f) => console.log(' ', f));
  console.log(failed.length === 0 ? '  (aucune)' : '');
  await browser.close();
})();
