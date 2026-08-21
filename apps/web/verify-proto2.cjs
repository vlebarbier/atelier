// Vérifie les 4 modes du détail + thème clair
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:4311/detail.html?mode=creer', { waitUntil: 'networkidle' });
  console.log('Stepper:', await page.locator('#proto-stepper .steps').count(), '| chat:', await page.locator('.chat-panel').isVisible());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-creer.png' });

  await page.goto('http://127.0.0.1:4311/detail.html?mode=reviser', { waitUntil: 'networkidle' });
  console.log('Slide:', await page.locator('.only-reviser .slide').count(), '| onglets:', await page.locator('.rtab').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-reviser.png' });

  await page.goto('http://127.0.0.1:4311/detail.html?mode=valider', { waitUntil: 'networkidle' });
  console.log('Valider -> boutons:', await page.locator('.only-valider .btn').count());

  await page.goto('http://127.0.0.1:4311/detail.html?mode=programmer', { waitUntil: 'networkidle' });
  console.log('Programmer -> creneaux:', await page.locator('.slot').count());

  await page.evaluate(() => localStorage.setItem('proto-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  console.log('Theme light:', (await page.evaluate(() => document.body.className)).includes('theme-light'));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-light.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
