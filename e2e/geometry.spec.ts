import { expect, type Page, test } from '@playwright/test';
import { type ArrangeName, arrangeField, openStudio, PX_PER_IN, readPx } from './helpers';

const field = (page: Page, name: ArrangeName) => arrangeField(page, name);
/** A CSS length on the selection box, in px. */
const css = (page: Page, prop: 'width' | 'height' | 'left' | 'top') =>
  page.getByTestId('selection').evaluate((n, k) => parseFloat(getComputedStyle(n)[k]), prop);

/** Replaces a field's text one key at a time, the way a person types. */
async function typeInto(page: Page, label: ArrangeName, text: string) {
  await field(page, label).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text);
}

/** Drags from the centre of `selector` by (dx, dy) screen px. */
async function dragBy(page: Page, selector: string, dx: number, dy: number) {
  const b = (await page.locator(selector).boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** Height of the text itself, in page px, measured without the box's fixed height. */
const textHeight = (page: Page) =>
  page.locator('.ph .page > .el-text').last().evaluate((n) => {
    const tx = n.querySelector<HTMLElement>('.tx')!;
    tx.style.height = 'auto';
    const h = tx.offsetHeight;
    tx.style.height = '';
    return h;
  });

test.describe('size and position', () => {
  test('number fields accept values typed key by key', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Square' }).click();
    const box = page.getByTestId('selection');

    // "0" and "0." alone are below the minimum size, but must not stop "0.5" from being typed.
    await typeInto(page, 'Width', '0.5');
    await expect(field(page, 'Width')).toHaveValue('0.5');
    await expect.poll(() => css(page, 'width')).toBeCloseTo(0.5 * PX_PER_IN, 1);

    await typeInto(page, 'Height', '3.5');
    await expect(field(page, 'Height')).toHaveValue('3.5');
    await expect.poll(() => css(page, 'height')).toBeCloseTo(3.5 * PX_PER_IN, 1);

    await typeInto(page, 'X', '-0.2');
    await expect.poll(() => css(page, 'left')).toBeCloseTo(-0.2 * PX_PER_IN, 1);

    // An empty field leaves the element where it is, and shows its real value again on leaving.
    const top = await box.evaluate((n) => n.style.top);
    await field(page, 'Y').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await expect(box).toHaveCSS('top', top);
    await field(page, 'X').click();
    await expect(field(page, 'Y')).toHaveValue(String(Math.round((parseFloat(top) / PX_PER_IN) * 100) / 100));

    // The new size is a single undo step.
    await typeInto(page, 'Width', '1.25');
    await page.locator('.stage').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ControlOrMeta+z');
    await page.locator('.ph .el-shape').last().click();
    await expect(field(page, 'Width')).toHaveValue('0.5');
  });

  test('a text box is always at least as tall as its text', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add a heading' }).click();
    const box = page.getByTestId('selection');
    const h = () => readPx(page, 'Height');

    // Typing a height smaller than the text.
    await field(page, 'Height').fill('0.2');
    await expect.poll(h).toBeGreaterThanOrEqual(await textHeight(page));

    // Dragging the bottom handle up past the text.
    await dragBy(page, '.hd.s', 0, -200);
    await expect.poll(h).toBeGreaterThanOrEqual(await textHeight(page));
    const top0 = await box.evaluate((n) => parseFloat(n.style.top));

    // Dragging the top handle down past the text keeps the bottom edge in place.
    const bottom = top0 + (await h());
    await dragBy(page, '.hd.n', 0, 200);
    await expect.poll(h).toBeGreaterThanOrEqual(await textHeight(page));
    const top1 = await box.evaluate((n) => parseFloat(n.style.top));
    expect(Math.abs(top1 + (await h()) - bottom)).toBeLessThanOrEqual(1.5);

    // Narrowing the box wraps the text onto more lines; the box grows with it.
    await dragBy(page, '.hd.e', -250, 0);
    await expect.poll(h).toBeGreaterThanOrEqual(await textHeight(page));
    expect(Math.abs((await css(page, 'height')) - (await h()))).toBeLessThan(1);
  });

  test('an element dragged far off the page stays partly on it', async ({ page }) => {
    await openStudio(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Square' }).click();
    const pg = (await page.locator('.ph .page').boundingBox())!;
    await dragBy(page, '[data-testid=selection]', -pg.width * 2, -pg.height * 2);
    const pageW = await page.locator('.ph .page').evaluate((n) => (n as HTMLElement).offsetWidth);
    const x = await readPx(page, 'X'), y = await readPx(page, 'Y');
    const w = await readPx(page, 'Width'), hh = await readPx(page, 'Height');
    expect(x + w).toBeGreaterThan(0);
    expect(y + hh).toBeGreaterThan(0);
    // ...and can still be grabbed and brought back.
    await dragBy(page, '[data-testid=selection]', pg.width * 3, pg.height * 3);
    expect(await readPx(page, 'X')).toBeLessThan(pageW);
    await page.screenshot({ path: 'e2e/shots/46-offpage.png' });
  });
});
