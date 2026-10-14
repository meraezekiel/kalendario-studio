import { expect, test } from '@playwright/test';
import { openStudio } from './helpers';

test('works on a phone: single column, no horizontal scroll, tap to select', async ({ page }) => {
  const errors = await openStudio(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const pg = (await page.locator('.ph .page').boundingBox())!;
  expect(pg.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.locator('.ph .tx', { hasText: 'Our Family 2027' }).tap();
  await expect(page.getByTestId('insp-title')).toHaveText('Caption');
  await page.screenshot({ path: 'e2e/shots/09-mobile.png', fullPage: false });
  expect(errors).toEqual([]);
});
