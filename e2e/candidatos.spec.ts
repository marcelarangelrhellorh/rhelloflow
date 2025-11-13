import { test, expect } from '@playwright/test';

test.describe('Candidatos Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/candidatos');
  });

  test('should display candidatos list', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /candidatos/i })).toBeVisible();
  });

  test('should search candidatos', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="buscar"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('João');
      await page.waitForTimeout(500); // Debounce
      // Results should update
      const results = page.locator('[data-testid="candidate-card"], .candidate-card');
      await expect(results.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter candidatos by status', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ hasText: /status|filtro/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      // Options should be visible
      await expect(page.locator('option, [role="option"]').first()).toBeVisible();
    }
  });

  test('should open candidato details', async ({ page }) => {
    const firstCandidate = page.locator('[data-testid="candidate-card"], .candidate-card, button[aria-label*="ver"]').first();
    if (await firstCandidate.isVisible()) {
      await firstCandidate.click();
      // Details drawer/page should open
      await expect(page.locator('text=/currículo|informações|detalhes/i')).toBeVisible({ timeout: 3000 });
    }
  });
});
