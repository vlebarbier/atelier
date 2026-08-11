// Vérification DA noire + fix images sur la preview Vercel
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });

  const results = [];
  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 40000 });
    await page.waitForTimeout(2500);

    // Images chargées ?
    const imgInfo = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      return imgs.map((i) => ({ src: (i.src || '').slice(0, 60), ok: i.complete && i.naturalWidth > 0 })).slice(0, 4);
    });

    // Couleur d'accent effective (bouton Actualiser)
    const accent = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Actualiser'));
      if (!btn) return 'introuvable';
      const cs = getComputedStyle(btn);
      return `${cs.backgroundColor} / ${cs.color}`;
    });

    results.push({ scheme, imgInfo, accent, errors });
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/preview-noir-${scheme}.png` });
    await page.close();
  }

  for (const r of results) {
    console.log(`\n== ${r.scheme} ==`);
    console.log('Images:', JSON.stringify(r.imgInfo));
    console.log('Accent bouton:', r.accent);
    console.log('Erreurs:', r.errors.length, r.errors.slice(0, 2));
  }
  await browser.close();
})();
