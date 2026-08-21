// Vérifie que les 4 modes du détail s'affichent depuis l'URL (?mode=)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  const modes = [
    ['creer', '.chat-panel', 1],
    ['reviser', '.only-reviser .slide', 1],
    ['valider', '.only-valider .icard', 1],
    ['programmer', '.only-programmer .slot', 3]
  ];
  for (const [mode, sel, expected] of modes) {
    await page.goto('http://127.0.0.1:4311/detail.html?mode=' + mode, { waitUntil: 'networkidle' });
    const n = await page.locator(sel).count();
    const step = await page.locator('#proto-stepper .steps').count();
    console.log(mode + ': ' + sel + '=' + n + ' (attendu ' + expected + ') | stepper=' + step);
    await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-mode-' + mode + '.png' });
  }
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
