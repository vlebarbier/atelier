// Vérif : sidebar repliée -> survol -> dépliée (hover expand), footer figé, logo cliquable
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Replier via le bouton en haut
  await page.getByRole('button', { name: /Replier la barre laterale/i }).click();
  await page.waitForTimeout(800);
  const wCollapsed = await page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().width);
  console.log('Sidebar repliée → largeur:', Math.round(wCollapsed), 'px (attendu ~56)');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-collapsed.png' });

  // 2. Survoler la sidebar -> doit se déplier
  await page.locator('.sidebar').hover();
  await page.waitForTimeout(800);
  const wHover = await page.locator('.sidebar').evaluate((el) => el.getBoundingClientRect().width);
  console.log('Sidebar au survol → largeur:', Math.round(wHover), 'px (attendu ~220, hover expand)');
  const labelVisible = await page.getByText('Charte graphique').isVisible().catch(() => false);
  console.log('Labels visibles au survol:', labelVisible);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/sb-hover.png' });

  // 3. Footer figé : position du bouton Aide en bas
  const footerY = await page.locator('.nav-footer').evaluate((el) => {
    const r = el.getBoundingClientRect();
    return Math.round(window.innerHeight - r.bottom);
  });
  console.log('Footer distance du bas:', footerY, 'px (attendu petit = figé en bas)');

  // 4. Logo cliquable : aller sur Charte puis cliquer le logo -> retour Dashboard
  await page.getByRole('button', { name: 'Charte graphique' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /Retour au dashboard/i }).click();
  await page.waitForTimeout(800);
  const titre = await page.locator('header .crumb .sub').textContent().catch(() => '');
  console.log('Après clic logo → titre header:', titre.trim(), '(attendu Dashboard)');

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
