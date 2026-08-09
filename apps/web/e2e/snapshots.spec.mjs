// Visual regression Atelier : golden images de la grille (dark + light)
// Premier run : npx playwright test --update-snapshots (génère les golden)
// Ensuite : npx playwright test (compare, échoue si dérive DA)
import { test, expect } from 'playwright/test';

test('grille dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.waitForSelector('.draft-card, .card', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('grille-dark.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});

test('grille light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.waitForSelector('.draft-card, .card', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('grille-light.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});
