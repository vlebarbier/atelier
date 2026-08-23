// Persistance du filtre de statut (Contenus + Documents) : atelier.filtre.defaut.
// L'utilisateur qui choisit 'A valider' le retrouve apres rechargement de la page.
import { test, expect } from 'playwright/test';

test('filtre statut persiste apres reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.filtre-pills .pill', { timeout: 15_000 });

  // 1. Le filtre par defaut est 'tous' (la cle peut etre absente ou 'tous' apres mount).
  await expect(page.locator('.filtre-pills .pill', { hasText: 'Toutes' })).toHaveClass(/on/);

  // 2. Cliquer 'A valider' ecrit la preference (useEffect apres rendu).
  await page.locator('.filtre-pills .pill', { hasText: 'À valider' }).click();
  await expect(page.locator('.filtre-pills .pill', { hasText: 'À valider' })).toHaveClass(/on/);
  await page.waitForFunction(() => localStorage.getItem('atelier.filtre.defaut') === 'a-valider');

  // 3. Reload : le filtre est re-applique depuis localStorage.
  await page.reload();
  await page.waitForSelector('.filtre-pills .pill', { timeout: 15_000 });
  await expect(page.locator('.filtre-pills .pill', { hasText: 'À valider' })).toHaveClass(/on/);

  // 4. Une valeur invalide est ignoree (retour 'tous').
  await page.evaluate(() => localStorage.setItem('atelier.filtre.defaut', 'nimporte-quoi'));
  await page.reload();
  await page.waitForSelector('.filtre-pills .pill', { timeout: 15_000 });
  await expect(page.locator('.filtre-pills .pill', { hasText: 'Toutes' })).toHaveClass(/on/);
});
