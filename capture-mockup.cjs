// Capture du mockup de refonte (2 écrans : liste dense + brouillon héros)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file:///Users/victorlebarbier/Atelier/mockup-refonte.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Pleine page (les 2 écrans)
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/mockup-1-liste.png', clip: { x: 0, y: 0, width: 1440, height: 640 } });
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/mockup-2-detail.png', clip: { x: 0, y: 640, width: 1440, height: 700 } });
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
