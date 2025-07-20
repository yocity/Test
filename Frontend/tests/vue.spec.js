import { test, expect } from '@playwright/test';

test.describe('Gestionnaire de Tâches', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Affiche les stats de tâches', async ({ page }) => {
    await page.waitForSelector('.text-gray-500:has-text("Total")');
    
    await expect(page.locator('.text-gray-500:has-text("Total")')).toBeVisible();
    await expect(page.locator('.text-gray-500:has-text("Terminées")')).toBeVisible();
    await expect(page.locator('.text-gray-500:has-text("En cours")')).toBeVisible();
  });

  test('Créer une nouvelle tâche', async ({ page }) => {
    await page.getByRole('button', { name: 'Nouvelle tâche' }).click();

    await page.getByLabel('Titre').fill('Tâche Playwright');
    await page.getByLabel('Description').fill('Ceci est une tâche de test.');
    await page.getByLabel('Priorité').selectOption('haute');
    await page.getByLabel("Date d'échéance").fill('2025-12-31');

    await page.getByRole('button', { name: 'Créer' }).click();
  });

  test('Filtrer les tâches', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Rechercher...');
    await searchInput.fill('Playwright');
    await searchInput.press('Enter');
  });

  test('Supprimer la tâche', async ({ page }) => {
    await page.getByRole('button', { name: '🗑️' }).first().click();
    await page.getByRole('button', { name: 'Supprimer' }).click();

    // Optionnel : vérifier qu'elle a disparu
    await expect(page.getByText('Tâche Playwright')).not.toBeVisible();
  });
});
