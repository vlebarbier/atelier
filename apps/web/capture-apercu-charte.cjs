// Capture page Charte : apercu en contexte (local), dark + light + test live update
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const base = 'http://localhost:5199';

  for (const scheme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, colorScheme: scheme });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 40000 });
    await page.getByRole('button', { name: /Charte graphique/i }).first().click();
    await page.waitForTimeout(2200); // chargement charte + polices Google Fonts
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/apercu-charte-${scheme}-1.png` });

    // Lecture des valeurs du preview AVANT modification
    const avant = await page.evaluate(() => {
      const slide = document.querySelector('.preview-slide');
      const cta = document.querySelector('.preview-slide-cta');
      const selects = Array.from(document.querySelectorAll('.preview-role select')).map((s) => s.value);
      return {
        slideBg: slide ? getComputedStyle(slide).backgroundColor : null,
        ctaBg: cta ? getComputedStyle(cta).backgroundColor : null,
        roles: selects,
        selectCount: selects.length
      };
    });
    console.log(`[${scheme}] AVANT:`, JSON.stringify(avant));

    // Test live : modifier le token "bordeaux" et verifier que le fond du preview change
    const bordeauxInput = page.locator('.charte-color-value').filter({ has: page.locator('xpath=ancestor::div[contains(@class,"charte-color-row")][1]') }).first();
    // plus simple : trouver l'input par la valeur actuelle #422928
    await page.locator('input.charte-color-value[value="#422928"]').fill('#FF0000');
    await page.waitForTimeout(400);
    const apres = await page.evaluate(() => {
      const slide = document.querySelector('.preview-slide');
      return slide ? getComputedStyle(slide).backgroundColor : null;
    });
    console.log(`[${scheme}] APRES changement bordeaux->#FF0000, fond preview:`, apres);

    // Changement de role manuel : accent -> gold
    await page.locator('.preview-role select').nth(2).selectOption('gold');
    await page.waitForTimeout(300);
    const ctaApres = await page.evaluate(() => {
      const cta = document.querySelector('.preview-slide-cta');
      return cta ? getComputedStyle(cta).backgroundColor : null;
    });
    console.log(`[${scheme}] APRES accent=gold, CTA bg:`, ctaApres);
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/apercu-charte-${scheme}-2.png` });

    // Restaurer la valeur bordeaux d'origine (ne pas polluer la charte locale de test)
    await page.locator('input.charte-color-value[value="#FF0000"]').fill('#422928');
    await page.waitForTimeout(300);

    console.log(`[${scheme}] erreurs console:`, errors.length ? errors.join(' | ') : '0');
    await page.close();
  }
  await browser.close();
  console.log('DONE');
})();
