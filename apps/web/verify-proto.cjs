// Vérifie le prototype navigable : index → publications → détail (modes) → thème
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:4311/index.html', { waitUntil: 'networkidle' });
  console.log('Index → sidebar:', await page.locator('#proto-shell .sidebar').count());
  console.log('Index → liens flow:', await page.locator('.step-flow').count());

  // Naviguer vers publications
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  console.log('Publications → cartes:', await page.locator('.pub').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-publications.png' });

  // Détail mode creer
  await page.goto('http://127.0.0.1:4311/detail.html?mode=creer', { waitUntil: 'networkidle' });
  console.log('Détail creer → stepper:', await page.locator('#proto-stepper .steps').count(), '| chat visible:', await page.locator('.only-creer').isVisible());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-creer.png' });

  // Détail mode reviser
  await page.goto('http://127.0.0.1:4311/detail.html?mode=reviser', { waitUntil: 'networkidle' });
  console.log('Détail reviser → slide:', await page.locator('.only-reviser .slide').count(), '| captions:', await page.locator('.rtab').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-reviser.png' });

  // Thème clair
  await page.evaluate(() => localStorage.setItem('proto-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  const theme = await page.evaluate(() => document.body.className);
  console.log('Thème clair appliqué:', theme.includes('theme-light'));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-light.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
