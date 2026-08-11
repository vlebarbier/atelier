// Capture bas de la vue détail (nav + vignettes)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(2000);
  await page.locator('.card').first().click();
  await page.waitForTimeout(2000);

  // Scroller jusqu'à la nav du slider
  await page.locator('.slider .nav').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/v2-detail-bas.png' });
  await browser.close();
})();
