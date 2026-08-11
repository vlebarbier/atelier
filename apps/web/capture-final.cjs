// Vérification finale : le dashboard déployé affiche les vrais brouillons depuis l'API distante
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

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(3500);

  const bodyText = await page.evaluate(() => document.body.innerText);
  const cards = await page.locator('.card').count();
  const hasTitre = bodyText.includes('Carrousel, Pourquoi Bordeluche');
  const hasSlides = bodyText.includes('9 slides');
  const hasZero = bodyText.includes('0 brouillon');

  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/vercel-final-demo.png' });

  console.log('Cartes:', cards, '· titre carrousel:', hasTitre, '· 9 slides:', hasSlides, '· "0 brouillon":', hasZero);
  console.log('Erreurs console:', errors.length);
  if (errors.length) console.log('Détail:', errors.slice(0, 3));

  const ok = cards > 0 && hasTitre && hasSlides && !hasZero && errors.length === 0;
  console.log(ok ? '✅ DÉMO COMPLÈTE EN PRODUCTION' : '⚠️ À vérifier');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
