// Smoke test A1 : les 4 modes contextuels de la vue detail.
// Boot : API (SQLite temp) + vite preview, cree 4 brouillons de test (un par
// mode), verifie l'UI de chaque mode (onglets visibles, sections masquees,
// action primaire, empty state).
import { chromium } from 'playwright';

const API = 'http://localhost:4320';
const WEB = 'http://localhost:4250';

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const erreurs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(m.text());
  });
  page.on('pageerror', (e) => erreurs.push(String(e)));

  // 1. Brouillon vide -> mode CREER
  const r1 = await fetch(`${API}/api/brouillons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'TEST A1 - creer' })
  });
  const idCreer = (await r1.json()).id;

  // 2. Brouillon avec slides -> mode REVISER (creer puis depose une slide)
  const r2 = await fetch(`${API}/api/brouillons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'TEST A1 - reviser' })
  });
  const idReviser = (await r2.json()).id;
  // PNG 1x1 : suffit pour que modeDetail voie une slide et bascule en REVISER.
  const png1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  await fetch(`${API}/api/brouillon/${idReviser}/slides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides: [png1x1] })
  });

  // 3. Brouillon a-valider -> mode VALIDER
  const r3 = await fetch(`${API}/api/brouillons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'TEST A1 - valider' })
  });
  const idValider = (await r3.json()).id;
  await fetch(`${API}/api/brouillon/${idValider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut: 'a-valider' })
  });

  // 4. Brouillon valide -> mode PROGRAMMER
  const r4 = await fetch(`${API}/api/brouillons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titre: 'TEST A1 - programmer' })
  });
  const idProgrammer = (await r4.json()).id;
  await fetch(`${API}/api/brouillon/${idProgrammer}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut: 'valide' })
  });

  const ids = { idCreer, idReviser, idValider, idProgrammer };
  console.log('Brouillons crees:', JSON.stringify(ids));

  const resultats = [];

  // Helper : ouvre la vue detail d'un brouillon depuis la liste (par titre,
  // l'id n'est pas affiche). Vue grille (.card) ou liste dense (.list-row)
  // selon la preference de l'utilisateur, on couvre les deux.
  async function ouvrirDetail(titre) {
    await page.goto(`${WEB}/`);
    await page.waitForSelector('.list-row, .card', { timeout: 15000 });
    const row = page.locator(`.list-row:has-text("${titre}"), .card:has-text("${titre}")`).first();
    await row.waitFor({ state: 'visible', timeout: 15000 });
    await row.click();
    await page.waitForSelector('.detail-shell', { timeout: 15000 });
    await page.waitForTimeout(600);
  }

  // --- Mode CREER ---
  await ouvrirDetail("TEST A1 - creer");
  const modeCreer = await page.getAttribute('#detail', 'data-mode');
  const creerChecks = {
    mode: modeCreer,
    emptyStateVisible: await page.locator('.stage-empty-guide').isVisible().catch(() => false),
    ongletAgentVisible: await page.locator('.panel-tabs button:has-text("Agent")').isVisible().catch(() => false),
    ongletReseauxVisible: await page.locator('.panel-tabs button:has-text("Réseaux")').isVisible().catch(() => false),
    checklistMasquee: !(await page.locator('.sp-section:has-text("Checklist")').isVisible().catch(() => false)),
    planifMasquee: !(await page.locator('.planif-section').isVisible().catch(() => false))
  };
  resultats.push(['CREER', creerChecks]);
  await page.screenshot({ path: '/tmp/a1-creer.png' });

  // --- Mode REVISER ---
  await ouvrirDetail("TEST A1 - reviser");
  const modeReviser = await page.getAttribute('#detail', 'data-mode');
  const reviserChecks = {
    mode: modeReviser,
    ongletAgentVisible: await page.locator('.panel-tabs button:has-text("Agent")').isVisible().catch(() => false),
    ongletSlidesVisible: await page.locator('.panel-tabs button:has-text("Slides")').isVisible().catch(() => false),
    ongletReseauxVisible: await page.locator('.panel-tabs button:has-text("Réseaux")').isVisible().catch(() => false),
    checklistVisible: await page.locator('.sp-section:has-text("Checklist")').isVisible().catch(() => false),
    planifMasquee: !(await page.locator('.planif-section').isVisible().catch(() => false))
  };
  resultats.push(['REVISER', reviserChecks]);
  await page.screenshot({ path: '/tmp/a1-reviser.png' });

  // --- Mode VALIDER ---
  await ouvrirDetail("TEST A1 - valider");
  const modeValider = await page.getAttribute('#detail', 'data-mode');
  const validerChecks = {
    mode: modeValider,
    checklistVisible: await page.locator('.sp-section:has-text("Checklist")').isVisible().catch(() => false),
    // Le chat reste accessible (le cœur), les onglets d'edition sont masques.
    ongletAgentVisible: await page.locator('.panel-tabs button:has-text("Agent")').isVisible().catch(() => false),
    ongletReseauxMasque: !(await page.locator('.panel-tabs button:has-text("Réseaux")').isVisible().catch(() => false)),
    planifMasquee: !(await page.locator('.planif-section').isVisible().catch(() => false))
  };
  resultats.push(['VALIDER', validerChecks]);
  await page.screenshot({ path: '/tmp/a1-valider.png' });

  // --- Mode PROGRAMMER ---
  await ouvrirDetail("TEST A1 - programmer");
  const modeProgrammer = await page.getAttribute('#detail', 'data-mode');
  const programmerChecks = {
    mode: modeProgrammer,
    planifVisible: await page.locator('.planif-section').isVisible().catch(() => false),
    planifBoutonVisible: await page.locator('.planif-btn').isVisible().catch(() => false),
    checklistMasquee: !(await page.locator('.sp-section:has-text("Checklist")').isVisible().catch(() => false)),
    ongletReseauxVisible: await page.locator('.panel-tabs button:has-text("Réseaux")').isVisible().catch(() => false)
  };
  resultats.push(['PROGRAMMER', programmerChecks]);
  await page.screenshot({ path: '/tmp/a1-programmer.png' });

  // Nettoyage des brouillons de test
  for (const id of Object.values(ids)) {
    await fetch(`${API}/api/brouillon/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  console.log('\n=== RESULTATS ===');
  for (const [nom, checks] of resultats) {
    console.log(`\n[${nom}]`);
    for (const [k, v] of Object.entries(checks)) console.log(`  ${k}: ${v}`);
  }
  console.log('\nErreurs console:', erreurs.length === 0 ? 'aucune' : erreurs.join(' | '));
  await browser.close();

  // Verdict
  const ok =
    creerChecks.mode === 'creer' && creerChecks.emptyStateVisible && creerChecks.ongletAgentVisible &&
    creerChecks.checklistMasquee && creerChecks.planifMasquee &&
    reviserChecks.mode === 'reviser' && reviserChecks.ongletAgentVisible && reviserChecks.checklistVisible && reviserChecks.planifMasquee &&
    validerChecks.mode === 'valider' && validerChecks.checklistVisible && validerChecks.ongletAgentVisible && validerChecks.ongletReseauxMasque &&
    programmerChecks.mode === 'programmer' && programmerChecks.planifVisible && programmerChecks.planifBoutonVisible &&
    erreurs.length === 0;
  console.log('\nVERDICT:', ok ? 'OK' : 'ECHEC');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
