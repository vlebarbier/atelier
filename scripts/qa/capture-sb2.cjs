// Capture : sidebar repliee + hover (deplie temporairement) + logo -> dashboard
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Replier (bouton en haut)
  await page.getByRole('button', { name: /Replier la barre/i }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-collapsed2.png' });

  // Hover sur la sidebar -> deplie temporairement
  await page.locator('.sidebar').hover();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-hover.png' });

  // Sortir la souris -> se replie
  await page.mouse.move(800, 450);
  await page.waitForTimeout(600);
  const cls = await page.locator('.sidebar').getAttribute('class');
  console.log('Après sortie souris, classe:', cls, '(OK si collapsed)');

  // Logo -> dashboard : naviguer ailleurs puis cliquer le logo
  await page.getByRole('button', { name: /Charte graphique/i }).click();
  await page.waitForTimeout(600);
  await page.locator('.brand-home').click();
  await page.waitForTimeout(600);
  const crumb = await page.locator('header .crumb').textContent();
  console.log('Après clic logo →', crumb.trim(), '(OK si Dashboard)');

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
