// Capture écran Publications (app réelle) : dark grille, dark liste, light grille
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));

  await page.goto('http://localhost:4178/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Grille dark
  console.log('badges type:', await page.locator('.badge-type').allTextContents());
  console.log('badges réseau:', await page.locator('.net').allTextContents());
  console.log('pills statut:', await page.locator('.filtre-pills .pill').allTextContents());
  console.log('select type:', await page.locator('.filtre-type .select').count());
  console.log('select tri:', await page.locator('.liste-tools .select').count());
  console.log('toggle vue boutons:', await page.locator('.view-toggle button').count());
  console.log('bouton Nouvelle publication:', await page.locator('.page-actions button.primary').count());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/pub-verif-dark-grille.png' });

  // Liste
  await page.click('.view-toggle button:nth-child(2)');
  await page.waitForTimeout(400);
  console.log('liste rows:', await page.locator('.list-row').count());
  console.log('badge-type-liste:', await page.locator('.badge-type-liste').allTextContents());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/pub-verif-dark-liste.png' });

  // Hover sur première carte → actions
  await page.hover('.card');
  await page.waitForTimeout(200);
  console.log('mini actions visibles:', await page.locator('.card .pub-actions .mini').count());

  // Light
  await page.evaluate(() => localStorage.setItem('atelier-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/pub-verif-light-grille.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
