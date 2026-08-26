// Visual regression Atelier : golden images de la grille (dark + light)
// Premier run : npx playwright test --update-snapshots (genere les golden)
// Ensuite : npx playwright test (compare, echoue si derive DA)
// Selecteurs : data-testid (brouillon-card) - les classes CSS changent avec shadcn.
import { test, expect } from 'playwright/test';

test('grille dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByTestId('brouillon-card').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('grille-dark.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});

test('grille light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByTestId('brouillon-card').first().waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot('grille-light.png', {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});
