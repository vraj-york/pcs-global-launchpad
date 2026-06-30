import { test, expect } from '@playwright/test';
import { devcityHomeData } from '../../fixtures/mock-data/devcity-home.data';
import { gotoDevCityHome } from '../../helpers/devcity-home.helper';

test.describe('DevCity Home — Search Form', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDevCityHome(page);
  });

  test('valid search term shows matching developer', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await expect(page.getByText(`@${devcityHomeData.valid.developerUsername}`)).toBeVisible();
  });

  test('empty search shows no dropdown results', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.invalid.emptySearch);
    await expect(page.getByRole('listbox')).not.toBeVisible();
  });

  test('no-results message for unknown query', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.noResultsSearch);
    await expect(page.getByText(/no buildings found/i)).toBeVisible();
  });

  test('clear button resets search field', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(search).toHaveValue('');
  });

  test('whitespace-padded search still finds results', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.whitespaceSearch);
    await expect(page.getByText(devcityHomeData.valid.displayName)).toBeVisible();
  });

  test('single character search triggers results list', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.edge.singleCharSearch);
    await expect(page.getByRole('listbox')).toBeVisible();
  });

  test('Enter key does not break search input', async ({ page }) => {
    const search = page.getByRole('searchbox', { name: 'Search developers' });
    await search.fill(devcityHomeData.valid.searchTerm);
    await search.press('Enter');
    await expect(search).toHaveValue(devcityHomeData.valid.searchTerm);
  });
});
