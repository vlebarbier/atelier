// Verifie les 4 modes contextuels A1 (SPEC-TUNNEL + UX-RESEARCH §4-5) sur le web local :
// stepper wsIndex, suggestions S0/S1/S2, data-mode, masquage des onglets en mode creer.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

const API = 'http://127.0.0.1:4320';
const WEB = 'http://localhost:4173';
// PNG 1x1 gris, assez pour une slide.
const DATAURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, ...j };
}

(async () => {
  // 1. Creer un brouillon jetable
  const cree = await api('/api/brouillons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'A1-test-modes', type: 'carrousel' })
  });
  const id = cree.brouillon?.id || cree.id;
  if (!id) { console.log('ECHEC creation', JSON.stringify(cree).slice(0, 200)); process.exit(1); }
  console.log('Brouillon test:', id);

  // 2. Deposer 1 slide (sinon le stage reste vide)
  await api('/api/brouillon/' + id + '/slides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: [DATAURL] })
  });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  async function capture(nom, checks) {
    await page.goto(WEB + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.draft-card, .card', { timeout: 15000 });
    // Ouvrir le brouillon test
    const cards = page.locator('.draft-card, .card');
    const n = await cards.count();
    let ouvert = false;
    for (let i = 0; i < n; i++) {
      const txt = await cards.nth(i).textContent().catch(() => '');
      if (txt.includes('A1-test-modes')) { await cards.nth(i).click(); ouvert = true; break; }
    }
    if (!ouvert) { console.log(nom, ': brouillon introuvable'); return; }
    await page.waitForSelector('#detail', { timeout: 10000 });
    await page.waitForTimeout(1200);
    const dataMode = await page.getAttribute('#detail', 'data-mode');
    const stepper = await page.locator('.tunnel-steps').textContent().catch(() => '');
    const sugg = await page.locator('.suggestion-band').count();
    const suggTxt = sugg ? (await page.locator('.suggestion-band').textContent().catch(() => '')) : '';
    const onglets = await page.locator('.panel-tabs button').allTextContents().catch(() => []);
    const ok = checks(dataMode, stepper, sugg, suggTxt);
    console.log(`[${nom}] data-mode=${dataMode} | stepper="${stepper.trim()}" | suggestion=${sugg}${suggTxt ? ' "' + suggTxt.trim().slice(0, 60) + '"' : ''} | onglets=[${onglets.join(',')}]`);
    await page.screenshot({ path: `/Users/victorlebarbier/Atelier/a1-${nom}.png` });
    if (!ok) console.log(`  >>> ECHEC attendus: ${JSON.stringify(checks.toString().slice(0, 120))}`);
    return dataMode;
  }

  // Mode REVISER : statut brouillon + 1 slide -> ws=1, pas de suggestion (checklist vide)
  await capture('reviser', (mode, step) => mode === 'reviser' && step.includes('Réviser'));
  // S1 : initialiser la checklist et tout cocher
  await page.goto(WEB + '/', { waitUntil: 'networkidle' });
  await page.locator('.draft-card, .card').filter({ hasText: 'A1-test-modes' }).first().click();
  await page.waitForSelector('#detail', { timeout: 10000 });
  await page.waitForTimeout(800);
  const initBtn = page.getByRole('button', { name: /Initialiser la checklist/i });
  if (await initBtn.count()) { await initBtn.click(); await page.waitForTimeout(500); }
  const items = page.locator('.checklist-item input');
  const ni = await items.count();
  for (let i = 0; i < ni; i++) { await items.nth(i).click(); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  const suggS1 = await page.locator('.suggestion-band').count();
  const modeS1 = await page.getAttribute('#detail', 'data-mode');
  const stepS1 = (await page.locator('.tunnel-steps').textContent() || '').trim();
  console.log(`[S1] data-mode=${modeS1} | suggestion=${suggS1} (attendu 1) | stepper="${stepS1}"`);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-s1.png' });

  // Passer a-valider -> mode VALIDER
  const s1btn = page.locator('.suggestion-cta');
  if (await s1btn.count()) { await s1btn.click(); await page.waitForTimeout(1000); }
  const modeV = await page.getAttribute('#detail', 'data-mode');
  const stepV = (await page.locator('.tunnel-steps').textContent() || '').trim();
  console.log(`[valider] data-mode=${modeV} (attendu valider) | stepper="${stepV}" | suggestion=${await page.locator('.suggestion-band').count()} (attendu 0)`);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-valider.png' });

  // Passer valide -> ws=2 (pas encore de programme) : mode valider + S2
  await page.locator('.statut-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.statut-menu button').filter({ hasText: /^Valide$/ }).first().click();
  await page.waitForTimeout(1000);
  const modeV2 = await page.getAttribute('#detail', 'data-mode');
  const stepV2 = (await page.locator('.tunnel-steps').textContent() || '').trim();
  const suggV2 = await page.locator('.suggestion-band').count();
  const suggV2Txt = suggV2 ? (await page.locator('.suggestion-band').textContent() || '').trim().slice(0, 60) : '';
  console.log(`[valide-sans-programme] data-mode=${modeV2} (attendu valider) | stepper="${stepV2}" | suggestion=${suggV2} (attendu 1 S2) "${suggV2Txt}"`);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-valide-s2.png' });

  // Poser un programme via API -> ws=3 : mode PROGRAMMER
  await api('/api/brouillon/' + id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programme: JSON.stringify({ date: '2026-08-20', heure: '18:00', reseau: 'instagram' }) })
  });
  await page.goto(WEB + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.draft-card, .card', { timeout: 15000 });
  await page.locator('.draft-card, .card').filter({ hasText: 'A1-test-modes' }).first().click();
  await page.waitForSelector('#detail', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const modeP = await page.getAttribute('#detail', 'data-mode');
  const stepP = (await page.locator('.tunnel-steps').textContent() || '').trim();
  const suggP = await page.locator('.suggestion-band').count();
  const planifFait = await page.locator('.planif-fait').count();
  console.log(`[programmer] data-mode=${modeP} (attendu programmer) | stepper="${stepP}" | suggestion=${suggP} (attendu 0) | planif-fait=${planifFait} (attendu 1)`);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-programmer.png' });

  // Mode CREER : brouillon vide (nouveau brouillon sans slide)
  const cree2 = await api('/api/brouillons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'A1-test-vide', type: 'carrousel' })
  });
  const id2 = cree2.brouillon?.id || cree2.id;
  await page.goto(WEB + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.draft-card, .card', { timeout: 15000 });
  await page.locator('.draft-card, .card').filter({ hasText: 'A1-test-vide' }).first().click();
  await page.waitForSelector('#detail', { timeout: 10000 });
  await page.waitForTimeout(1000);
  const modeC = await page.getAttribute('#detail', 'data-mode');
  const stepC = (await page.locator('.tunnel-steps').textContent() || '').trim();
  const suggC = await page.locator('.suggestion-band').count();
  const ongletsC = await page.locator('.panel-tabs button').allTextContents().catch(() => []);
  console.log(`[creer] data-mode=${modeC} (attendu creer) | stepper="${stepC}" | suggestion=${suggC} (attendu 1 S0) | onglets=[${ongletsC.join(',')}] (sans Annotations/Slides)`);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/a1-creer.png' });

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();

  // Nettoyage : supprimer les brouillons de test
  for (const tid of [id, id2]) {
    await api('/api/brouillon/' + tid, { method: 'DELETE' });
  }
  console.log('Brouillons test supprimes.');
})();
