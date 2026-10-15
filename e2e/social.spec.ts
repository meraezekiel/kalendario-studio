import { expect, test } from '@playwright/test';
import { chooseTemplate, inspectorTitle, openStudio } from './helpers';

test('social media and contact icons: browse, search, add and print', async ({ page }) => {
  const errors = await openStudio(page);
  await chooseTemplate(page, 'Blank page');
  await page.getByRole('button', { name: 'Graphics', exact: true }).click();
  const panel = page.locator('.drawer');
  const cat = page.getByTestId('graphic-cat-social');
  await expect(cat).toContainText('Social media & contact');
  await cat.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'e2e/shots/44-social-category.png' });

  // Search by nickname, then add a few.
  await panel.getByLabel('Search graphics').fill('fb');
  const results = page.getByTestId('graphic-results');
  await results.getByRole('button', { name: 'Facebook (round)' }).click();
  await expect(inspectorTitle(page)).toHaveText('Facebook (round)');
  for (const [q, name] of [['ig', 'Instagram (round)'], ['tiktok', 'TikTok (round)'], ['telepono', 'Phone (color)']]) {
    await panel.getByLabel('Search graphics').fill(q);
    await results.getByRole('button', { name }).click();
  }
  const art = page.locator('.ph .el-graphic img');
  await expect(art).toHaveCount(4);
  for (const i of await art.all()) await expect.poll(() => i.evaluate((e: HTMLImageElement) => e.naturalWidth)).toBeGreaterThan(0);
  await expect(art.first()).toHaveAttribute('src', /social\/facebook-badge\.svg/);

  // See all shows every icon in all three styles.
  await panel.getByLabel('Search graphics').fill('');
  await cat.getByRole('button', { name: 'See all' }).click();
  await expect(cat.locator('.gtile')).toHaveCount(75);
  await page.screenshot({ path: 'e2e/shots/45-social-all.png' });

  // They print with the page.
  await page.evaluate(() => {
    window.print = () => void ((window as unknown as { __n: number }).__n = document.querySelectorAll('#printArea .el-graphic img[src*="social/"]').length);
  });
  await page.getByRole('button', { name: 'Print page' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __n?: number }).__n)).toBe(4);
  expect(errors).toEqual([]);
});
