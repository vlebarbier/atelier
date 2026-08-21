// Capture : page Charte graphique avec la section Ton et brand voice
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /Charte graphique/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/charte-ton.png' });
  // Vérifier le contenu du champ ton
  const voix = await page.locator('#ton-voix').inputValue().catch(() => '(champ absent)');
  const mots = await page.locator('#mots-eviter').inputValue().catch(() => '(champ absent)');
  console.log('Voix:', voix.slice(0, 60) + (voix.length > 60 ? '...' : ''));
  console.log('Mots à éviter:', mots);
  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
