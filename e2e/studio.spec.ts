import { expect, test } from '@playwright/test';
import { arrangeField, chooseTemplate, inches, inspectorTitle, makePng, openStudio, readPx, stageEls } from './helpers';

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
    const x0 = await readPx(page, 'X');

    const b = (await star.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 5, { steps: 6 });
    await page.mouse.up();
    const x1 = await readPx(page, 'X');
    expect(x1).toBeGreaterThan(x0 + 40);

    const w0 = await readPx(page, 'Width');
    const se = (await page.locator('.hd.se').boundingBox())!;
    await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
    await page.mouse.down();
    await page.mouse.move(se.x + 40, se.y + 40, { steps: 6 });
    await page.mouse.up();
    expect(await readPx(page, 'Width')).toBeGreaterThan(w0 + 20);

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
    const x0 = await readPx(page, 'X');
    await page.keyboard.press('Shift+ArrowRight');
    // The field shows inches to 2 places, so the 10 px nudge reads back to within a px.
    await expect.poll(async () => Math.abs((await readPx(page, 'X')) - (x0 + 10))).toBeLessThan(1);
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
    // Without names, holidays still get the holiday colour.
    await expect(cal.locator('.cell[data-day="1"] .num')).toHaveCSS('color', 'rgb(226, 85, 127)');

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

  test('background image tool: add, upload, drag to size, stays behind, prints', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Giveaway · 3 months');
    const bg = page.locator('.ph .page > .el[data-bg]');
    await expect(bg).toHaveCount(0);

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Background image' }).click();
    await (await chooser).setFiles({ name: 'bg.png', mimeType: 'image/png', buffer: await makePng(page, '#f4d58d', 600, 900) });
    await expect(bg.locator('.im')).toBeVisible();
    await expect(inspectorTitle(page)).toHaveText('Background');
    // Added behind everything: first on the page, last in Layers, full page size.
    await expect(page.locator('.ph .page > .el').first()).toHaveAttribute('data-bg', '');
    await expect(page.getByTestId('layers').locator('.layer').last()).toContainText('Background');
    const pg = (await page.locator('.ph .page').boundingBox())!;
    const b0 = (await bg.boundingBox())!;
    expect(Math.abs(b0.width - pg.width)).toBeLessThan(2);
    expect(Math.abs(b0.height - pg.height)).toBeLessThan(2);

    // Drag the bottom-right corner in to make it smaller.
    const se = (await page.locator('.hd.se').boundingBox())!;
    await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
    await page.mouse.down();
    await page.mouse.move(se.x - 150, se.y - 220, { steps: 8 });
    await page.mouse.up();
    const b1 = (await bg.boundingBox())!;
    expect(b1.width).toBeLessThan(b0.width - 60);
    expect(b1.height).toBeLessThan(b0.height - 60);
    // Drag the right edge to make it wider without changing the height.
    const e = (await page.locator('.hd.e').boundingBox())!;
    await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
    await page.mouse.down();
    await page.mouse.move(e.x + 70, e.y + e.height / 2, { steps: 6 });
    await page.mouse.up();
    const b2 = (await bg.boundingBox())!;
    expect(b2.width).toBeGreaterThan(b1.width + 40);
    expect(Math.abs(b2.height - b1.height)).toBeLessThan(2);
    await page.screenshot({ path: 'e2e/shots/12-background.png' });

    // Calendars stay on top of it.
    const cal = (await page.locator('.ph .el-cal').first().boundingBox())!;
    const onTop = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest('.el')?.classList.contains('el-cal'), [cal.x + 40, cal.y + 80]);
    expect(onTop).toBe(true);

    // Fit to page puts it back to full size; one undo per step.
    await page.locator('.insp').getByRole('button', { name: 'Fit to page' }).click();
    await expect.poll(async () => Math.round((await bg.boundingBox())!.width)).toBe(Math.round(pg.width));
    await page.keyboard.press('Control+z');
    await expect.poll(async () => Math.round((await bg.boundingBox())!.width)).toBe(Math.round(b2.width));

    // It prints with the page.
    await page.evaluate(() => {
      window.print = () => {
        (window as unknown as { __bg: number }).__bg = document.querySelectorAll('#printArea .el[data-bg] .im').length;
      };
    });
    await page.getByRole('button', { name: 'Print page' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __bg?: number }).__bg)).toBe(1);
    expect(errors).toEqual([]);
  });

  test('tray ▣ and backgrounds for each month fill the background image, kept by Apply design', async ({ page }) => {
    const errors = await openStudio(page);
    const bg = page.locator('.ph .page > .el[data-bg]');
    // Width of the current page's background photo (each test image has its own width).
    const bgWidth = () =>
      bg.locator('.im').evaluate((n) => {
        const url = getComputedStyle(n).backgroundImage.slice(5, -2);
        return new Promise<number>((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.src = url; });
      });

    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Backgrounds for each month' }).click();
    await (await chooser).setFiles([
      { name: '03-mar.png', mimeType: 'image/png', buffer: await makePng(page, '#2a9d8f', 103, 140) },
      { name: '01-jan.png', mimeType: 'image/png', buffer: await makePng(page, '#e76f51', 101, 140) },
      { name: '02-feb.png', mimeType: 'image/png', buffer: await makePng(page, '#e9c46a', 102, 140) },
    ]);
    await expect(page.locator('.toast')).toContainText('pages 1–3');
    expect(await bgWidth()).toBe(101);
    await page.getByRole('button', { name: 'Next page' }).click();
    expect(await bgWidth()).toBe(102);
    await page.getByRole('button', { name: 'Next page' }).click();
    expect(await bgWidth()).toBe(103);
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(bg).toHaveCount(0);

    // The tray's ▣ button fills (or creates) this page's background.
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    await page.getByTestId('tray').locator('.t').first().getByRole('button', { name: 'Use as background' }).click();
    await expect(bg).toHaveCount(1);
    await expect(inspectorTitle(page)).toHaveText('Background');

    // Apply design from January: Feb and Mar keep their own backgrounds.
    await page.getByTestId('pagebar').getByRole('button', { name: /^1 ·/ }).click();
    await page.getByRole('button', { name: 'Apply design to all months' }).click();
    await page.getByRole('button', { name: 'Click again to confirm' }).click();
    await page.getByTestId('pagebar').getByRole('button', { name: /^2 ·/ }).click();
    expect(await bgWidth()).toBe(102);
    await expect(page.locator('.ph .page > .el-image')).toHaveCount(2); // background + main photo, not mixed up
    await page.getByTestId('pagebar').getByRole('button', { name: /^3 ·/ }).click();
    expect(await bgWidth()).toBe(103);
    expect(errors).toEqual([]);
  });
  test('two months per page: second table shows the next month, fill year makes six pages', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Blank page');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Table with header bar' }).click();
    await page.getByRole('button', { name: 'Table with header bar' }).click();
    const heads = page.locator('.ph .el-cal .chead');
    await expect(heads).toHaveCount(2);
    await expect(heads.nth(0)).toContainText('JANUARY');
    await expect(heads.nth(1)).toContainText('FEBRUARY');

    // The second table lands under the first, same width and left edge, without overlapping.
    const [a, b] = [(await page.locator('.ph .el-cal').nth(0).boundingBox())!, (await page.locator('.ph .el-cal').nth(1).boundingBox())!];
    expect(b.y).toBeGreaterThan(a.y + a.height);
    expect(Math.round(b.x)).toBe(Math.round(a.x));
    expect(Math.round(b.width)).toBe(Math.round(a.width));
    expect(Math.round(b.height)).toBe(Math.round(a.height));

    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByRole('button', { name: 'Fill the rest of the year from this design' }).click();
    await page.getByRole('button', { name: 'Click again to confirm' }).click();
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 6 · January/);
    await page.getByTestId('pagebar').getByRole('button', { name: /^2 ·/ }).click();
    await expect(heads.nth(0)).toContainText('MARCH');
    await expect(heads.nth(1)).toContainText('APRIL');
    await page.getByTestId('pagebar').getByRole('button', { name: /^6 ·/ }).click();
    await expect(heads.nth(0)).toContainText('NOVEMBER');
    await expect(heads.nth(1)).toContainText('DECEMBER');
    await page.screenshot({ path: 'e2e/shots/13-two-months.png' });
    expect(errors).toEqual([]);
  });

  test('graphics library: browse, search, add, drag, resize, flip, print and export', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Blank page');
    await page.getByRole('button', { name: 'Graphics', exact: true }).click();
    const panel = page.locator('.drawer');
    const art = page.locator('.ph .el-graphic');

    // Thumbnails load.
    const tile = panel.getByRole('button', { name: 'Party popper' });
    await expect(tile).toBeVisible();
    await expect.poll(() => tile.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);

    // Click to add; it is selected and named.
    await tile.click();
    await expect(art).toHaveCount(1);
    await expect(inspectorTitle(page)).toHaveText('Party popper');
    await expect.poll(() => art.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId('graphic-recent').getByRole('button', { name: 'Party popper' })).toBeVisible();

    // Corner resize keeps an illustration's shape.
    const se = (await page.locator('.hd.se').boundingBox())!;
    await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
    await page.mouse.down();
    await page.mouse.move(se.x + 90, se.y + 20, { steps: 6 });
    await page.mouse.up();
    const b = (await art.boundingBox())!;
    expect(Math.abs(b.width - b.height)).toBeLessThan(2);
    expect(b.width).toBeGreaterThan(120);

    // Flip.
    await page.getByRole('button', { name: 'Flip ↔' }).click();
    await expect(art.locator('img')).toHaveCSS('transform', 'matrix(-1, 0, 0, 1, 0, 0)');

    // Search, including Filipino words.
    await panel.getByLabel('Search graphics').fill('pasko');
    await expect(page.getByTestId('graphic-results').getByRole('button', { name: 'Christmas tree' })).toBeVisible();
    await panel.getByLabel('Search graphics').fill('carabao');
    await expect(page.getByTestId('graphic-results').getByRole('button')).toHaveCount(1);
    await panel.getByLabel('Search graphics').fill('');

    // See all shows a whole category.
    await page.getByTestId('graphic-cat-animals').getByRole('button', { name: 'See all' }).click();
    await expect(page.getByTestId('graphic-cat-animals').locator('.gtile')).toHaveCount(25);
    await panel.getByRole('button', { name: '← All graphics' }).click();

    // Drag a gradient onto the page; gradients stretch freely from the side handle.
    const pg = (await page.locator('.ph .page').boundingBox())!;
    await panel.getByRole('button', { name: 'Sunset' }).dragTo(page.locator('.ph .page'), { targetPosition: { x: pg.width / 2, y: pg.height * 0.75 } });
    await expect(art).toHaveCount(2);
    await expect(inspectorTitle(page)).toHaveText('Sunset');
    const g0 = (await art.nth(1).boundingBox())!;
    expect(g0.y + g0.height / 2).toBeGreaterThan(pg.y + pg.height * 0.6);
    const e = (await page.locator('.hd.e').boundingBox())!;
    await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
    await page.mouse.down();
    await page.mouse.move(e.x + 80, e.y + e.height / 2, { steps: 6 });
    await page.mouse.up();
    const g1 = (await art.nth(1).boundingBox())!;
    expect(g1.width).toBeGreaterThan(g0.width + 40);
    expect(Math.abs(g1.height - g0.height)).toBeLessThan(2);
    await page.screenshot({ path: 'e2e/shots/14-graphics.png' });

    // Prints and exports.
    await page.evaluate(() => {
      window.print = () => {
        (window as unknown as { __g: number }).__g = document.querySelectorAll('#printArea .el-graphic img').length;
      };
    });
    await page.getByRole('button', { name: 'Print page' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __g?: number }).__g)).toBe(2);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PNG' }).click();
    const file = await dl;
    const fs = await import('node:fs');
    fs.copyFileSync((await file.path())!, 'e2e/shots/15-graphics-export.png');
    expect(errors).toEqual([]);
  });

  test('decorations: bunting and confetti re-draw on resize, recolour, shuffle, search', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Blank page');
    await page.getByRole('button', { name: 'Graphics', exact: true }).click();
    const panel = page.locator('.drawer');
    await expect(page.getByTestId('graphic-cat-bunting')).toBeVisible();
    await page.locator('.drawer').screenshot({ path: 'e2e/shots/16-decorations-panel.png' });

    // Search finds them, including the Filipino word for bunting.
    await panel.getByLabel('Search graphics').fill('banderitas');
    await expect(page.getByTestId('graphic-results').locator('.gtile')).toHaveCount(8);
    await panel.getByLabel('Search graphics').fill('');

    const src = (loc: ReturnType<typeof page.locator>) => loc.locator('img').getAttribute('src');
    await panel.getByRole('button', { name: 'Triangle bunting (Rainbow)', exact: true }).click();
    const bunting = page.locator('.ph .el-graphic').last();
    await expect(inspectorTitle(page)).toHaveText('Triangle bunting');
    await expect.poll(() => bunting.locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    const s0 = await src(bunting);

    // Wider: re-drawn (more flags), not stretched.
    const e = (await page.locator('.hd.e').boundingBox())!;
    await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
    await page.mouse.down();
    await page.mouse.move(e.x + 100, e.y + e.height / 2, { steps: 5 });
    await page.mouse.up();
    const s1 = await src(bunting);
    expect(s1).not.toBe(s0);
    const flagCount = (s: string | null) => (decodeURIComponent(s ?? '').match(/<path d="M[^"]*Z"/g) ?? []).length;
    expect(flagCount(s1)).toBeGreaterThan(flagCount(s0));

    // Recolour.
    await page.getByRole('button', { name: 'Christmas', exact: true }).click();
    expect(decodeURIComponent((await src(bunting)) ?? '')).toContain('#c8102e');

    // Confetti: shuffle and amount.
    await panel.getByRole('button', { name: 'Confetti (Rainbow)', exact: true }).click();
    const confetti = page.locator('.ph .el-graphic').last();
    const c0 = await src(confetti);
    await page.getByRole('button', { name: 'Shuffle' }).click();
    const c1 = await src(confetti);
    expect(c1).not.toBe(c0);
    await page.locator('.insp').getByLabel('Amount').fill('2');
    await expect.poll(async () => decodeURIComponent((await src(confetti)) ?? '').length).toBeGreaterThan(decodeURIComponent(c1 ?? '').length * 1.4);

    // A small composition for the screenshot.
    await panel.getByRole('button', { name: 'Balloons (Pastel)', exact: true }).click();
    await panel.getByRole('button', { name: 'Scalloped frame (Pastel)', exact: true }).click();
    await panel.getByRole('button', { name: 'Leafy vine (Leaf)', exact: true }).click();
    await expect(page.locator('.ph .el-graphic')).toHaveCount(5);
    await page.screenshot({ path: 'e2e/shots/17-decorations.png' });

    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PNG' }).click();
    const fs = await import('node:fs');
    fs.copyFileSync((await (await dl).path())!, 'e2e/shots/18-decorations-export.png');
    expect(errors).toEqual([]);
  });

  test('illustration packs: open a pack, add rainbow, leaf, person and zodiac; recolour; search', async ({ page }) => {
    const errors = await openStudio(page);
    await chooseTemplate(page, 'Blank page');
    await page.getByRole('button', { name: 'Graphics', exact: true }).click();
    const panel = page.locator('.drawer');
    const art = page.locator('.ph .el-graphic');

    // All 21 pack cards, each with previews that load.
    const cards = panel.locator('.pack');
    await expect(cards).toHaveCount(21);
    for (const [id, n] of [['pack-animals', 24], ['pack-food', 24], ['pack-travel', 16], ['pack-camping', 18], ['pack-girl-power', 12], ['pack-pastel-ladies', 12], ['pack-duo', 12], ['pack-badges', 24], ['pack-fruits', 22], ['pack-love', 20]] as const)
      await expect(page.getByTestId(`pack-${id}`)).toContainText(`${n} graphics`);
    await expect(page.getByTestId('pack-pack-rainbows')).toContainText('Organic rainbows');
    await expect(page.getByTestId('pack-pack-people')).toContainText('24 graphics');
    await expect.poll(() => page.getByTestId('pack-pack-people').locator('img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await panel.screenshot({ path: 'e2e/shots/19-packs.png' });

    // Open a pack, add a rainbow and recolour it.
    await page.getByTestId('pack-pack-rainbows').click();
    await expect(page.getByTestId('graphic-cat-pack-rainbows').locator('.gtile')).toHaveCount(14);
    await panel.getByRole('button', { name: 'Rainbow with clouds (Boho)', exact: true }).click();
    await expect(inspectorTitle(page)).toHaveText('Rainbow with clouds');
    await page.getByRole('button', { name: 'Sage', exact: true }).click();
    expect(decodeURIComponent((await art.last().locator('img').getAttribute('src')) ?? '')).toContain('#7f9172');
    await panel.getByRole('button', { name: '← All graphics' }).click();

    // Leaves, people and zodiac.
    await page.getByTestId('pack-pack-leaves').click();
    await panel.getByRole('button', { name: 'Monstera leaf (Leaf)', exact: true }).click();
    await panel.getByRole('button', { name: '← All graphics' }).click();
    await page.getByTestId('pack-pack-people').click();
    await panel.getByRole('button', { name: 'Teacher with glasses', exact: true }).click();
    await expect(inspectorTitle(page)).toHaveText('Teacher with glasses');
    await expect.poll(() => art.last().locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await panel.getByRole('button', { name: '← All graphics' }).click();

    // Illustrated, people and badge packs add like any graphic.
    await page.getByTestId('pack-pack-animals').click();
    await panel.getByRole('button', { name: 'Sloth', exact: true }).click();
    await expect(inspectorTitle(page)).toHaveText('Sloth');
    await expect.poll(() => art.last().locator('img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await panel.getByRole('button', { name: '← All graphics' }).click();
    await page.getByTestId('pack-pack-badges').click();
    await panel.getByRole('button', { name: 'Trophy rosette (Gold)', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gold', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await panel.getByRole('button', { name: '← All graphics' }).click();
    await page.getByTestId('pack-pack-girl-power').click();
    await panel.getByRole('button', { name: 'Girl power, pointing up', exact: true }).click();
    await panel.getByRole('button', { name: '← All graphics' }).click();
    for (let i = 0; i < 3; i++) await page.keyboard.press('Control+z');

    // Search reaches inside packs (zodiac by name or month, flowers by Filipino name).
    await panel.getByLabel('Search graphics').fill('leo');
    await page.getByTestId('graphic-results').getByRole('button', { name: /^Leo \(Jul 23/ }).click();
    await panel.getByLabel('Search graphics').fill('gumamela');
    await expect(page.getByTestId('graphic-results').getByRole('button', { name: /^Gumamela \(/ })).toHaveCount(2);
    await panel.getByLabel('Search graphics').fill('');
    await expect(art).toHaveCount(4);

    // Lay them out so the screenshot shows each one.
    const place = async (i: number, x: number, y: number) => {
      await art.nth(i).click({ position: { x: 5, y: 5 }, force: true });
      await arrangeField(page, 'X').fill(inches(x));
      await arrangeField(page, 'Y').fill(inches(y));
    };
    await place(0, 40, 60);
    await place(1, 470, 60);
    await place(2, 60, 420);
    await place(3, 480, 460);
    await page.screenshot({ path: 'e2e/shots/20-packs-page.png' });
    expect(errors).toEqual([]);
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
    const errors = await openStudio(page);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PNG' }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toBe('calendar-2027-page-1.png');
    const path = await file.path();
    const fs = await import('node:fs');
    expect(fs.statSync(path).size).toBeGreaterThan(50_000);
    fs.copyFileSync(path, 'e2e/shots/08-export.png');
    expect(errors).toEqual([]);
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
  test('desk, wallpaper and mini 3x3 templates use their own page sizes', async ({ page }) => {
    const errors = await openStudio(page);
    const ratio = async () => {
      const b = (await page.locator('.ph .page').boundingBox())!;
      return b.width / b.height;
    };
    await chooseTemplate(page, 'Desk calendar 8×5 in');
    await expect(page.getByTestId('page-label')).toHaveText(/Page 1 of 12/);
    expect(await ratio()).toBeCloseTo(8 / 5, 1);
    await expect(page.locator('.ph .el-cal')).toHaveCount(1);
    await page.screenshot({ path: 'e2e/shots/30-desk.png' });

    await chooseTemplate(page, 'Desktop wallpaper');
    await expect(page.locator('.ph .cell[data-day="1"] .lbl')).toHaveText("New Year's Day");
    expect(await ratio()).toBeCloseTo(16 / 9, 1);
    await expect(page.locator('.ph [data-bg]')).toHaveCount(1);
    await page.screenshot({ path: 'e2e/shots/31-wallpaper.png' });

    await chooseTemplate(page, 'Mini 3×3 in');
    await expect(page.locator('.ph .cell[data-day="1"] .lbl')).toHaveText("New Year's Day");
    await expect(page.locator('.ph .cell[data-day="1"] .num')).toHaveCSS('color', 'rgb(226, 85, 127)');
    expect(await ratio()).toBeCloseTo(1, 2);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    // Square paper has no portrait/landscape choice.
    await expect(page.getByRole('button', { name: 'Landscape' })).toHaveCount(0);
    await page.screenshot({ path: 'e2e/shots/32-mini3.png' });
    expect(errors).toEqual([]);
  });

  test('custom paper size in inches and cm, printed at that size', async ({ page }) => {
    const errors = await openStudio(page);
    const box = () => page.locator('.ph .page').boundingBox().then((b) => b!);
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.getByLabel('Paper').selectOption('Custom');
    const w = page.getByLabel('Width (in)'), h = page.getByLabel('Height (in)');
    await expect(w).toHaveValue('8.27'); // starts from the A4 page it replaced
    await w.fill('3');
    await w.press('Enter');
    await h.fill('3');
    await h.press('Enter');
    let b = await box();
    expect(b.width / b.height).toBeCloseTo(1, 2);
    await expect(page.getByLabel('Paper')).toHaveValue('Custom');

    await w.fill('12');
    await w.press('Enter');
    b = await box();
    expect(b.width / b.height).toBeCloseTo(4, 1);
    await expect(page.getByRole('button', { name: 'Landscape' })).toHaveAttribute('aria-pressed', 'true');
    // Out of range sizes are refused and the field goes back.
    await w.fill('0.1');
    await w.press('Enter');
    await expect(w).toHaveValue('12');

    await page.getByLabel('Unit').selectOption('cm');
    await expect(page.getByLabel('Width (cm)')).toHaveValue('30.48');
    await page.getByRole('button', { name: 'Portrait' }).click();
    await expect(page.getByLabel('Width (cm)')).toHaveValue('7.62');
    await expect(page.getByLabel('Height (cm)')).toHaveValue('30.48');

    await page.getByRole('button', { name: 'Add blank page' }).click();
    await expect(page.getByLabel('Width (cm)')).toHaveValue('7.62');
    await page.screenshot({ path: 'e2e/shots/33-custom.png' });

    await page.evaluate(() => {
      window.print = () => void ((window as unknown as { __printed: boolean }).__printed = true);
    });
    await page.getByRole('button', { name: 'Print page' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed)).toBe(true);
    expect(await page.locator('#pagesize').textContent()).toContain('76.2mm 304.8mm');

    await page.reload();
    await expect(page.locator('.ph .page')).toBeVisible();
    b = await box();
    expect(b.height / b.width).toBeCloseTo(4, 1);
    expect(errors).toEqual([]);
  });
});
