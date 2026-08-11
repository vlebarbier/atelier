// Audit visuel complet : grille + détail, dark + light
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const shots = [
    { name: 'grille-dark', scheme: 'dark', path: '/' },
    { name: 'grille-light', scheme: 'light', path: '/' },
    { name: 'detail-dark', scheme: 'dark', path: '/brouillon/carrousel-bordeluche-v7' },
    { name: 'detail-light', scheme: 'light', path: '/brouillon/carrousel-bordeluche-v7' }
  ];

  for (const s of shots) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: s.scheme });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`https://atelier-web-drab.vercel.app${s.path}`, { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/audit-${s.name}.png` });
    console.log(`${s.name}: ${errors.length} erreurs`);
    if (errors.length) console.log('  ', errors.slice(0, 2));
    await page.close();
  }
  await browser.close();
})();
