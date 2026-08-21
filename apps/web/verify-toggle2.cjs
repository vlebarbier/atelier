// Vérifie : toggle segment avec libellés + vue liste en colonnes
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Toggle : 2 boutons avec libellés
  const btns = await page.locator('.view-toggle button').allTextContents();
  console.log('Boutons toggle:', JSON.stringify(btns));
  console.log('Grille active au départ:', await page.locator('.view-toggle button.on').textContent());

  // Vue liste
  await page.click('.view-toggle button:nth-child(2)');
  await page.waitForTimeout(400);
  console.log('Vue liste active:', await page.locator('.pubs.vue-liste').count() === 1);
  const activeText = (await page.locator('.view-toggle button.on').textContent()).trim();
  console.log('Bouton actif = Liste:', activeText.includes('Liste'));
  const rowLayout = await page.evaluate(() => {
    const pub = document.querySelector('.pubs.vue-liste .pub');
    const body = pub.querySelector('.body');
    const br = body.getBoundingClientRect();
    const row = pub.querySelector('.row').getBoundingClientRect();
    const t = pub.querySelector('.col-titre').getBoundingClientRect();
    // en ligne : même hauteur approximative
    return { bodyH: Math.round(br.height), rowTop: Math.round(row.top), titleTop: Math.round(t.top) };
  });
  console.log('Carte liste — hauteur body:', rowLayout.bodyH, '| titre et statut alignés:', Math.abs(rowLayout.rowTop - rowLayout.titleTop) < 30);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v3-pub-liste.png' });

  // Retour grille
  await page.click('.view-toggle button:nth-child(1)');
  await page.waitForTimeout(300);
  console.log('Retour grille OK:', await page.locator('.pubs:not(.vue-liste)').count() === 1);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v3-pub-grille.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
