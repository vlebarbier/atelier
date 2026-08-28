// Rendu du mockup shadcn Atelier en PNG (dark par défaut, light via retrait de .dark)
// Usage : node render.cjs  → captures dans design/captures/
const { chromium } = require('playwright');
const path = require('path');

const HTML = path.resolve(__dirname, 'mockup-brouillons.html');
const OUT = path.resolve(__dirname, '../../captures');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto('file://' + HTML);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // Dark (classe .dark déjà posée sur <html>)
  await page.screenshot({ path: path.join(OUT, 'shadcn-brouillons-dark.png'), fullPage: true });

  // Light (on retire .dark → les variables :root prennent le relais)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, 'shadcn-brouillons-light.png'), fullPage: true });

  console.log('Captures écrites dans', OUT);
  await browser.close();
})();
