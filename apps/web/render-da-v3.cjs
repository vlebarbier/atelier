// Rendu DA v3 : 4 vues (dark/light x créer/programmer)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///Users/victorlebarbier/Atelier/apercu-da-v3.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Dark créer (defaut)
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v3-dark-creer.png' });

  // Light créer
  await page.click('#themeToggle button[data-t="light"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v3-light-creer.png' });

  // Dark programmer
  await page.click('#themeToggle button[data-t="dark"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelectorAll('h2')[3].scrollIntoView({ block: 'start' }); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v3-dark-programmer.png' });

  // Light programmer
  await page.click('#themeToggle button[data-t="light"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/da-v3-light-programmer.png' });

  await browser.close();
  console.log('Erreurs:', errors.length);
})();
