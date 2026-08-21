// Vérifie : filtres compacts une ligne + toggle aligné
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const infos = await page.evaluate(() => {
    const selects = document.querySelectorAll('.filtres .select-icone');
    const toggle = document.querySelector('.view-toggle');
    const f = document.querySelector('.filtres');
    const fr = f.getBoundingClientRect();
    const tr = toggle.getBoundingClientRect();
    return {
      nbSelects: selects.length,
      toggleSurMemeLigne: Math.abs(tr.top - selects[0].getBoundingClientRect().top) < 5,
      hauteurBarre: Math.round(fr.height),
      toggleDroit: tr.right > fr.width - 60
    };
  });
  console.log('Filtres:', JSON.stringify(infos));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v8-pub-filtres.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
