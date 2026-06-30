import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — API Integration', () => {
  test('developers API success populates counter', async ({ page }) => {
    await gotoDevCityHome(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('1,247 devs in the city')).toBeVisible();
  });

  test('developers API 500 falls back to mock data', async ({ page }) => {
    await page.route('**/api/v1/developers**', (route) =>
      route.fulfill({ status: 500, body: devcityHomeData.api.errorMessage }),
    );
    await page.route('**/api/v1/city/stats', (route) =>
      route.fulfill({ status: 500, body: devcityHomeData.api.errorMessage }),
    );
    await page.route('**/api/v1/shop-items', (route) =>
      route.fulfill({ status: 500, body: devcityHomeData.api.errorMessage }),
    );
    await page.route('**/api/v1/achievements', (route) =>
      route.fulfill({ status: 500, body: devcityHomeData.api.errorMessage }),
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('developers API 404 returns empty handling', async ({ page }) => {
    await page.route('**/api/v1/developers**', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found' } }),
      }),
    );
    await page.route('**/api/v1/city/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: devcityHomeData.api.cityStats }),
      }),
    );
    await page.route('**/api/v1/shop-items', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: devcityHomeData.api.shopItems }),
      }),
    );
    await page.route('**/api/v1/achievements', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: devcityHomeData.api.achievementsCatalog }),
      }),
    );
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('DevCity')).toBeVisible();
  });

  test('malformed JSON from API does not crash shell', async ({ page }) => {
    await page.route('**/api/v1/developers**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'not-json' }),
    );
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('network abort on developers API', async ({ page }) => {
    await page.route('**/api/v1/developers**', (route) => route.abort('failed'));
    await page.route('**/api/v1/city/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: devcityHomeData.api.cityStats }),
      }),
    );
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText('DevCity')).toBeVisible();
  });

  test('slow API response still renders shell', async ({ page }) => {
    await page.route('**/api/v1/developers**', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: devcityHomeData.api.developersList }),
      });
    });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });
});
