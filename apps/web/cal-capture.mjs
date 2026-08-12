/* Capture du calendrier enrichi (mois + semaine + liste A programmer) via Playwright.
   Usage : node cal-capture.cjs <outdir> */
import { chromium } from '/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright/index.mjs';

const out = process.argv[2] || '/tmp/cal-caps';
const fs = await import('node:fs');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// Aller sur Calendrier via la sidebar
await page.locator('.side-nav button', { hasText: 'Calendrier' }).first().click();
await page.waitForTimeout(1200);

// Vue mois
await page.screenshot({ path: `${out}/cal-mois.png` });

// Verifier l'etat : aujourd'hui mis en evidence, liste A programmer
const state = await page.evaluate(() => {
  const todayCell = document.querySelector('.calendar-cell.today');
  const todayNum = document.querySelector('.calendar-daynum.today-num');
  const sideTitle = document.querySelector('.calendar-side-title');
  const sideItems = [...document.querySelectorAll('.calendar-side-item')].map((el) => el.textContent.trim());
  const monthLabel = document.querySelector('.calendar-month-label')?.textContent?.trim();
  const gridItems = [...document.querySelectorAll('.calendar-cell.today .calendar-item')].map((el) => el.textContent.trim());
  return {
    monthLabel,
    hasTodayCell: !!todayCell,
    hasTodayNum: !!todayNum,
    sideTitle: sideTitle?.textContent?.trim(),
    sideItems,
    gridItemsOnToday: gridItems,
    toggleButtons: [...document.querySelectorAll('.view-toggle button')].map((b) => ({ text: b.textContent.trim(), on: b.classList.contains('on') }))
  };
});
console.log('ETAT MOIS:', JSON.stringify(state, null, 1));

// Fleche mois precedent
await page.locator('.calendar-toolbar button[title="Mois precedent"]').click();
await page.waitForTimeout(400);
const prevLabel = await page.locator('.calendar-month-label').textContent();
await page.screenshot({ path: `${out}/cal-mois-prev.png` });

// Retour aujourd'hui
await page.locator('.calendar-toolbar button', { hasText: "Aujourd'hui" }).click();
await page.waitForTimeout(400);
const backLabel = await page.locator('.calendar-month-label').textContent();

// Fleche mois suivant
await page.locator('.calendar-toolbar button[title="Mois suivant"]').click();
await page.waitForTimeout(400);
const nextLabel = await page.locator('.calendar-month-label').textContent();
// retour
await page.locator('.calendar-toolbar button[title="Mois precedent"]').click();
await page.waitForTimeout(400);

// Toggle vue semaine
await page.locator('.view-toggle button', { hasText: 'Semaine' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/cal-semaine.png` });
const weekState = await page.evaluate(() => {
  const weekCells = [...document.querySelectorAll('.calendar-week .calendar-cell')];
  const heads = weekCells.map((c) => c.querySelector('.calendar-week-head')?.textContent?.trim());
  const todayCol = weekCells.find((c) => c.classList.contains('today'));
  return {
    nColonnes: weekCells.length,
    tetes: heads,
    colonneAujourdhui: todayCol ? (todayCol.querySelector('.calendar-week-head')?.textContent?.trim()) : null,
    itemsSemaine: weekCells.map((c) => [...c.querySelectorAll('.calendar-item')].map((i) => i.textContent.trim()))
  };
});
console.log('ETAT SEMAINE:', JSON.stringify(weekState, null, 1));

// Drag & drop : glisser un item "A programmer" vers un jour (simule via dataTransfer)
// On verifie d'abord la presence des items lateraux
await page.locator('.view-toggle button', { hasText: 'Mois' }).click();
await page.waitForTimeout(400);
const sideNow = await page.evaluate(() => [...document.querySelectorAll('.calendar-side-item')].map((el) => el.textContent.trim()));
console.log('COTE MOIS:', JSON.stringify(sideNow));

console.log('ERREURS CONSOLE:', errors.length ? errors : 'aucune');
await browser.close();
