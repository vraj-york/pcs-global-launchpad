import { expect, type Page } from '@playwright/test';
import { devcityHomeData } from '../fixtures/mock-data/devcity-home.data';

export async function mockDevCityApis(page: Page): Promise<void> {
  const { api } = devcityHomeData;

  await page.route('**/api/v1/developers**', async (route) => {
    const url = route.request().url();
    if (url.match(/\/developers\/[^/?]+/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: api.developerDetail }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: api.developersList }),
    });
  });

  await page.route('**/api/v1/city/stats', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: api.cityStats }),
    }),
  );

  await page.route('**/api/v1/shop-items', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: api.shopItems }),
    }),
  );

  await page.route('**/api/v1/achievements', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: api.achievementsCatalog }),
    }),
  );
}

export async function gotoDevCityHome(page: Page): Promise<void> {
  await mockDevCityApis(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

export async function openShopModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
