// Diagnostic : quelles règles CSS du 3e bloc s'appliquent réellement ?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file:///Users/victorlebarbier/Atelier/design/mockups/shadcn/mockup-brouillons.html');
  await p.waitForLoadState('networkidle');
  const info = await p.evaluate(() => {
    const probe = {};
    const dh = document.querySelector('.detail-header');
    if (dh) probe.detailHeaderHeight = getComputedStyle(dh).height;
    const st = document.querySelector('.stage');
    if (st) probe.stagePadding = getComputedStyle(st).padding;
    const sh = document.querySelector('.sheet');
    if (sh) { probe.sheetWidth = getComputedStyle(sh).width; probe.sheetBg = getComputedStyle(sh).backgroundColor; }
    // Compter les règles CSS parsées par feuille
    probe.sheets = [...document.styleSheets].map(s => {
      let n = 0; try { n = s.cssRules.length; } catch (e) { n = -1; }
      return { href: s.href, rules: n };
    });
    return probe;
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
