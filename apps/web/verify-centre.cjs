// Vérifie le centrage de la slide dans les modes réviser/valider/programmer
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  for (const mode of ['reviser', 'valider', 'programmer']) {
    await page.goto('http://127.0.0.1:4311/detail.html?mode=' + mode, { waitUntil: 'networkidle' });
    const pos = await page.evaluate(() => {
      const stage = document.querySelector('.stage');
      const slide = document.querySelector('.only-' + document.body.getAttribute('data-mode') + ' .slide, .stage .icard, .stage .slide');
      if (!stage || !slide) return { stage: null, slide: null };
      const sr = stage.getBoundingClientRect();
      const sl = slide.getBoundingClientRect();
      const stageCenter = sr.left + sr.width / 2;
      const slideCenter = sl.left + sl.width / 2;
      return {
        stageLeft: Math.round(sr.left), stageWidth: Math.round(sr.width),
        slideLeft: Math.round(sl.left), slideWidth: Math.round(sl.width),
        deltaFromCenter: Math.round(slideCenter - stageCenter)
      };
    });
    console.log(mode + ': delta centre = ' + pos.deltaFromCenter + 'px (0 = parfaitement centré)');
    await page.screenshot({ path: '/Users/victorlebarbier/Atelier/proto-centre-' + mode + '.png' });
  }
  console.log('Erreurs:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
