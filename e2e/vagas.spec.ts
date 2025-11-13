import { test, expect } from '@playwright/test';

test.describe('Vagas Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to vagas page
    // Note: Authentication state should be set up in a beforeAll hook
    await page.goto('/vagas');
  });

  test('should display vagas list', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /vagas/i })).toBeVisible();
  });

  test('should open new vaga form', async ({ page }) => {
    const newButton = page.locator('button', { hasText: /nova vaga|criar/i }).first();
    if (await newButton.isVisible()) {
      await newButton.click();
      await expect(page.locator('text=/formulário|cadastro/i')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter vagas by status', async ({ page }) => {
    const filterButton = page.locator('select, button').filter({ hasText: /filtro|status/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Check if filter options appear
      await expect(page.locator('text=/ativa|pausada|concluída/i').first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('should navigate to vaga details', async ({ page }) => {
    // Click on first vaga card
    const firstVaga = page.locator('[data-testid="vaga-card"], .vaga-card').first();
    if (await firstVaga.isVisible()) {
      await firstVaga.click();
      // Should navigate to details page or open drawer
      await expect(page.locator('text=/detalhes|informações/i')).toBeVisible({ timeout: 3000 });
    }
  });
});
