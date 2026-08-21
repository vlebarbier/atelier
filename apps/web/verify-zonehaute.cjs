// Vérifie la nouvelle zone haute : topbar épurée + header badges + filtres restructurés
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const infos = await page.evaluate(() => {
    const topbar = document.querySelector('.topbar');
    const tb = topbar ? topbar.textContent.trim() : '';
    const searchLocal = document.querySelector('.search-local');
    const badges = document.querySelectorAll('.badge-count span');
    const selects = document.querySelectorAll('.filtres .select-icone');
    const toggle = document.querySelector('.view-toggle');
    const f = document.querySelector('.filtres');
    const fr = f.getBoundingClientRect();
    const tr = toggle.getBoundingClientRect();
    const tri = selects[selects.length - 1].getBoundingClientRect();
    const statut = selects[0].getBoundingClientRect();
    return {
      topbarContenu: tb.slice(0, 60),
      plusDeCrumb: !tb.includes('Publications'),
      badges: Array.from(badges).map(b => b.textContent),
      rechercheLocale: !!searchLocal,
      toggleADroite: tr.left > fr.width / 2,
      triPresDuToggle: Math.abs(tri.right - tr.left) < 20,
      statutsAGauche: statut.left < fr.width / 2
    };
  });
  console.log('Zone haute:', JSON.stringify(infos, null, 1));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v9-zonehaute.png', clip: { x: 0, y: 0, width: 1440, height: 420 } });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
