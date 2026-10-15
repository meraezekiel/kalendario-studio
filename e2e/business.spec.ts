import { expect, test } from '@playwright/test';
import { chooseTemplate, openStudio } from './helpers';

test.describe('Classic business calendar', () => {
  test('month number banner, moon phases, side months and whole-year holidays', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Classic business');
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 12 · January/);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.locator('.drawer').getByLabel('Year', { exact: true }).fill('2026');
    for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 10 of 12 · October/);

    const ph = page.locator('.ph .page');
    await expect(ph.locator('.tx', { hasText: /^10$/ })).toBeVisible();
    await expect(ph.locator('.tx', { hasText: 'OCTOBER' })).toBeVisible();

    // Moon phases in the empty boxes, as printed on real October 2026 calendars.
    const main = ph.locator('.el-cal').first();
    const moons = main.locator('.moon');
    await expect(moons).toHaveCount(4);
    await expect(moons.locator('i')).toHaveText(['OCT. 3', 'OCT. 10', 'OCT. 19', 'OCT. 26']);
    await expect(moons.locator('b')).toHaveText(['Last quarter', 'New moon', 'First quarter', 'Full moon']);

    // Last and next month beside the holiday list.
    await expect(ph.locator('.el-cal .chead', { hasText: 'SEPTEMBER' })).toBeVisible();
    await expect(ph.locator('.el-cal .chead', { hasText: 'NOVEMBER' })).toBeVisible();
    const list = ph.locator('.evs-year');
    await expect(list.locator('b').first()).toHaveText('HOLIDAYS');
    await expect(list.locator('.ev', { hasText: "New Year's Day" })).toContainText('Jan 1');
    await expect(list.locator('.ev', { hasText: 'Rizal Day' })).toContainText('Dec 30');
    await page.screenshot({ path: 'e2e/shots/37-business.png' });

    // February 2026 has no empty boxes: the phases become small icons on their days.
    for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/February/);
    await expect(main.locator('.moon')).toHaveCount(0);
    await expect(main.locator('.cell[data-day="17"] .moon-sm')).toHaveAttribute('data-moon', '0');

    // Inspector: moon phases can be switched off, and the list can show one month.
    await main.click({ position: { x: 5, y: 5 } });
    await page.locator('summary', { hasText: 'Day numbers' }).click();
    await page.getByLabel('Moon phases').uncheck();
    await expect(main.locator('.moon-sm')).toHaveCount(0);
    await list.click();
    await expect(page.getByRole('button', { name: 'Whole year' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'This month' }).click();
    await expect(ph.locator('.evs-year')).toHaveCount(0);
    await expect(ph.locator('.evs b').first()).toHaveText('FEBRUARY');
    expect(errors).toEqual([]);
  });

  test('slanted bar is in the shape list', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Slanted bar' }).click();
    await expect(page.getByTestId('insp-title')).toHaveText(/Slanted bar/);
  });
});
