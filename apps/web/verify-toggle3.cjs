// Vérifie : toggle visible + carte liste compacte
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Toggle : les 2 boutons visibles ?
  const toggleBox = await page.evaluate(() => {
    const t = document.querySelector('.view-toggle');
    const btns = t.querySelectorAll('button');
    return btns.length + ' boutons | largeur totale: ' + Math.round(t.getBoundingClientRect().width);
  });
  console.log('Toggle:', toggleBox);

  // Vue liste
  await page.click('.view-toggle button:nth-child(2)');
  await page.waitForTimeout(400);
  const carte = await page.evaluate(() => {
    const pub = document.querySelector('.pubs.vue-liste .pub');
    const pr = pub.getBoundingClientRect();
    const badge = pub.querySelector('.badge-type-liste');
    const badgeVis = badge && getComputedStyle(badge).display !== 'none';
    // espace vide : titre à gauche, statut à droite — vérifie qu'ils ne sont pas trop éloignés
    const t = pub.querySelector('.col-titre').getBoundingClientRect();
    const s = pub.querySelector('.row').getBoundingClientRect();
    return {
      largeurCarte: Math.round(pr.width),
      badgeListeVisible: badgeVis,
      gapTitreStatut: Math.round(s.left - t.right)
    };
  });
  console.log('Carte liste:', JSON.stringify(carte));
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v4-pub-liste.png' });

  // Retour grille : badge sur cover
  await page.click('.view-toggle button:nth-child(1)');
  await page.waitForTimeout(300);
  console.log('Grille OK:', await page.locator('.pubs:not(.vue-liste)').count() === 1);
  console.log('Badge cover visible en grille:', await page.locator('.pub .cover .badge-type').first().isVisible());
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v4-pub-grille.png' });

  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
