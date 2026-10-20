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
    // Spring tides at new and full moon, neap tides at the quarters, each with the day after.
    await page.getByLabel('Spring & neap tides').check();
    await expect(main.locator('.tide')).toHaveCount(8);
    await expect(main.locator('.cell[data-day="17"] .tide')).toHaveAttribute('data-tide', 'spring');
    await expect(main.locator('.cell[data-day="17"] .moon-sm')).toBeVisible();
    await expect(main.locator('.cell[data-day="25"] .tide')).toHaveAttribute('data-tide', 'neap');
    await page.screenshot({ path: 'e2e/shots/39-tides.png' });
    await page.getByLabel('Spring & neap tides').uncheck();
    await expect(main.locator('.tide')).toHaveCount(0);

    // High and low water times for a chosen port: blue highs, red lows, am/pm.
    await page.getByLabel('High & low tide times').selectOption({ label: 'Davao' });
    const times = main.locator('.cell[data-day="15"] .times span');
    await expect(times).toHaveCount(4);
    await expect(times.first()).toHaveText(/^[HL] \d{1,2}:\d\d [ap]m$/);
    await expect(main.locator('.times span', { hasText: /^H / }).first()).toHaveCSS('color', 'rgb(29, 95, 191)');
    await expect(main.locator('.times span', { hasText: /^L / }).first()).toHaveCSS('color', 'rgb(214, 40, 40)');
    await page.screenshot({ path: 'e2e/shots/47-tide-times.png' });
    // A two-line label above four tide times still stays below the day number.
    const d15 = main.locator('.cell[data-day="15"]');
    await d15.click();
    await page.getByLabel('Label').fill('Town fiesta and birthday');
    await expect(d15.locator('.lbl')).toHaveText('Town fiesta and birthday');
    const gap = await d15.evaluate((c) => c.querySelector('.foot')!.getBoundingClientRect().top - c.querySelector('.num')!.getBoundingClientRect().bottom);
    expect(gap).toBeGreaterThanOrEqual(-1);
    await main.click({ position: { x: 5, y: 5 } });
    await page.getByLabel('High tide color').fill('#008000');
    await expect(main.locator('.times span', { hasText: /^H / }).first()).toHaveCSS('color', 'rgb(0, 128, 0)');
    await page.getByLabel('High & low tide times').selectOption({ label: 'Off' });
    await expect(main.locator('.times')).toHaveCount(0);
    await page.getByLabel('Moon phases').uncheck();
    await expect(main.locator('.moon-sm')).toHaveCount(0);
    await list.click();
    await expect(page.getByRole('button', { name: 'Whole year' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'This month' }).click();
    await expect(ph.locator('.evs-year')).toHaveCount(0);
    await expect(ph.locator('.evs b').first()).toHaveText('FEBRUARY');
    expect(errors).toEqual([]);
  });

  test('two months per page: banners, side months, memo and legal holidays', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Business · 2 months');
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 6 · January/);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.locator('.drawer').getByLabel('Year', { exact: true }).fill('2026');
    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 5 of 6 · September/);

    const ph = page.locator('.ph .page');
    for (const t of ['9', 'SEPTEMBER', '10', 'OCTOBER']) await expect(ph.locator('.tx', { hasText: new RegExp(`^${t}$`) })).toBeVisible();
    await expect(ph.locator('.tx', { hasText: /^2026$/ })).toHaveCount(2);
    // August and November on the side, with their month numbers.
    await expect(ph.locator('.el-cal .chead', { hasText: 'AUGUST' })).toContainText('8');
    await expect(ph.locator('.el-cal .chead', { hasText: 'NOVEMBER' })).toContainText('11');
    // Both big months show their moon phases.
    const cals = ph.locator('.el-cal');
    await expect(cals).toHaveCount(4);
    const oct = ph.locator('.el', { has: page.locator('.cell[data-day="31"]') }).filter({ hasNot: page.locator('.chead') }).last();
    await expect(oct.locator('.moon i')).toHaveText(['OCT. 3', 'OCT. 10', 'OCT. 19', 'OCT. 26']);
    await expect(ph.locator('.tx', { hasText: 'MEMORANDUM' })).toBeVisible();
    const list = ph.locator('.evs-year');
    await expect(list.locator('.ev', { hasText: 'Rizal Day' })).toContainText('Dec 30');
    // Like the printed "Legal Holidays" box: the 10 regular holidays, no special days.
    await expect(list.locator('.ev')).toHaveCount(10);
    await expect(list.locator('.ev', { hasText: 'National Heroes Day' })).toContainText('Aug 31');
    await expect(list.locator('.ev', { hasText: 'EDSA' })).toHaveCount(0);
    // The whole holiday list fits in its box.
    const fits = await list.evaluate((e) => e.scrollHeight <= e.clientHeight + 1);
    expect(fits).toBe(true);
    await page.screenshot({ path: 'e2e/shots/38-business2.png' });

    // The last page is November and December, with January of the next year on the side.
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 6 of 6 · November/);
    await expect(ph.locator('.el-cal .chead', { hasText: 'JANUARY' })).toContainText('2027');
    expect(errors).toEqual([]);
  });

  test('slanted bar is in the shape list', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Slanted bar' }).click();
    await expect(page.getByTestId('insp-title')).toHaveText(/Slanted bar/);
  });
});
