// Vérifie : un seul mode visible à la fois + slide centrée
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  for (const mode of ['creer', 'reviser', 'valider', 'programmer']) {
    await page.goto('http://127.0.0.1:4311/detail.html?mode=' + mode, { waitUntil: 'networkidle' });
    const info = await page.evaluate((m) => {
      const visible = [];
      document.querySelectorAll('.only-mode').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none') {
          visible.push(el.className.split(' ').filter((c) => c.startsWith('only-')).join(','));
        }
      });
      // centrage de la slide/stage
      const stage = document.querySelector('.only-' + m + '.stage');
      let delta = null;
      if (stage) {
        const sr = stage.getBoundingClientRect();
        const child = stage.firstElementChild;
        const cr = child.getBoundingClientRect();
        delta = Math.round((cr.left + cr.width / 2) - (sr.left + sr.width / 2));
      }
      return { visible, delta };
    }, mode);
    console.log(mode + ': visibles=[' + info.visible.join(' | ') + '] | delta centre=' + info.delta + 'px');
  }
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
