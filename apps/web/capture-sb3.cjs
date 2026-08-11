// Test final sidebar : clic replier -> reste replie (hover intent), hover -> deplie, sortie -> replie
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Clic sur Replier, souris immobile -> doit RESTER replie
  await page.getByRole('button', { name: /Replier la barre/i }).click();
  await page.waitForTimeout(900);
  let cls = await page.locator('.sidebar').getAttribute('class');
  console.log('1. Après clic Replier (souris immobile):', cls.includes('collapsed') ? 'OK replie' : 'ECHEC: ' + cls);

  // Capture etat replie
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-final-collapsed.png' });

  // 2. Hover -> doit se deplier apres ~150ms
  await page.mouse.move(20, 400);
  await page.waitForTimeout(400);
  cls = await page.locator('.sidebar').getAttribute('class');
  console.log('2. Après hover:', !cls.includes('collapsed') ? 'OK deployee' : 'ECHEC: ' + cls);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-final-hover.png' });

  // 3. Sortie -> doit se replier apres ~250ms
  await page.mouse.move(900, 450);
  await page.waitForTimeout(600);
  cls = await page.locator('.sidebar').getAttribute('class');
  console.log('3. Après sortie:', cls.includes('collapsed') ? 'OK replie' : 'ECHEC: ' + cls);

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
