import { expect, test } from '@playwright/test';

test('a locked concept opens and can be unlocked anyway', async ({ page }) => {
  await page.goto('/#/tree');
  await page.getByRole('link', { name: /^Sliding Window, Locked/ }).click();
  await expect(page.getByRole('heading', { name: 'Sliding Window' })).toBeVisible();
  await expect(page.getByText('Recommended first:')).toBeVisible();
  await page.getByRole('button', { name: 'Unlock anyway' }).click();
  await expect(page.getByText('Unlocked manually.')).toBeVisible();
  await page.getByRole('link', { name: '← Skill tree' }).click();
  await expect(page.getByRole('link', { name: /^Sliding Window, In progress/ })).toBeVisible();
});
