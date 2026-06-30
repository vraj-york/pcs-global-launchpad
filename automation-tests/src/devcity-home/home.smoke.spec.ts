import { test, expect } from '@playwright/test';
import { DEVCITY_PAGE_TITLE, devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDevCityHome(page);
  });

  test('page loads without critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('WebGL')) errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('page has correct document title', async ({ page }) => {
    await expect(page).toHaveTitle(DEVCITY_PAGE_TITLE);
  });

  test('main navigation is visible', async ({ page }) => {
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  });

  test('DevCity brand is visible', async ({ page }) => {
    await expect(page.getByText('DevCity')).toBeVisible();
  });

  test('page renders within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(Date.now() - start).toBeLessThan(5000);
  });

  test('claim building CTA is visible', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: devcityHomeData.valid.claimButtonLabel }),
    ).toBeVisible();
  });
});
