import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

const mobileViewports = [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
] as const;

for (const viewport of mobileViewports) {
  test.describe(`DevCity Home — Mobile ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('navbar and CTA visible', async ({ page }) => {
      await gotoDevCityHome(page);
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }),
      ).toBeVisible();
    });

    test('mobile search bar is accessible', async ({ page }) => {
      await gotoDevCityHome(page);
      const search = page.getByRole('searchbox', { name: 'Search developers' });
      await expect(search).toBeVisible();
      await search.fill(devcityHomeData.valid.searchTerm);
      await expect(page.getByText(devcityHomeData.valid.displayName)).toBeVisible();
    });

    test('shop modal fits viewport', async ({ page }) => {
      await gotoDevCityHome(page);
      await page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width);
      }
    });
  });
}
