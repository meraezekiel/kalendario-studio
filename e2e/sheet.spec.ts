import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { chooseTemplate, openStudio } from './helpers';

interface Printed {
  n: number;
  sheets: number;
  slots: number[];
  marks: number;
  size: string;
}

/** Replaces the print dialog; `hold` keeps the print view open so it can be looked at. */
async function stubPrint(page: Page, hold = false) {
  await page.evaluate((hold) => {
    const w = window as unknown as { __p: Printed };
    w.__p = { n: 0, sheets: 0, slots: [], marks: 0, size: '' };
    window.print = () => {
      const sheets = [...document.querySelectorAll('#printArea .sheetp')];
      w.__p = {
        n: w.__p.n + 1,
        sheets: sheets.length,
        slots: sheets.map((s) => s.querySelectorAll('.slotp .page').length),
        marks: document.querySelectorAll('#printArea .cutmark').length,
        size: document.getElementById('pagesize')?.textContent ?? '',
      };
      if (hold) {
        // Skip the fallback that closes the print view; the test sends afterprint itself.
        const real = window.setTimeout;
        window.setTimeout = ((() => 0) as unknown) as typeof window.setTimeout;
        queueMicrotask(() => (window.setTimeout = real));
      }
    };
  }, hold);
}
const printed = (page: Page) => page.evaluate(() => (window as unknown as { __p: Printed }).__p);

test.describe('Print several per sheet', () => {
  test('3×3 calendars: six copies on A4 with cut marks, then months in order', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Mini 3×3 in');
    await expect(page.getByTestId('page-label')).toHaveText(/of 12/);

    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    const sec = page.getByTestId('sheet-section');
    await sec.getByLabel('Print several on one sheet, with cut marks').check();
    await expect(sec.getByTestId('sheet-summary')).toHaveText('6 per sheet · 2 across × 3 down · A4, portrait');
    await expect(sec.getByTestId('sheet-preview').locator('i')).toHaveCount(6);
    await sec.scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'e2e/shots/40-sheet-panel.png' });

    // Print page: one sheet filled with six copies of this month, plus marks.
    await stubPrint(page, true);
    await page.getByRole('button', { name: 'Print page' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    let p = await printed(page);
    expect(p.sheets).toBe(1);
    expect(p.slots).toEqual([6]);
    expect(p.marks).toBe(2 * 4 + 2 * 6); // 4 vertical and 6 horizontal cut lines with a 4 mm gap
    expect(p.size).toContain('210mm 297mm');
    await expect(page.locator('.toast')).toContainText('Printing 6 per A4 sheet (copies of each page) with cut marks');
    await page.emulateMedia({ media: 'print' });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: 'e2e/shots/41-sheet-print.png' });
    await page.evaluate(() => dispatchEvent(new Event('afterprint')));
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('#printArea .sheetp')).toHaveCount(0);

    // Pages in order, no gap, long bond: all twelve months over a few sheets.
    await sec.getByRole('button', { name: 'Pages in order' }).click();
    await expect(sec.getByLabel('Space between')).toHaveValue('4');
    await sec.getByLabel('Space between').selectOption('0');
    await sec.getByLabel(/^Sheet/).selectOption('Long');
    await expect(sec.getByTestId('sheet-summary')).toHaveText('8 per sheet · 2 across × 4 down · Long bond 8.5×13, portrait');
    await stubPrint(page);
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    p = await printed(page);
    expect(p.slots).toEqual([8, 4]);
    expect(p.size).toContain('215.9mm 330.2mm');

    // Turned off, printing is one page per sheet again; the setting survives a reload.
    await page.reload();
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await expect(sec.getByTestId('sheet-summary')).toContainText('8 per sheet');
    await sec.getByLabel('Print several on one sheet, with cut marks').uncheck();
    await stubPrint(page);
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    p = await printed(page);
    expect(p.sheets).toBe(12);
    expect(p.marks).toBe(0);
    expect(p.size).toContain('76.2mm 76.2mm');
    expect(errors).toEqual([]);
  });

  test('a custom size set on one month applies to the whole calendar, so Print all fills two sheets', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByLabel('Paper').selectOption('Custom');
    await expect(page.locator('.toast')).toContainText('Paper changed on all pages');
    const w = page.getByLabel('Width (in)'), h = page.getByLabel('Height (in)');
    await w.fill('3.5');
    await w.press('Enter');
    await h.fill('3.5');
    await h.press('Enter');
    await page.getByLabel('Unit').selectOption('cm');
    await expect(page.getByLabel('Width (cm)')).toHaveValue('8.89');

    // Another month has the same size and unit.
    await page.getByRole('button', { name: '7 · Jul' }).click();
    await expect(page.getByLabel('Width (cm)')).toHaveValue('8.89');
    await expect(page.getByLabel('Height (cm)')).toHaveValue('8.89');

    const sec = page.getByTestId('sheet-section');
    await sec.getByLabel('Print several on one sheet, with cut marks').check();
    await sec.getByRole('button', { name: 'Pages in order' }).click();
    await expect(sec.getByTestId('sheet-summary')).toHaveText('6 per sheet · 2 across × 3 down · A4, portrait');
    await stubPrint(page);
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    expect((await printed(page)).slots).toEqual([6, 6]);
    expect(errors).toEqual([]);
  });

  test('a design saved with only January at 3.5 in: typing the same size again brings the other months along', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    // Make such a design file: January custom 3.5×3.5 in, the other months still A4.
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save design file' }).click();
    const saved = JSON.parse(readFileSync(await (await dl).path(), 'utf8'));
    saved.doc.pages[0].paper = { size: 'Custom', o: 'p', cw: 88.9, ch: 88.9, unit: 'in' };
    expect(saved.doc.pages[1].paper.size).toBe('A4');
    const open = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open design file' }).click();
    await (await open).setFiles({ name: 'mixed.kalendaryo', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await expect(page.locator('.toast')).toContainText('Opened');

    const w = page.getByLabel('Width (in)');
    await expect(w).toHaveValue('3.5');
    await w.fill('3.5');
    await w.press('Enter');
    await expect(page.locator('.toast')).toContainText('Paper changed on all pages');
    await page.getByRole('button', { name: '12 · Dec' }).click();
    await expect(page.getByLabel('Paper')).toHaveValue('Custom');
    await expect(page.getByLabel('Width (in)')).toHaveValue('3.5');

    const sec = page.getByTestId('sheet-section');
    await sec.getByLabel('Print several on one sheet, with cut marks').check();
    await sec.getByRole('button', { name: 'Pages in order' }).click();
    await stubPrint(page);
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    expect((await printed(page)).slots).toEqual([6, 6]);
    expect(errors).toEqual([]);
  });

  test('8×5 in calendars: two months on A4 portrait, starting at the top-left', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByLabel('Paper').selectOption('Custom');
    const w = page.getByLabel('Width (in)'), h = page.getByLabel('Height (in)');
    await w.fill('8');
    await w.press('Enter');
    await h.fill('5');
    await h.press('Enter');

    const sec = page.getByTestId('sheet-section');
    await sec.getByLabel('Print several on one sheet, with cut marks').check();
    await sec.getByRole('button', { name: 'Pages in order' }).click();
    await expect(sec.getByTestId('sheet-summary')).toHaveText('2 per sheet · 1 across × 2 down · A4, portrait');
    await stubPrint(page, true);
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    const p = await printed(page);
    expect(p.slots.every((n) => n === 2)).toBe(true);
    expect(p.size).toContain('210mm 297mm');
    const first = await page.locator('#printArea .slotp').first().evaluate((e) => [(e as HTMLElement).style.left, (e as HTMLElement).style.top]);
    expect(first).toEqual(['3mm', '3mm']);
    await page.emulateMedia({ media: 'print' });
    await page.locator('#printArea .sheetp').first().screenshot({ path: 'e2e/shots/54-sheet-8x5.png' });
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => dispatchEvent(new Event('afterprint')));
    expect(errors).toEqual([]);
  });

  test('a page bigger than the sheet prints normally and says why', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    const sec = page.getByTestId('sheet-section');
    await sec.getByLabel('Print several on one sheet, with cut marks').check();
    await sec.getByLabel(/^Sheet/).selectOption('A4');
    await expect(sec.getByTestId('sheet-summary')).toContainText('too big for A4');
    await stubPrint(page);
    await page.getByRole('button', { name: 'Print page' }).click();
    await expect.poll(async () => (await printed(page)).n).toBe(1);
    expect((await printed(page)).marks).toBe(0);
    await expect(page.locator('.toast')).toContainText('too big for A4 paper');
    expect(errors).toEqual([]);
  });
});
