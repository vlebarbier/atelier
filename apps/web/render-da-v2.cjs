// Rendu DA v2 en PNG
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///Users/victorlebarbier/Atelier/apercu-da-v2.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v2-creer.png', fullPage: true });
  await page.evaluate(() => {
    const v = document.getElementById('mock-valider');
    if (v) v.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v2-valider.png' });
  await browser.close();
  console.log('Erreurs:', errors.length);
})();
