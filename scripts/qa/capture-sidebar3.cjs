// Vérif propre : état initial déployé -> Replier -> 56px -> hover -> déplié -> sortie -> replié
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  const W = () => page.locator('.sidebar').evaluate((el) => Math.round(el.getBoundingClientRect().width));

  // Réinitialiser l'état persistant
  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('atelier.sidebar.collapsed'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  console.log('État initial (déployé attendu):', await W(), 'px');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb1-deploye.png' });

  // Replier
  await page.getByRole('button', { name: /Replier la barre laterale/i }).click();
  await page.waitForTimeout(800);
  console.log('Après clic Replier:', await W(), 'px (attendu ~56)');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb2-replie.png' });

  // Hover -> déplie
  await page.locator('.sidebar').hover();
  await page.waitForTimeout(800);
  console.log('Au survol:', await W(), 'px (attendu ~220, hover expand)');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb3-hover.png' });

  // Sortie -> replie
  await page.mouse.move(800, 450);
  await page.waitForTimeout(800);
  console.log('Après sortie souris:', await W(), 'px (attendu ~56)');

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
