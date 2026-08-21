// Capture de l'onglet Source du DraftDetail (le "réceptacle" : source HTML de l'agent)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('.card').first().click();
  await page.waitForTimeout(800);

  // Ouvrir l'onglet Source
  const toggle = page.locator('.source-toggle');
  console.log('Bouton Source présent :', await toggle.count());
  await toggle.click();
  await page.waitForTimeout(600);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasSource = bodyText.includes('Document HTML') || bodyText.includes('Aucune source HTML');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/web-source-onglet.png' });

  console.log('Contenu onglet Source :', hasSource ? 'OK' : 'ABSENT');
  console.log('Erreurs console :', errors.length);
  if (errors.length) console.log('Détail:', errors.slice(0, 3));

  const ok = (await toggle.count()) > 0 && hasSource && errors.length === 0;
  console.log(ok ? '✅ ONGLET SOURCE OK' : '❌ PROBLEME');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
