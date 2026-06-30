import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDevCityHome(page);
  });

  test('main navigation has accessible name', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('search input has accessible label', async ({ page }) => {
    await expect(page.getByRole('searchbox', { name: 'Search developers' })).toBeVisible();
  });

  test('claim button is keyboard focusable', async ({ page }) => {
    await page.keyboard.press('Tab');
    const claim = page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel });
    await claim.focus();
    await expect(claim).toBeFocused();
  });

  test('search clear button has accessible name', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
  });

  test('camera mode toggle has accessible label', async ({ page }) => {
    await expect(page.locator('[aria-label="Camera mode"]')).toBeVisible();
  });

  test('shop dialog traps focus when open', async ({ page }) => {
    await page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /building customization/i })).toBeVisible();
  });

  test('search results list exposes listbox role', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await expect(page.getByRole('listbox')).toBeVisible();
  });
});
