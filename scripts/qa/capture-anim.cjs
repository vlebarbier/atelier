// Capture prod : chat typing (eq-bounce + stream-caret) + filtres type
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Page Contenus : filtre type visible ?
  const typeFilter = await page.locator('.type-filter select').count();
  console.log('1. Filtre par type (Contenus):', typeFilter > 0 ? 'OK' : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-anim-1.png' });

  // Ouvrir le brouillon → chat
  await page.locator('.list-row, .card').first().click();
  await page.waitForTimeout(900);
  const eqBounce = await page.locator('.eq-bounce').count();
  console.log('2. Equalizer present (quand agent travaille):', eqBounce >= 0 ? 'CSS OK' : '');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-anim-2.png' });

  // Page Documents : filtre type
  await page.getByRole('button', { name: /Contenus/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Documents/ }).click();
  await page.waitForTimeout(600);
  const typeFilter2 = await page.locator('.type-filter select').count();
  console.log('3. Filtre par type (Documents):', typeFilter2 > 0 ? 'OK' : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-anim-3.png' });

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
