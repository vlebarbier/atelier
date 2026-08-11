// Test fonctionnel F-44 : export HTML autonome + apercu PDF depuis la vue detail (dev local 5173)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Cliquer la premiere carte (grille ou liste)
  const card = page.locator('.card, .draft-row, .row, .line').first();
  console.log('CARD COUNT:', await page.locator('.card, .draft-row, .row, .line').count());
  await card.click();
  await page.waitForTimeout(1500);

  // Le bouton Exporter doit exister dans le header du detail
  const exportBtn = page.locator('.export-btn');
  console.log('EXPORT BTN VISIBLE:', await exportBtn.isVisible());
  await exportBtn.click();
  await page.waitForTimeout(400);

  // Le menu doit proposer HTML autonome + PDF
  const menuItems = await page.locator('.export-menu [role="menuitem"]').allInnerTexts();
  console.log('MENU ITEMS:', JSON.stringify(menuItems));

  // Test 1 : export HTML autonome -> telechargement .html
  const dlPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('.export-menu [role="menuitem"]').first().click();
  const dl = await dlPromise;
  const dlPath = '/tmp/f44-export-test.html';
  await dl.saveAs(dlPath);
  console.log('HTML DOWNLOAD:', dl.suggestedFilename(), '->', dlPath);

  // Verifier le contenu : slides en base64 + legendes + pas de reference /b/
  const { readFileSync } = require('fs');
  const html = readFileSync(dlPath, 'utf8');
  console.log('HTML SIZE:', html.length);
  console.log('HAS BASE64 IMG:', html.includes('data:image/png;base64'));
  console.log('HAS LEGENDES:', html.includes('Legendes'));
  console.log('HAS TITLE:', html.includes('<title>'));
  console.log('HAS /b/ URL (doit etre false ou minime):', html.includes('/b/'));

  // Test 2 : apercu PDF -> nouvelle page avec barre d impression
  await exportBtn.click();
  await page.waitForTimeout(300);
  const popupPromise = page.waitForEvent('popup', { timeout: 20000 });
  await page.locator('.export-menu [role="menuitem"]').nth(1).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await popup.waitForTimeout(1200);
  console.log('PDF POPUP TITLE:', await popup.title());
  console.log('POPUP HAS PRINT BAR:', await popup.locator('.barre-impression').count());
  console.log('POPUP SLIDES:', await popup.locator('.slide').count());
  console.log('POPUP HAS LEGENDES:', await popup.locator('.legendes').count());
  await popup.screenshot({ path: '/tmp/f44-export-preview.png' });

  console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 3) : 'aucune');
  await browser.close();
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
