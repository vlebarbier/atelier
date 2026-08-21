// Vérifie le layout complet : sidebar à gauche, topbar en haut à droite, filtres équilibrés
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const infos = await page.evaluate(() => {
    const shell = document.getElementById('proto-shell');
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');
    const filtres = document.querySelector('.filtres');
    const sr = sidebar.getBoundingClientRect();
    const tr = topbar.getBoundingClientRect();
    const fr = filtres.getBoundingClientRect();
    const toggle = document.querySelector('.view-toggle').getBoundingClientRect();
    const tri = document.querySelectorAll('.filtres .select-icone');
    const triR = tri[tri.length - 1].getBoundingClientRect();
    return {
      shellGrid: getComputedStyle(shell).display,
      sidebarAGauche: sr.left < 5 && sr.width > 150,
      topbarEnHaut: tr.top < 40,
      iconesTopbarADroite: tr.left > 1200,
      triADroite: triR.left > fr.width / 2,
      toggleADroite: toggle.left > fr.width / 2,
      largeurFiltres: Math.round(fr.width)
    };
  });
  console.log('Layout:', JSON.stringify(infos, null, 1));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v10-page-complete.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
