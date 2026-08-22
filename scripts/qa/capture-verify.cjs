// Capture prod : vue detail refaite (chat agent + type select + programmation)
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('https://atelier-web-drab.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Ouvrir le brouillon
  await page.locator('.list-row, .card').first().click();
  await page.waitForTimeout(1000);

  // L'onglet Agent (chat) doit etre actif par defaut
  const chatVisible = await page.locator('.chat-input textarea').count();
  console.log('1. Chat agent visible (onglet par defaut):', chatVisible > 0 ? 'OK' : 'NON');

  // Envoyer un message chat
  await page.locator('.chat-input textarea').fill('Test : peux-tu raccourcir le texte de la slide 2 ?');
  await page.locator('.chat-input button').click();
  await page.waitForTimeout(800);
  const nbMsg = await page.locator('.chat-msg').count();
  console.log('2. Message envoye, messages affiches:', nbMsg);

  // Capture du chat
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-chat.png' });

  // Onglet Slides (reordonnancement)
  await page.getByRole('button', { name: /Slides/ }).click();
  await page.waitForTimeout(400);
  const slidesRows = await page.locator('.slide-row').count();
  console.log('3. Onglet Slides, lignes:', slidesRows);
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-slides.png' });

  // Modal programmation
  await page.getByRole('button', { name: /Programmer dans le calendrier/ }).click();
  await page.waitForTimeout(400);
  const modal = await page.locator('.modal').count();
  console.log('4. Modal programmation ouverte:', modal > 0 ? 'OK' : 'NON');
  await page.screenshot({ path: '/Users/victorlebarbier/Atelier/verify-planif.png' });
  await page.getByRole('button', { name: 'Annuler' }).first().click();

  // Statut dropdown
  await page.locator('.statut-btn').click();
  await page.waitForTimeout(300);
  const statutMenu = await page.locator('.statut-menu').count();
  console.log('5. Dropdown statut:', statutMenu > 0 ? 'OK' : 'NON');

  console.log('Erreurs console:', errors.length ? errors.join(' | ') : '0');
  await browser.close();
})();
