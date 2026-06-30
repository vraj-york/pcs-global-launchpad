import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome, openShopModal } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — UI Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDevCityHome(page);
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Search developers' })).toBeVisible();
  });

  test('live developer counter is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText(/devs in the city/i)).toBeVisible();
  });

  test('Claim Your Building button is enabled', async ({ page }) => {
    const btn = page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel });
    await expect(btn).toBeEnabled();
  });

  test('controls HUD dismiss button is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('button', { name: 'Dismiss controls' })).toBeVisible();
  });

  test('camera mode toggle shows Orbit and Fly', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Orbit mode' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fly mode' })).toBeVisible();
  });

  test('shop modal opens with catalog items', async ({ page }) => {
    await openShopModal(page);
    await expect(page.getByText(devcityHomeData.api.shopItems[0].name)).toBeVisible();
    await expect(page.getByText(devcityHomeData.api.shopItems[1].name)).toBeVisible();
  });

  test('search shows results for valid term', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await expect(page.getByText(devcityHomeData.valid.displayName)).toBeVisible();
  });
});
