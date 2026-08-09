// Captures du web Atelier Phase 1 — dark + light
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const dark = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  await dark.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await dark.waitForTimeout(1200);
  await dark.screenshot({ path: '/Users/victorlebarbier/Atelier/web-phase1-dark.png' });
  await dark.close();

  const light = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await light.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await light.waitForTimeout(1200);
  await light.screenshot({ path: '/Users/victorlebarbier/Atelier/web-phase1-light.png' });
  await light.close();

  await browser.close();
  console.log('Captures OK');
})();
