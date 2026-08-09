// Capture web Atelier avec icônes Phosphor — grille dark + light + détail
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const dark = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await dark.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await dark.waitForTimeout(1200);
  await dark.screenshot({ path: '/Users/victorlebarbier/Atelier/web-icones-dark.png' });
  await dark.locator('.card').first().click();
  await dark.waitForTimeout(800);
  await dark.screenshot({ path: '/Users/victorlebarbier/Atelier/web-icones-detail.png' });
  await dark.close();

  const light = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await light.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await light.waitForTimeout(1200);
  await light.screenshot({ path: '/Users/victorlebarbier/Atelier/web-icones-light.png' });
  await light.close();

  await browser.close();
  console.log('Captures icônes OK');
})();
