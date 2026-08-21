// Rendu prototype global : 3 étapes (panneau droit contextuel)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file:///Users/victorlebarbier/Atelier/apercu-global.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/global-creer.png' });
  await page.click('.step[data-s="reviser"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/global-reviser.png' });
  await page.click('.step[data-s="programmer"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/global-programmer.png' });
  // light créer
  await page.click('#themeToggle button[data-t="light"]');
  await page.click('.step[data-s="creer"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/global-light-creer.png' });
  await browser.close();
  console.log('Erreurs:', errors.length);
})();
