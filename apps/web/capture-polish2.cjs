// Capture : sidebar (ouverte + repliee) + header epure (sans Actualiser, sans breadcrumb Atelier/)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Vue liste + sidebar ouverte
  await page.locator('.view-toggle button').nth(1).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/polish-sidebar-open.png' });

  // Replier la sidebar
  await page.getByRole('button', { name: /Replier la barre/i }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/polish-sidebar-collapsed.png' });

  // Vérifier : plus de bouton Actualiser
  const refreshCount = await page.getByRole('button', { name: /Actualiser/i }).count();
  console.log('Bouton Actualiser:', refreshCount, '(OK si 0)');
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
