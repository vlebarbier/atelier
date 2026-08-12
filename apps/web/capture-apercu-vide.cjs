// Test etat vide : charte sans couleurs -> apercu degrade sans erreur
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  // Charte vide via API (DB de test /tmp)
  const vide = { id: 'principale', nom: 'Test vide', data: JSON.stringify({ couleurs: {}, polices: { titre: '', texte: '' }, rayons: {}, logos: [], ton: { voix: '' }, motsEviter: [] }) };
  await fetch('http://localhost:4320/api/charte', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: vide.nom, data: vide.data }) });

  await page.goto('http://localhost:5199/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.getByRole('button', { name: /Charte graphique/i }).first().click();
  await page.waitForTimeout(1500);

  const preview = await page.evaluate(() => {
    const slide = document.querySelector('.preview-slide');
    const selects = Array.from(document.querySelectorAll('.preview-role select')).map((s) => s.value);
    return { slidePresente: !!slide, roles: selects, fond: slide ? getComputedStyle(slide).backgroundColor : null };
  });
  console.log('ETAT VIDE:', JSON.stringify(preview));
  console.log('erreurs console:', errors.length ? errors.join(' | ') : '0');

  // Restaurer la charte Bordeluche (ne pas polluer)
  const bordeluche = { nom: 'Bordeluche', data: JSON.stringify({ couleurs: { bordeaux: '#422928', ivoire: '#F5F0E8', sauge: '#7A8B7A', perle: '#E8E2D8', gold: '#C9A227' }, polices: { titre: 'Cormorant Garamond', texte: 'Jost' }, rayons: { carte: '12px' }, logos: [], ton: { voix: 'Expert ami, pas agence. Direct, sans jargon IA.' }, motsEviter: [] }) };
  await fetch('http://localhost:4320/api/charte', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: bordeluche.nom, data: bordeluche.data }) });
  await browser.close();
  console.log('DONE');
})();
