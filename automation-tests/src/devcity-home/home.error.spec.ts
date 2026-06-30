import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — Error States', () => {
  test('shop modal shows sign-in message without selected developer', async ({ page }) => {
    await gotoDevCityHome(page);
    await page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }).click();
    await expect(page.getByText(/sign in to claim your building/i)).toBeVisible();
  });

  test('search no-results state displays query text', async ({ page }) => {
    await gotoDevCityHome(page);
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.noResultsSearch);
    await expect(
      page.getByText(new RegExp(devcityHomeData.edge.noResultsSearch, 'i')),
    ).toBeVisible();
  });

  test('API failure still allows navigation chrome', async ({ page }) => {
    await page.route('**/api/v1/**', (route) =>
      route.fulfill({ status: 503, body: 'Service Unavailable' }),
    );
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel })).toBeVisible();
  });

  test('dismissed HUD stays hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'Dismiss controls' }).click();
    await expect(page.getByText('Controls')).not.toBeVisible();
  });
});
