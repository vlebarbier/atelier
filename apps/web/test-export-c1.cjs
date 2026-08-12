// Test UX C1 : menu Exporter (PNG / HTML autonome / PDF) depuis la vue detail (dev 5173, API 4310 SQLite)
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

  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Cliquer la premiere carte (grille ou liste)
  const card = page.locator('.card, .draft-row, .row, .line').first();
  console.log('CARD COUNT:', await card.count());
  await card.click();
  await page.waitForTimeout(1500);

  // Le bouton Exporter doit exister dans le header du detail
  const exportBtn = page.locator('.export-btn');
  console.log('EXPORT BTN VISIBLE:', await exportBtn.isVisible());
  await exportBtn.click();
  await page.waitForTimeout(400);

  // Le menu doit proposer PNG + HTML autonome + PDF (ordre attendu)
  const menuItems = await page.locator('.export-menu [role="menuitem"]').allInnerTexts();
  console.log('MENU ITEMS:', JSON.stringify(menuItems));

  // Test 1 : export PNG -> telechargement .png (slide courante)
  const dlPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('.export-menu [role="menuitem"]').first().click();
  const dlPng = await dlPromise;
  const pngPath = '/tmp/c1-export-test.png';
  await dlPng.saveAs(pngPath);
  console.log('PNG DOWNLOAD:', dlPng.suggestedFilename());

  // Verifier que c'est un vrai PNG (signature + dimensions)
  const { readFileSync, statSync } = require('fs');
  const buf = readFileSync(pngPath);
  const isPng = buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  console.log('PNG SIGNATURE OK:', isPng, '| SIZE:', statSync(pngPath).size, 'bytes | DIMS:', w + 'x' + h);

  // Test 2 : apercu PDF -> nouvelle page avec barre d impression (2e entree du menu)
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

  // Test 3 : export HTML autonome -> telechargement .html (3e entree du menu)
  await exportBtn.click();
  await page.waitForTimeout(300);
  const dlPromise2 = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('.export-menu [role="menuitem"]').nth(2).click();
  const dlHtml = await dlPromise2;
  const htmlPath = '/tmp/c1-export-test.html';
  await dlHtml.saveAs(htmlPath);
  console.log('HTML DOWNLOAD:', dlHtml.suggestedFilename());
  const html = readFileSync(htmlPath, 'utf8');
  console.log('HTML SIZE:', html.length);
  console.log('HAS STYLE EMBARQUE:', html.includes('<style>'));
  console.log('HAS BASE64 IMG:', html.includes('data:image/png;base64'));
  console.log('HAS LEGENDES:', html.includes('Legendes'));
  console.log('HAS /b/ URL (doit etre false ou minime):', html.includes('/b/'));

  console.log('CONSOLE ERRORS:', errors.length ? errors.slice(0, 3) : 'aucune');
  await browser.close();

  const ok = menuItems.length === 3 &&
    menuItems[0].includes('PNG') && menuItems[1].includes('PDF') && menuItems[2].includes('HTML') &&
    isPng && w > 500 &&
    html.includes('<style>') && html.includes('data:image/png;base64') &&
    errors.length === 0;
  console.log(ok ? '✅ UX C1 EXPORT OK (PNG / HTML / PDF)' : '❌ PROBLEME');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
