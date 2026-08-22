// Capture : checklist de validation dans la vue détail (prod)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('.card').first().click();
  await page.waitForTimeout(1200);

  // Initialiser la checklist si vide
  const initBtn = page.getByRole('button', { name: /Initialiser la checklist/i });
  if (await initBtn.count()) {
    await initBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/checklist.png' });

  // Cocher un item et vérifier la persistance
  await page.locator('.checklist-item').first().click();
  await page.waitForTimeout(800);
  const progress = await page.textContent('.checklist-progress').catch(() => 'aucun');
  console.log('Progression:', progress.trim());
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
