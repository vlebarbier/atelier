// Vérifie : sidebar avec icônes Phosphor + collapse + navigation
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const infos = await page.evaluate(() => {
    const svgs = document.querySelectorAll('.sidebar .ms-ico svg');
    return {
      nbIconesSidebar: svgs.length,
      itemsNav: document.querySelectorAll('.sidebar [data-nav]').length
    };
  });
  console.log('Sidebar:', JSON.stringify(infos));

  // Collapse : icônes restent, textes cachés
  await page.click('#proto-collapse-btn');
  await page.waitForTimeout(400);
  const collapsed = await page.evaluate(() => {
    const shell = document.getElementById('proto-shell');
    const txtVisible = getComputedStyle(document.querySelector('.ms-txt')).display;
    const icoVisible = getComputedStyle(document.querySelector('.ms-ico')).display;
    return { collapsed: shell.classList.contains('collapsed'), txtCache: txtVisible === 'none', icoVisible: icoVisible !== 'none' };
  });
  console.log('Collapse:', JSON.stringify(collapsed));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v13-collapsed.png' });

  await page.click('#proto-collapse-btn');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v13-page.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
