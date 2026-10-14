import { expect, test } from '@playwright/test';
import { chooseTemplate, inspectorTitle, makePng, openStudio, stageEls } from './helpers';

test.describe('Kalendaryo Studio', () => {
  test('loads the pastel template as a 12-month calendar', async ({ page }) => {
    const errors = await openStudio(page);
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 12 · January/);
    await expect(page.getByTestId('pagebar').getByRole('button')).toHaveCount(13); // 12 pages + "+ Page"
    // January 2027 starts on a Friday: New Year's Day is labelled in the grid.
    await expect(page.locator('.ph .cell .lbl', { hasText: "New Year's Day" })).toBeVisible();
    await page.screenshot({ path: 'e2e/shots/01-initial.png' });
    expect(errors).toEqual([]);
  });

  test('switches templates and fills the year in steps of three months', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Giveaway · 3 months');
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 4/);
    await expect(page.locator('.ph .el-cal')).toHaveCount(3);
    await expect(page.locator('.ph .el-events')).toHaveCount(3);
    await page.screenshot({ path: 'e2e/shots/02-giveaway3.png' });
    await chooseTemplate(page, 'Giveaway · whole year');
    await expect(page.locator('.ph .el-cal')).toHaveCount(12);
    await page.screenshot({ path: 'e2e/shots/03-giveaway12.png' });
    expect(errors).toEqual([]);
  });

  test('adds a heading, edits it from the inspector and undoes', async ({ page }) => {
    await openStudio(page);
    const before = await stageEls(page).count();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add a heading' }).click();
    await expect(stageEls(page)).toHaveCount(before + 1);
    await expect(inspectorTitle(page)).toHaveText('Add a heading');
    await expect(page.getByTestId('selection')).toBeVisible();

    const area = page.locator('.insp textarea');
    await area.fill('Happy {Month}!');
    await expect(page.locator('.ph .tx', { hasText: 'Happy January!' })).toBeVisible();

    // One undo reverts the whole typing burst, a second removes the heading.
    await page.locator('.stage').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Control+z');
    await expect(page.locator('.ph .tx', { hasText: 'Add a heading' })).toBeVisible();
    await page.keyboard.press('Control+z');
    await expect(stageEls(page)).toHaveCount(before);
    await page.keyboard.press('Control+y');
    await expect(stageEls(page)).toHaveCount(before + 1);
  });

  test('moves, resizes and rotates with the mouse', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Star' }).click();
    const star = page.locator('.ph .el-shape').last();
    const x = page.getByLabel('X', { exact: true });
    const x0 = +(await x.inputValue());

    const b = (await star.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 5, { steps: 6 });
    await page.mouse.up();
    const x1 = +(await x.inputValue());
    expect(x1).toBeGreaterThan(x0 + 40);

    const w = page.getByLabel('Width', { exact: true });
    const w0 = +(await w.inputValue());
    const se = (await page.locator('.hd.se').boundingBox())!;
    await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
    await page.mouse.down();
    await page.mouse.move(se.x + 40, se.y + 40, { steps: 6 });
    await page.mouse.up();
    expect(+(await w.inputValue())).toBeGreaterThan(w0 + 20);

    const rot = (await page.locator('.hd.rot').boundingBox())!;
    const sb = (await page.getByTestId('selection').boundingBox())!;
    await page.mouse.move(rot.x + rot.width / 2, rot.y + rot.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width + 80, sb.y + sb.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByLabel('Rotate')).not.toHaveValue('0');
    await page.screenshot({ path: 'e2e/shots/04-transform.png' });
  });

  test('edits text in place with a double-click', async ({ page }) => {
    await openStudio(page);
    const caption = page.locator('.ph .tx', { hasText: 'Our Family 2027' });
    await caption.dblclick();
    const editor = page.getByTestId('text-editor');
    await expect(editor).toBeFocused();
    await page.keyboard.type('Sunny days {YEAR}');
    await page.locator('.stage').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.ph .tx', { hasText: 'Sunny days 2027' })).toBeVisible();
    await expect(page.getByTestId('text-editor')).toHaveCount(0);
  });

  test('edits a single day: label, number and colour', async ({ page }) => {
    await openStudio(page);
    const cell = page.locator('.ph .el-cal .cell[data-day="15"]');
    await cell.click(); // selects the calendar
    await cell.click(); // selects the day
    await expect(page.locator('summary', { hasText: 'Day · January 15' })).toBeVisible();
    await page.getByLabel('Label').fill('Fiesta');
    await expect(cell.locator('.lbl')).toHaveText('Fiesta');

    await cell.locator('.num').dblclick();
    const ed = page.getByTestId('day-editor');
    await expect(ed).toBeFocused();
    await page.keyboard.type('15*');
    await page.keyboard.press('Enter');
    await expect(cell.locator('.num')).toHaveText('15*');
    await page.screenshot({ path: 'e2e/shots/05-day-edit.png' });
  });

  test('uploads photos, places one into the main frame and one on a day', async ({ page }) => {
    await openStudio(page);
    const png = await makePng(page);
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload photos' }).click();
    await (await chooser).setFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: png },
      { name: 'b.png', mimeType: 'image/png', buffer: await makePng(page, '#e76f51') },
    ]);
    await expect(page.getByTestId('tray').locator('.t')).toHaveCount(2);

    // Tap-to-place: arm the first photo, then tap the main photo frame.
    const frame = page.locator('.ph .el-image').first();
    const before = await frame.locator('.im').getAttribute('style');
    await page.getByTestId('tray').locator('.t').first().click();
    await expect(page.locator('.armbar')).toBeVisible();
    await frame.click();
    await expect(page.locator('.armbar')).toHaveCount(0);
    expect(await frame.locator('.im').getAttribute('style')).not.toBe(before);

    // Drag the second photo from the tray onto day 20.
    await page.getByTestId('tray').locator('.t').nth(1).dragTo(page.locator('.ph .el-cal .cell[data-day="20"]'));
    await expect(page.locator('.ph .el-cal .cell[data-day="20"] .cimg')).toHaveCount(1);
    await page.screenshot({ path: 'e2e/shots/06-photos.png' });
  });

  test('page tools: navigate, add, paper size and fill year', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 2 of 12 · February/);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByRole('button', { name: 'Add blank page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 3 of 13/);
    await expect(stageEls(page)).toHaveCount(0);

    await page.getByLabel('Paper').selectOption('Legal');
    await page.getByRole('button', { name: 'Landscape' }).click();
    const box = (await page.locator('.ph .page').boundingBox())!;
    expect(box.width).toBeGreaterThan(box.height);
    await page.screenshot({ path: 'e2e/shots/07-pages.png' });
  });

  test('keyboard: delete, duplicate, nudge', async ({ page }) => {
    await openStudio(page);
    const n = await stageEls(page).count();
    await page.locator('.ph .tx', { hasText: 'Our Family 2027' }).click();
    await page.keyboard.press('Control+d');
    await expect(stageEls(page)).toHaveCount(n + 1);
    const x = page.getByLabel('X', { exact: true });
    const x0 = +(await x.inputValue());
    await page.keyboard.press('Shift+ArrowRight');
    await expect(x).toHaveValue(String(x0 + 10));
    await page.keyboard.press('Delete');
    await expect(stageEls(page)).toHaveCount(n);
    await page.keyboard.press('Control+z');
    await expect(stageEls(page)).toHaveCount(n + 1);
  });

  test('box-selects the giveaway ad block and drags it as a group', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Giveaway · 3 months');
    const pg = (await page.locator('.ph .page').boundingBox())!;
    const cal = page.locator('.ph .el-cal').last();
    const ad = page.locator('.ph .tx', { hasText: 'BITUIN PRINTING' });
    const cal0 = (await cal.boundingBox())!;
    const ad0 = (await ad.boundingBox())!;

    // Drag a selection box from the grey area beside the page around the bottom ad block.
    await page.mouse.move(pg.x - 12, pg.y + pg.height * 0.76);
    await page.mouse.down();
    await page.mouse.move(pg.x + pg.width / 2, pg.y + pg.height * 0.9, { steps: 4 });
    await expect(page.getByTestId('marquee')).toBeVisible();
    await page.mouse.move(pg.x + pg.width + 12, pg.y + pg.height + 12, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByTestId('marquee')).toHaveCount(0);
    await expect(page.getByTestId('group-selection')).toBeVisible();
    const n = parseInt((await inspectorTitle(page).textContent())!);
    expect(n).toBeGreaterThanOrEqual(5);
    await expect(page.getByTestId('layers').locator('.layer.on')).toHaveCount(n);
    await page.screenshot({ path: 'e2e/shots/10-multi-marquee.png' });

    // Dragging one selected item moves the whole block; the calendars stay put.
    await page.mouse.move(ad0.x + ad0.width / 2, ad0.y + ad0.height / 2);
    await page.mouse.down();
    await page.mouse.move(ad0.x + ad0.width / 2, ad0.y + ad0.height / 2 - 60, { steps: 8 });
    await page.mouse.up();
    const ad1 = (await ad.boundingBox())!;
    expect(ad0.y - ad1.y).toBeGreaterThan(40);
    expect((await cal.boundingBox())!.y).toBeCloseTo(cal0.y, 0);
    await expect(inspectorTitle(page)).toHaveText(`${n} elements`); // still a group after the drag
    await page.screenshot({ path: 'e2e/shots/11-multi-moved.png' });

    // One undo puts the whole block back.
    await page.keyboard.press('Control+z');
    await expect.poll(async () => (await ad.boundingBox())!.y).toBeCloseTo(ad0.y, 0);
    expect(errors).toEqual([]);
  });

  test('shift-click selects several items; keyboard acts on all of them', async ({ page }) => {
    await openStudio(page);
    const n = await stageEls(page).count();
    const caption = page.locator('.ph .tx', { hasText: 'Our Family 2027' });
    const photo = page.locator('.ph .el-image').first();
    await caption.click();
    await photo.click({ modifiers: ['Shift'] });
    await expect(inspectorTitle(page)).toHaveText('2 elements');

    const c0 = (await caption.boundingBox())!, p0 = (await photo.boundingBox())!;
    await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(async () => (await caption.boundingBox())!.x).toBeGreaterThan(c0.x + 3);
    expect((await photo.boundingBox())!.x).toBeGreaterThan(p0.x + 3);

    // Shift-clicking a selected item removes it from the selection.
    await photo.click({ modifiers: ['Shift'] });
    await expect(inspectorTitle(page)).toHaveText('Caption');
    await photo.click({ modifiers: ['Shift'] });
    await expect(inspectorTitle(page)).toHaveText('2 elements');

    await page.keyboard.press('Control+d');
    await expect(stageEls(page)).toHaveCount(n + 2);
    await expect(inspectorTitle(page)).toHaveText('2 elements'); // the copies are selected
    await page.keyboard.press('Delete');
    await expect(stageEls(page)).toHaveCount(n);

    await page.keyboard.press('Control+a');
    await expect(inspectorTitle(page)).toHaveText(`${n} elements`);
    await page.getByRole('button', { name: 'Deselect' }).click();
    await expect(inspectorTitle(page)).toHaveText(/Page 1/);

    // Layers list supports Shift-click too.
    const layers = page.getByTestId('layers').locator('.layer');
    await layers.nth(0).click();
    await layers.nth(1).click({ modifiers: ['Shift'] });
    await expect(inspectorTitle(page)).toHaveText('2 elements');
  });

  test('inspector and page controls from the original editor', async ({ page }) => {
    const errors = await openStudio(page);
    const cal = page.locator('.ph .el-cal');

    // Calendar: header bar, red days, holiday labels.
    await cal.locator('.cell[data-day="5"]').click();
    await page.locator('summary', { hasText: 'Header bar' }).click();
    await page.getByLabel('Show header bar').check();
    await expect(cal.locator('.chead')).toContainText('JANUARY 2027');
    await page.locator('summary', { hasText: 'Day numbers' }).click();
    await page.locator('.dows button', { hasText: 'We' }).click();
    await expect(cal.locator('.cell[data-day="6"] .num')).toHaveCSS('color', 'rgb(226, 85, 127)');
    await page.getByLabel('Show holiday names in the boxes').uncheck();
    await expect(cal.locator('.lbl', { hasText: "New Year's Day" })).toHaveCount(0);

    // Photo: circle, empty frame, sample photo.
    const photo = page.locator('.ph .el-image').first();
    await photo.click();
    await page.getByRole('button', { name: 'Make it a circle' }).click();
    const pb = (await photo.boundingBox())!;
    expect(Math.abs(pb.width - pb.height)).toBeLessThan(2);
    await page.getByRole('button', { name: 'Empty frame' }).click();
    await expect(photo.locator('.ph-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Use a sample photo' }).click();
    await expect(photo.locator('.im')).toBeVisible();

    // Hiding the selected layer deselects it.
    await page.getByRole('button', { name: /^Hide Main photo/ }).click();
    await expect(inspectorTitle(page)).toHaveText(/Page 1/);
    await expect(photo).toHaveCount(0);

    // Shape: change kind from the inspector.
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Heart' }).click();
    await page.getByRole('combobox', { name: /^Shape/ }).selectOption('star');
    await expect(inspectorTitle(page)).toHaveText('Star');

    // Pages: year, holidays, duplicate, move, delete with confirm.
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Year' }).fill('2030');
    await expect(page.locator('.ph .tx', { hasText: 'Our Family 2030' })).toBeVisible();
    await page.getByLabel('Show Philippine holidays').uncheck();
    await page.getByRole('button', { name: 'Duplicate page' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 2 of 13 · January/);
    await page.getByRole('button', { name: 'Move later' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 3 of 13 · January/);
    const del = page.getByRole('button', { name: 'Delete this page' });
    await del.click();
    await expect(page.getByTestId('page-label')).toHaveText(/of 13/); // first click only arms
    await page.getByRole('button', { name: 'Click again to confirm' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/of 12/);
    expect(errors).toEqual([]);
  });

  test('inside a frame, print and PNG are replaced by a hint', async ({ page, baseURL }) => {
    await page.setContent(`<iframe src="${baseURL}/" style="width:1400px;height:860px;border:0"></iframe>`);
    const f = page.frameLocator('iframe');
    await expect(f.locator('.ph .page')).toBeVisible();
    await expect(f.getByText('Print from the downloaded file')).toBeVisible();
    await expect(f.getByRole('button', { name: 'Print page' })).toHaveCount(0);
  });

  test('autosaves and restores after reload', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add a heading' }).click();
    await page.locator('.insp textarea').fill('Persist me');
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.locator('.ph .tx', { hasText: 'Persist me' })).toBeVisible();
  });

  test('exports a PNG', async ({ page }) => {
    await openStudio(page);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PNG' }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toBe('calendar-2027-page-1.png');
    const path = await file.path();
    const fs = await import('node:fs');
    expect(fs.statSync(path).size).toBeGreaterThan(50_000);
    fs.copyFileSync(path, 'e2e/shots/08-export.png');
  });

  test('print renders pages at paper size', async ({ page }) => {
    await openStudio(page);
    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        const w = window as unknown as { __printed: number; __sheets: number };
        w.__printed++;
        w.__sheets = document.querySelectorAll('#printArea .sheetp').length;
      };
    });
    await page.getByRole('button', { name: 'Print all' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
    expect(await page.evaluate(() => (window as unknown as { __sheets: number }).__sheets)).toBe(12);
    expect(await page.locator('#pagesize').textContent()).toContain('210mm 297mm');
  });
});
