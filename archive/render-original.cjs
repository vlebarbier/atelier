// Rendu de carrousel Bordeluche — slides 1080×1080 (@2x = 2160×2160)
// Usage : node render.cjs [fichier-source.html] [dossier-sortie]
//   défauts : carrousel-v4.html → ./slides
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const source = process.argv[2] || 'carrousel-v4.html';
  const outArg = process.argv[3] || 'slides';
  const outDir = path.resolve(__dirname, outArg);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  const fileUrl = 'file://' + path.resolve(__dirname, source);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const slideCount = await page.locator('.slide').count();
  console.log(`Slides trouvées : ${slideCount}`);

  for (let i = 0; i < slideCount; i++) {
    const slide = page.locator('.slide').nth(i);
    await slide.scrollIntoViewIfNeeded();
    const name = `slide-${String(i + 1).padStart(2, '0')}.png`;
    await slide.screenshot({ path: path.join(outDir, name) });
    console.log(`✓ ${name}`);
  }

  await browser.close();
  console.log('Terminé.');
})();
