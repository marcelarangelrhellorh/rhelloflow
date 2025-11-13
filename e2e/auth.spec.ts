import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1')).toContainText(/login|entrar/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=/erro|inválido/i')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // This is a placeholder - actual credentials would need to be in env variables
    await page.goto('/login');
    
    // Note: In real tests, use test credentials from environment variables
    // await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
    // await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
    // await page.click('button[type="submit"]');
    // await expect(page).toHaveURL(/dashboard|vagas/);
  });
});
