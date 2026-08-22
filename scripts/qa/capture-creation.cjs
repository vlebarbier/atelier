// Capture : modale de creation (phrase libre + templates)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Ouvrir la modale de creation
  await page.getByRole('button', { name: /Nouveau/ }).first().click();
  await page.waitForTimeout(600);
  const modal = await page.locator('.creation-modal').count();
  console.log('1. Modale creation ouverte:', modal > 0 ? 'OK' : 'NON');
  const templates = await page.locator('.creation-template').count();
  console.log('2. Templates affiches:', templates, '(6 attendus)');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-creation.png' });

  // Choisir un template avec champ (carrousel temoignage)
  await page.locator('.creation-template').first().click();
  await page.waitForTimeout(400);
  const champSujet = await page.locator('#c-sujet').count();
  console.log('3. Champ sujet (template demandeChamp):', champSujet > 0 ? 'OK' : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-creation2.png' });

  // Fermer
  await page.locator('.modal-x').click();
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
