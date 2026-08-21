// Capture l'ecran Publications (React reel) : grille dark, grille light, liste dark.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const base = 'http://localhost:4173/';

  const shots = [
    { name: 'pub-grille-dark', colorScheme: 'dark', view: 'grille' },
    { name: 'pub-grille-light', colorScheme: 'light', view: 'grille' },
    { name: 'pub-liste-dark', colorScheme: 'dark', view: 'liste' }
  ];

  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: s.colorScheme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    if (s.view === 'liste') {
      const btns = page.locator('.view-toggle button');
      await btns.nth(1).click();
      await page.waitForTimeout(500);
    }
    await page.hover('.card').catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/${s.name}.png` });
    console.log(`${s.name}: erreurs=${errors.length} ${errors.join(' | ').slice(0, 200)}`);
    await ctx.close();
  }
  await browser.close();
})();
