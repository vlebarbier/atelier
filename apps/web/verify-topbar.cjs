// Vérifie : logo + replier sidebar + topbar épurée + icônes Phosphor
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const infos = await page.evaluate(() => {
    const logo = document.querySelector('.sidebar-logo');
    const collapseBtn = document.getElementById('proto-collapse-btn');
    const themeBtn = document.getElementById('proto-theme-btn');
    const topbarBtns = document.querySelectorAll('.topbar .icon-btn');
    return {
      logoPresent: !!logo && logo.textContent.includes('Atelier'),
      collapsePresent: !!collapseBtn,
      themeSvg: !!themeBtn && !!themeBtn.querySelector('svg'),
      nbBoutonsTopbar: topbarBtns.length,
      boutonsTopbar: Array.from(topbarBtns).map(b => b.title)
    };
  });
  console.log('Topbar:', JSON.stringify(infos, null, 1));

  // Test collapse
  await page.click('#proto-collapse-btn');
  await page.waitForTimeout(400);
  const collapsed = await page.evaluate(() => document.getElementById('proto-shell').classList.contains('collapsed'));
  console.log('Collapse fonctionne:', collapsed);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v11-collapsed.png' });

  // Re-déplie + capture complète
  await page.click('#proto-collapse-btn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v11-page.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
