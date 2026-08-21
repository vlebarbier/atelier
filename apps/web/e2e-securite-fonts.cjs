// E2E LOCAL : bug SecurityError cssRules (fonts Google cross-origin) dans la
// regeneration des slides (t_95498523).
// 1) API locale SQLite (API_DB_PATH=/tmp, PAS de POSTGRES_URL -> jamais Neon)
// 2) web en preview (vite preview, proxy -> API locale)
// 3) brouillon jetable avec source HTML utilisant une police Google Fonts
// 4) clic "Regenerer les slides" -> la capture html-to-image ne doit PAS lever
//    SecurityError, les slides doivent etre remplacees, et le diff renvoye.
// 5) cleanup du brouillon jetable.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

const API = 'http://localhost:4399';
const WEB = 'http://localhost:4173';

// La source reference une police Google Fonts via <link> cross-origin (le cas
// du bug : le <link> global de index.html + un <link> dans le HTML source).
const HTML_SOURCE = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap" rel="stylesheet">
<style>
  .slide {
    width: 1080px; height: 1080px;
    background: #101010;
    display: flex; align-items: center; justify-content: center;
  }
  .slide h1 {
    font-family: 'Geist', sans-serif;
    color: #fff; font-size: 72px; text-align: center;
  }
</style>
</head>
<body>
  <div class="slide"><h1>Regen ok</h1></div>
</body>
</html>`;

(async () => {
  let brouillonId = null;
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  try {
    // 1. Creation du brouillon jetable (API locale)
    const crea = await fetch(`${API}/api/brouillons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: '(jetable) SecurityError fonts', type: 'carrousel' })
    });
    if (!crea.ok) throw new Error(`creation brouillon ${crea.status}`);
    brouillonId = (await crea.json()).id;
    console.log('Brouillon jetable:', brouillonId);

    // 2. Depot de la source HTML (avec <link> Google Fonts cross-origin)
    const dep = await fetch(`${API}/api/brouillon/${brouillonId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceHtml: HTML_SOURCE })
    });
    if (!dep.ok) throw new Error(`depot source ${dep.status}`);
    console.log('Source HTML deposee (avec link Google Fonts)');

    // 3. Navigateur : grille -> carte -> onglet Source -> Regenerer
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto(WEB, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500);

    const carte = page.locator('.card, .list-row', { hasText: 'SecurityError fonts' }).first();
    await carte.waitFor({ state: 'visible', timeout: 15000 });
    await carte.click();
    await page.waitForTimeout(2000);

    // Onglet Source
    await page.getByRole('button', { name: /Source/ }).first().click();
    await page.waitForTimeout(600);

    const btn = page.getByRole('button', { name: /R[ée]g[ée]n[ée]rer les slides/ });
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    await btn.click();

    // Attente du message de succes
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return /slides r[ée]g[ée]n[ée]r/.test(t) && !/Rendu en cours/.test(t);
    }, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const okMsg = /slides r[ée]g[ée]n[ée]r/.test(bodyText);
    console.log('Message de regeneration present:', okMsg);
    if (!okMsg) {
      // Affiche le message d'etat reel (ok/err) affiche dans l'UI
      const msg = await page.evaluate(() => {
        const el = document.querySelector('.source-msg, [class*="source"] [class*="msg"]');
        return el ? el.textContent : null;
      });
      console.log('Message UI capture:', msg);
    }

    // 3b. Deuxieme regeneration : cette fois il y a des slides existantes,
    // l'API snapshotte l'avant -> le diff doit etre produit (CTA diff visible).
    const btn2 = page.getByRole('button', { name: /R[ée]g[ée]n[ée]rer les slides/ });
    await btn2.click();
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return /slides r[ée]g[ée]n[ée]r/.test(t) && !/Rendu en cours/.test(t);
    }, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 4. Verification API : slides en base + diff renvoye (le CTA diff depend de diffData)
    const det = await fetch(`${API}/api/brouillon/${brouillonId}`).then((r) => r.json());
    const slides = det.slides || [];
    const diff = det.diff;
    console.log('Slides en base apres regeneration:', slides.length);
    console.log('diff present dans le brouillon:', diff ? 'OUI' : 'NON', diff ? `(avant ${diff.nbAvant} -> apres ${diff.nbApres})` : '');

    // 5. Erreurs console : aucune SecurityError / cssRules
    const securiteErr = errors.filter((e) => /SecurityError|cssRules|reading CSS rules/i.test(e));
    console.log('Erreurs console (total):', errors.length);
    console.log('Erreurs SecurityError/cssRules:', securiteErr.length, securiteErr.slice(0, 2));

    const ok = okMsg && slides.length > 0 && !!diff && securiteErr.length === 0;
    console.log(ok
      ? 'SUCCESS : regeneration OK, plus de SecurityError, diff produit (CTA diff visible)'
      : 'ECHEC : a verifier');
    process.exitCode = ok ? 0 : 1;
  } catch (err) {
    console.error('ERREUR E2E:', err.message);
    process.exitCode = 2;
  } finally {
    await browser.close();
    // 6. Cleanup : suppression du brouillon jetable
    if (brouillonId) {
      const del = await fetch(`${API}/api/brouillon/${brouillonId}`, { method: 'DELETE' });
      console.log('Cleanup brouillon jetable:', del.status);
    }
  }
})();
