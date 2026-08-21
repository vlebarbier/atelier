// Capture dark + light de la grille après polish
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  // Dark
  const dark = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await dark.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await dark.waitForTimeout(1200);
  await dark.screenshot({ path: '/Users/victorlebarbier/Atelier/polish-dark.png' });
  // Light
  const light = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await light.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await light.waitForTimeout(1200);
  await light.screenshot({ path: '/Users/victorlebarbier/Atelier/polish-light.png' });
  await browser.close();
  console.log('Captures polish faites');
})();
