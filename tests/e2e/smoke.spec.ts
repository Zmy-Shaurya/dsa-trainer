import { expect, test } from '@playwright/test';

test('shell loads and language toggle persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'C++' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'C++' })).toHaveAttribute('aria-pressed', 'true');
});
