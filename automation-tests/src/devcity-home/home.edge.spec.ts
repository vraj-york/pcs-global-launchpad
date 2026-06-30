import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDevCityHome(page);
  });

  test('rapid search input changes do not break UI', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    for (let i = 0; i < 5; i++) {
      await search.fill(`sarah${i}`);
      await search.clear();
    }
    await search.fill(devcityHomeData.valid.searchTerm);
    await expect(page.getByText(devcityHomeData.valid.displayName)).toBeVisible();
  });

  test('XSS-like search string is shown safely', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.xssLikeSearch);
    await expect(page.getByText(/no buildings found/i)).toBeVisible();
  });

  test('very long search query is handled', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.longSearch);
    await expect(page.getByText(/no buildings found/i)).toBeVisible();
  });

  test('double-click claim button opens single dialog', async ({ page }) => {
    const btn = page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel });
    await btn.dblclick();
    await expect(page.getByRole('dialog')).toHaveCount(1);
  });

  test('switching camera modes rapidly', async ({ page }) => {
    const orbit = page.getByRole('button', { name: 'Orbit mode' });
    const fly = page.getByRole('button', { name: 'Fly mode' });
    await orbit.click();
    await fly.click();
    await orbit.click();
    await expect(orbit).toBeVisible();
  });

  test('navigate away and back preserves shell', async ({ page }) => {
    await page.goto('about:blank');
    await gotoDevCityHome(page);
    await expect(page.getByText('DevCity')).toBeVisible();
  });
});
