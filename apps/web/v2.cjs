// Capture grille + détail via navigation SPA (clic sur la carte)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-grille.png' });

  // Cliquer sur la carte pour ouvrir le détail
  await page.locator('.card').first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-detail.png' });

  console.log('Erreurs:', errors.length);
  if (errors.length) console.log(errors.slice(0, 3));
  await browser.close();
})();
