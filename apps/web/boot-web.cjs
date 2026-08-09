// Boot test du web Atelier (Phase 1) : charge la grille React, vérifie les données de l'API via proxy
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const title = await page.title();
  const cards = await page.locator('[class*="card"], [class*="Draft"]').count();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400));

  console.log('Titre :', title);
  console.log(`Éléments carte détectés : ${cards}`);
  console.log('Texte page (extrait) :', bodyText.replace(/\n+/g, ' | ').slice(0, 300));
  console.log('Erreurs console :', errors.length);
  if (errors.length) console.log('Détail:', errors.slice(0, 3));

  const ok = errors.length === 0 && bodyText.includes('Brouillons') && bodyText.length > 100;
  console.log(ok ? '✅ WEB ATELIER OK' : '❌ PROBLEME');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
