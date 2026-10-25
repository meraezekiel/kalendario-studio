import { expect, test } from '@playwright/test';
import { openStudio, readPx } from './helpers';

const pct = async (page: import('@playwright/test').Page) => parseInt((await page.getByTestId('zoom-pct').textContent()) ?? '0', 10);

test.describe('zoom', () => {
  test('buttons zoom in and out, the zoomed page scrolls to every edge, and Fit shows the whole page again', async ({ page }) => {
    const errors = await openStudio(page);
    const scaler = page.locator('.scaler');
    const stage = page.getByTestId('stage');
    const fitBtn = page.getByTestId('zoombar').getByRole('button', { name: 'Fit' });
    await expect(fitBtn).toBeDisabled();
    const p0 = await pct(page);
    const w0 = (await scaler.boundingBox())!.width;

    for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
    const p1 = await pct(page);
    expect(p1).toBeGreaterThan(p0 * 2);
    expect((await scaler.boundingBox())!.width).toBeGreaterThan(w0 * 2);
    await expect(fitBtn).toBeEnabled();

    // Wider than the stage: it scrolls, and scrolled fully left the page's left edge is in view.
    const sizes = await stage.evaluate((s) => ({ sw: s.scrollWidth, cw: s.clientWidth }));
    expect(sizes.sw).toBeGreaterThan(sizes.cw);
    await stage.evaluate((s) => { s.scrollLeft = 0; });
    const sb = (await stage.boundingBox())!, pb = (await scaler.boundingBox())!;
    expect(pb.x).toBeGreaterThanOrEqual(sb.x - 1);

    await page.getByRole('button', { name: 'Zoom out' }).click();
    expect(await pct(page)).toBeLessThan(p1);

    await fitBtn.click();
    expect(await pct(page)).toBe(p0);
    expect(Math.abs((await scaler.boundingBox())!.width - w0)).toBeLessThan(1);
    expect(errors).toEqual([]);
  });

  test('Ctrl + plus, minus and 0 zoom from the keyboard', async ({ page }) => {
    await openStudio(page);
    const p0 = await pct(page);
    await page.keyboard.press('Control+=');
    const p1 = await pct(page);
    expect(p1).toBeGreaterThan(p0);
    await page.keyboard.press('Control+-');
    await page.keyboard.press('Control+-');
    expect(await pct(page)).toBeLessThan(p0);
    await page.keyboard.press('Control+0');
    expect(await pct(page)).toBe(p0);
  });

  test('Ctrl + wheel zooms around the cursor', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Star' }).click();
    const star = page.locator('.ph .el-shape').last();
    const b = (await star.boundingBox())!;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const p0 = await pct(page);
    await page.mouse.move(cx, cy);
    await page.keyboard.down('Control');
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -40);
    await page.keyboard.up('Control');
    await expect.poll(() => pct(page)).toBeGreaterThan(p0);
    const a = (await star.boundingBox())!;
    expect(a.width).toBeGreaterThan(b.width);
    expect(Math.abs(a.x + a.width / 2 - cx)).toBeLessThan(6);
    expect(Math.abs(a.y + a.height / 2 - cy)).toBeLessThan(6);
  });

  test('dragging while zoomed moves the element by the right amount on the page', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Star' }).click();
    const star = page.locator('.ph .el-shape').last();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Zoom in' }).click();
    const scale = (await pct(page)) / 100;
    await star.scrollIntoViewIfNeeded();
    const x0 = await readPx(page, 'X');
    const b = (await star.boundingBox())!;
    // Alt turns snapping off, so the move is exact.
    await page.keyboard.down('Alt');
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const moved = (await readPx(page, 'X')) - x0;
    expect(Math.abs(moved - 120 / scale)).toBeLessThan(3);
  });
});
