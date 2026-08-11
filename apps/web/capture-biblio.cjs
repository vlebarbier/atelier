// Capture : page Bibliothèque (upload une vraie ressource d'abord, puis capture)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Bibliothèque/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/biblio-empty.png' });

  // Uploader un vrai fichier via l'input
  await page.locator('.dropzone input[type=file]').setInputFiles('/Users/victorlebarbier/Atelier/apps/web/capture-ton2.cjs');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/biblio-upload.png' });

  // Vérifier la présence d'une carte ressource
  const cards = await page.locator('.ressource-card').count();
  console.log('Cartes ressources:', cards);
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
