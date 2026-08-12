/* Capture Playwright de la page Activite IA (t_3738b86d) : stats du jour +
 * entrees cliquables + empty state. Dark + light, 0 erreur console requis. */
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');

const BASE = 'http://localhost:4179';
const OUT = '/tmp/activite-captures';

async function main() {
  const fs = require('node:fs');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) consoleErrors.push('HTTP ' + r.status() + ' ' + r.url()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Aller sur la page Activite IA via la sidebar.
  const nav = page.locator('.side-nav button', { hasText: 'Activité IA' });
  await nav.click();
  await page.waitForSelector('.activite-feed, .empty', { timeout: 15000 });
  await page.waitForTimeout(1200);

  // Preuve DOM : stats + entrees.
  const stats = await page.locator('.activite-stat-value').allTextContents();
  const statsLabels = await page.locator('.activite-stat-label').allTextContents();
  const items = await page.locator('.activite-item').count();
  const links = await page.locator('.activite-item.is-link').count();
  const chevrons = await page.locator('.activite-chevron').count();
  const cibles = await page.locator('.activite-cible').count();
  console.log('STATS:', JSON.stringify(statsLabels), JSON.stringify(stats));
  console.log('ITEMS:', items, 'LINKS:', links, 'CHEVRONS:', chevrons, 'CIBLES:', cibles);

  await page.screenshot({ path: `${OUT}/activite-dark.png`, fullPage: true });

  // Hover sur la premiere entree cliquable : le chevron doit passer a opacity 1.
  const firstLink = page.locator('.activite-item.is-link').first();
  await firstLink.hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/activite-dark-hover.png`, fullPage: true });

  // Click : doit ouvrir le brouillon concerne (DraftDetail).
  await firstLink.click();
  await page.waitForSelector('.dhead, .detail, .stage, .draft-panel', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const url = page.url();
  const detailVisible = await page.locator('.dhead, .detail, .stage, .panel-tabs, .chat-feed, .agent-panel').first().isVisible().catch(() => false);
  console.log('AFTER CLICK url:', url, 'detailVisible:', detailVisible);
  await page.screenshot({ path: `${OUT}/activite-dark-detail.png`, fullPage: true });

  // Retour + light mode.
  await page.locator('.side-nav button', { hasText: 'Activité IA' }).click();
  await page.waitForSelector('.activite-feed', { timeout: 10000 });
  await page.waitForTimeout(800);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/activite-light.png`, fullPage: true });

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
  await browser.close();
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
