// Capture scrolled : section Ton et brand voice
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Charte graphique/i }).click();
  await page.waitForTimeout(1500);
  await page.locator('#ton-voix').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/charte-ton2.png' });
  await browser.close();
  console.log('OK');
})();
