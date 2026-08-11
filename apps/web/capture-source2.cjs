// Capture : zone Source active (textarea + boutons Déposer/Régénérer) en prod
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  // Ouvrir le premier brouillon
  await page.locator('.card').first().click();
  await page.waitForTimeout(1200);
  // Ouvrir l'onglet Source
  await page.getByRole('button', { name: /Source/i }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/source-zone.png' });

  // Vérifier la présence des éléments clés
  const textarea = await page.locator('textarea[aria-label="Source HTML du document"]').count();
  const btnDeposer = await page.getByRole('button', { name: /Déposer la source/i }).count();
  const btnRegenerer = await page.getByRole('button', { name: /Régénérer les slides/i }).count();
  console.log('Textarea:', textarea, '· Déposer:', btnDeposer, '· Régénérer:', btnRegenerer);
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
