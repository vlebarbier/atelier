// Debug F-29 v3 : inspecte le holder de capture pendant le rendu
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

const API = 'https://atelier-api-three.vercel.app';
const WEB = 'https://atelier-web-drab.vercel.app';

const HTML_SOURCE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  .slide { width: 1080px; height: 1080px; background: var(--bordeaux); display: flex; align-items: center; justify-content: center; }
  .slide h1 { font-family: var(--police-titre, sans-serif); color: #fff; font-size: 72px; }
</style></head><body><div class="slide"><h1>Test F-29</h1></div></body></html>`;

(async () => {
  let brouillonId = null;
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  try {
    const crea = await fetch(`${API}/api/brouillons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: '(jetable) F-29 debug3', type: 'carrousel' })
    });
    brouillonId = (await crea.json()).id;
    await fetch(`${API}/api/brouillon/${brouillonId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceHtml: HTML_SOURCE })
    });

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERR:', msg.text().slice(0, 120)); });
    page.on('pageerror', (err) => console.log('PAGE ERR:', String(err).slice(0, 120)));

    await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.locator('.card', { hasText: 'F-29 debug3' }).first().click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /Source/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /R[ée]g[ée]n[ée]rer les slides/ }).click();

    // Pendant le rendu (350ms + fonts), inspecte le holder
    await page.waitForTimeout(900);
    const info = await page.evaluate(() => {
      const holder = Array.from(document.querySelectorAll('div')).find(
        (d) => d.style && d.style.cssText.includes('-20000px')
      );
      if (!holder) return { holder: null };
      const slides = holder.querySelectorAll('.slide');
      const first = slides[0];
      const styles = Array.from(holder.querySelectorAll('style')).map((s) => s.textContent.slice(0, 180));
      const links = Array.from(holder.querySelectorAll('link')).map((l) => l.href);
      return {
        holderCss: holder.style.cssText,
        nSlides: slides.length,
        bgCalcule: first ? getComputedStyle(first).backgroundColor : null,
        fontCalculee: first ? getComputedStyle(first.querySelector('h1')).fontFamily : null,
        styles,
        links
      };
    });
    console.log('HOLDER:', JSON.stringify(info, null, 1));

    await page.waitForFunction(() => /slides r[ée]g[ée]n[ée]r/ .test(document.body.innerText), { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const det = await fetch(`${API}/api/brouillon/${brouillonId}`).then((r) => r.json());
    console.log('Slides:', (det.slides || []).length);
    await page.screenshot({ path: '/tmp/f29-debug3.png' });
  } catch (err) {
    console.error('ERR:', err.message);
  } finally {
    await browser.close();
    if (brouillonId) {
      const del = await fetch(`${API}/api/brouillon/${brouillonId}`, { method: 'DELETE' });
      console.log('Cleanup:', del.status);
    }
  }
})();
