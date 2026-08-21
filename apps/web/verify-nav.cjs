// Vérifie : sidebar complète + navigation vers toutes les pages
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const pages = ['publications', 'documents', 'blog', 'calendrier', 'bibliotheque', 'charte', 'activite', 'integrations', 'parametres', 'aide'];
  for (const p of pages) {
    await page.goto('http://127.0.0.1:4311/' + p + '.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const nav = await page.evaluate(() => {
      const items = document.querySelectorAll('.sidebar .ms-item');
      return items.length + ' items nav | footer: ' + document.querySelectorAll('.sidebar-footer .ms-item').length;
    });
    console.log(p + ': ' + nav);
  }

  // Vérifie la navigation par clic depuis publications
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const allNav = await page.locator('.sidebar [data-nav]').count();
  console.log('Total éléments cliquables sidebar:', allNav);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v12-sidebar.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
