// Capture prod : page Documents + menu type avec documents
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Sidebar : Documents doit exister + Contenus
  const sidebar = await page.locator('.side-nav').innerText();
  console.log('1. Sidebar contient Documents:', sidebar.includes('Documents') ? 'OK' : 'NON');
  console.log('   Sidebar contient Contenus:', sidebar.includes('Contenus') ? 'OK' : 'NON');

  // 2. Aller sur Documents
  await page.getByRole('button', { name: /Documents/ }).click();
  await page.waitForTimeout(600);
  const titreDocs = await page.locator('.docs-titre').innerText().catch(() => '');
  console.log('2. Page Documents:', titreDocs ? 'OK - ' + titreDocs.trim() : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-docs.png' });

  // 3. Menu type dans un contenu : doit montrer les documents
  await page.getByRole('button', { name: /Contenus/ }).click();
  await page.waitForTimeout(600);
  await page.locator('.list-row, .card').first().click();
  await page.waitForTimeout(900);
  await page.locator('.type-btn').click();
  await page.waitForTimeout(400);
  const menu = await page.locator('.statut-menu').innerText();
  console.log('3. Menu type contient Pitch deck:', menu.includes('Pitch deck') ? 'OK' : 'NON');
  console.log('   Menu type contient Plaquette:', menu.includes('Plaquette') ? 'OK' : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-typemenu.png' });

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
