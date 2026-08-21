// F-29 E2E : verifier que la charte (GET /api/charte) est injectee dans le rendu
// des slides cote client au moment de la capture, en PRODUCTION.
// 1) cree un brouillon jetable avec une source HTML utilisant var(--bordeaux)
// 2) ouvre le web prod, va sur le brouillon, lance "Regenerer les slides"
// 3) verifie que le PNG capture porte la couleur de la charte (bordeaux #422928)
// 4) supprime le brouillon jetable (cleanup systematique)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

const API = 'https://atelier-api-three.vercel.app';
const WEB = 'https://atelier-web-drab.vercel.app';
const COIN_BORDEAUX = [66, 41, 40]; // #422928

const HTML_SOURCE = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  .slide {
    width: 1080px; height: 1080px;
    background: var(--bordeaux);
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--rayon-carte, 12px);
  }
  .slide h1 {
    font-family: var(--police-titre, sans-serif);
    color: #fff; font-size: 72px; text-align: center;
  }
  .slide .texte {
    font-family: var(--police-texte, sans-serif);
    color: var(--ivoire, #eee); font-size: 36px; text-align: center;
  }
</style>
</head>
<body>
  <div class="slide"><div><h1>Test F-29</h1><div class="texte">charte injectee</div></div></div>
</body>
</html>`;

(async () => {
  let brouillonId = null;
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  try {
    // 1. Creation du brouillon jetable (API prod)
    const crea = await fetch(`${API}/api/brouillons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: '(jetable) F-29 charte', type: 'carrousel' })
    });
    if (!crea.ok) throw new Error(`creation brouillon ${crea.status}`);
    brouillonId = (await crea.json()).id;
    console.log('Brouillon jetable:', brouillonId);

    // 2. Depot de la source HTML (utilise les variables de la charte)
    const dep = await fetch(`${API}/api/brouillon/${brouillonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceHtml: HTML_SOURCE })
    });
    if (!dep.ok) throw new Error(`depot source ${dep.status}`);
    // Verifie que la source est bien en base avant de naviguer
    const detAvant = await fetch(`${API}/api/brouillon/${brouillonId}`).then((r) => r.json());
    if (!detAvant.sourceHtml || !detAvant.sourceHtml.includes('var(--bordeaux)')) {
      throw new Error('sourceHtml absent du brouillon apres depot');
    }
    console.log('Source HTML deposee (var(--bordeaux), var(--police-titre), var(--rayon-carte))');

    // 3. Navigateur : grille -> carte du brouillon -> onglet Source -> Regenerer
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);

    // Clic sur la carte du brouillon jetable (la plus recente, tri par id desc?)
    const carte = page.locator('.card', { hasText: 'F-29 charte' }).first();
    await carte.waitFor({ state: 'visible', timeout: 15000 });
    await carte.click();
    await page.waitForTimeout(2000);

    // Onglet Source
    await page.getByRole('button', { name: /Source/ }).click();
    await page.waitForTimeout(600);

    // Le textarea doit contenir la source ; on lance la regeneration
    const btn = page.getByRole('button', { name: /R[ée]g[ée]n[ée]rer les slides/ });
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    await btn.click();

    // Attente du message de succes (remplace le compteur)
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return /slides regener/ .test(t);
    }, { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1200);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const okMsg = /regener/.test(bodyText) && !/Rendu en cours/.test(bodyText);
    console.log('Message de regeneration present:', okMsg);
    const slideCount = await page.locator('.slide-thumb, .slide-row').count().catch(() => 0);

    // 4. Verification API : le brouillon a des slides apres regeneration
    const det = await fetch(`${API}/api/brouillon/${brouillonId}`).then((r) => r.json());
    const slides = det.slides || [];
    console.log('Slides en base apres regeneration:', slides.length);
    if (slides.length === 0) throw new Error('aucune slide apres regeneration');

    // 5. Verification pixel : charger le PNG dans un canvas, lire le coin
    const imgUrl = `${API}/b/${brouillonId}/${slides[0]}`;
    const page2 = await browser.newPage();
    await page2.goto(imgUrl, { waitUntil: 'load', timeout: 30000 });
    await page2.waitForTimeout(800);
    const pixel = await page2.evaluate(async () => {
      const img = document.querySelector('img');
      if (!img) return null;
      await img.decode().catch(() => {});
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      // coin haut-gauche + centre
      const d1 = ctx.getImageData(20, 20, 1, 1).data;
      const d2 = ctx.getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
      return {
        w: c.width, h: c.height,
        coin: [d1[0], d1[1], d1[2]],
        centre: [d2[0], d2[1], d2[2]]
      };
    });
    console.log('Pixel PNG:', JSON.stringify(pixel));

    const proche = (a, b) => Math.abs(a[0] - b[0]) <= 14 && Math.abs(a[1] - b[1]) <= 14 && Math.abs(a[2] - b[2]) <= 14;
    const coinBordeaux = pixel && proche(pixel.coin, COIN_BORDEAUX);
    const ok = okMsg && slides.length > 0 && !!coinBordeaux;
    console.log('Coin bordeaux (#422928):', coinBordeaux ? 'OUI' : 'NON', `(${pixel && pixel.coin})`);
    console.log('Erreurs console:', errors.length, errors.slice(0, 2));

    await page.screenshot({ path: '/tmp/f29-e2e.png' });
    console.log(ok
      ? 'SUCCESS : la charte est injectee dans le rendu des slides cote client (F-29)'
      : 'ECHEC : a verifier');
    process.exitCode = ok ? 0 : 1;
  } catch (err) {
    console.error('ERREUR E2E:', err.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
    // 6. Cleanup : suppression du brouillon jetable (jamais de pollution prod)
    if (brouillonId) {
      const del = await fetch(`${API}/api/brouillon/${brouillonId}`, { method: 'DELETE' });
      console.log('Cleanup brouillon jetable:', del.status);
    }
  }
})();
