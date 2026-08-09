// Boot test Phase 2 : grille → détail → retour → liste → ⌘K → Escape → Calendrier
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // 1. Grille
  const cards = await page.locator('.draft-card, .card').count();

  // 2. Clic sur une carte → détail
  await page.locator('.draft-card, .card').first().click();
  await page.waitForTimeout(800);
  const detailVisible = await page.locator('.dhead, .slider').count();
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasReseaux = bodyText.includes('LÉGENDES') || bodyText.includes('Instagram');
  const hasNotes = bodyText.includes('NOTES') || bodyText.includes('Notes');

  // 3. Retour grille
  const backBtn = page.locator('.back button, button:has-text("Retour")').first();
  if (await backBtn.count()) { await backBtn.click(); await page.waitForTimeout(600); }
  const backOk = await page.locator('.draft-card, .card').count() > 0;

  // 4. Vue liste
  await page.locator('.view-toggle button:has-text("Liste")').click();
  await page.waitForTimeout(500);
  const rows = await page.locator('.list-row').count();

  // 5. ⌘K palette
  await page.keyboard.press('Meta+K');
  await page.waitForTimeout(400);
  const paletteOpen = await page.locator('.cmdk-overlay.open, .cmdk-panel:visible').count();
  const paletteInput = await page.locator('.cmdk-input-wrap input:visible').count();

  // 6. Escape ferme
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const paletteAfterEsc = await page.locator('.cmdk-overlay.open:visible, .cmdk-panel:visible').count();

  // 7. Calendrier via sidebar
  await page.locator('nav button:has-text("Calendrier"), aside button:has-text("Calendrier"), button:has-text("Calendrier")').first().click();
  await page.waitForTimeout(500);
  const bodyAfterCal = await page.evaluate(() => document.body.innerText.slice(0, 150));

  console.log('Cartes grille :', cards);
  console.log('Détail visible :', detailVisible, '· légendes :', hasReseaux, '· notes :', hasNotes);
  console.log('Retour grille :', backOk);
  console.log('Lignes liste :', rows);
  console.log('Palette ⌘K ouverte :', paletteOpen, '· input :', paletteInput);
  console.log('Palette fermée après Escape :', paletteAfterEsc === 0);
  console.log('Page Calendrier :', bodyAfterCal.replace(/\n+/g, ' | ').slice(0, 100));
  console.log('Erreurs console :', errors.length);
  if (errors.length) console.log('Détail:', errors.slice(0, 3));

  const ok = cards > 0 && detailVisible > 0 && hasReseaux && backOk && rows > 0 &&
             paletteOpen > 0 && paletteAfterEsc === 0 && errors.length === 0;
  console.log(ok ? '✅ PHASE 2 NAVIGATEUR OK' : '❌ PROBLEME');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
