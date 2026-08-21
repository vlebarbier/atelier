// Vérifie : icônes réseaux + Validée en bleu
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:4311/publications.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const svgInNets = await page.locator('.net svg').count();
  const igText = await page.locator('.net-ig').first().textContent();
  const valideColor = await page.evaluate(() => {
    const el = document.querySelector('.st-valide');
    return getComputedStyle(el).color;
  });
  console.log('SVG dans badges réseaux (attendu 9):', svgInNets);
  console.log('Badge Instagram contient icône + nom:', igText.includes('Instagram'));
  console.log('Couleur Validée (attendu bleu rgb(74,143,212)):', valideColor);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-pub-icon.png' });
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
