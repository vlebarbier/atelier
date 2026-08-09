// Capture du dashboard Atelier déployé sur Vercel (production)
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

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  const hasVite = bodyText.includes('Brouillons') || bodyText.includes('Atelier');

  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/vercel-production-dark.png', fullPage: false });

  console.log('Titre :', title);
  console.log('Contenu :', bodyText.replace(/\n+/g, ' | ').slice(0, 220));
  console.log('Erreurs console :', errors.length);
  if (errors.length) console.log('Détail:', errors.slice(0, 3));

  // Mode clair
  const light = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await light.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await light.waitForTimeout(2000);
  await light.screenshot({ path: '/Users/victorlebarbier/Atelier/vercel-production-light.png' });
  await light.close();

  const ok = hasVite && errors.length === 0;
  console.log(ok ? '✅ VERCEL PRODUCTION OK' : '⚠️ Vérifier (peut être la page de login protection)');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
