import { expect, type Page, test } from '@playwright/test';
import { openStudio } from './helpers';

/** Previews the support settings (normally src/lib/support/config.ts). */
const preview = (page: Page, cfg: object) => page.addInitScript((c) => void (window.__KS_SUPPORT__ = c), cfg);

test.describe('Order prints', () => {
  test('fill in the order, save the design file, then copy the order and open the shop’s Messenger', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await preview(page, { printShop: 'JM Craftworks', printShopPlace: 'EB Magalona', printOrderUrl: 'https://m.me/example' });
    const errors = await openStudio(page);

    await page.getByTestId('order-prints').click();
    const dialog = page.getByTestId('order-dialog');
    await expect(dialog.getByRole('heading')).toHaveText('Order prints from JM Craftworks');
    await expect(dialog).toContainText('JM Craftworks (EB Magalona) prints your calendar for you.');

    // Name and contact are needed; the address only for delivery.
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Please add your name.');
    await dialog.getByLabel('Copies').fill('25');
    await dialog.getByLabel('Your name').fill('Ana Cruz');
    await dialog.getByLabel('Contact number').fill('0917 123 4567');
    await dialog.getByLabel('Get it by').selectOption('delivery');
    await dialog.getByRole('button', { name: 'Next' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Please add the delivery address.');
    await dialog.getByLabel('Delivery address').fill('Brgy. 1, EB Magalona');
    await dialog.getByLabel('Notes (optional)').fill('Needed by Dec 15');
    await page.screenshot({ path: 'e2e/shots/51-order-form.png' });
    await dialog.getByRole('button', { name: 'Next' }).click();

    await expect(dialog.getByRole('heading')).toHaveText('Send your order');
    const text = dialog.getByTestId('order-text');
    await expect(text).toHaveValue(/^Hi JM Craftworks! I'd like to order printed calendars\./);
    for (const line of ['Copies: 25', 'Pickup or delivery: Delivery', 'Name: Ana Cruz', 'Contact number: 0917 123 4567', 'Address: Brgy. 1, EB Magalona', 'Notes: Needed by Dec 15']) {
      await expect(text).toHaveValue(new RegExp(`\n${line}\n`));
    }
    await expect(text).toHaveValue(/\nDesign: .+ · \d+ pages · \d{4}\n/);

    const dl = page.waitForEvent('download');
    await dialog.getByTestId('order-save-file').click();
    const file = (await dl).suggestedFilename();
    expect(file).toMatch(/\.kalendaryo$/);
    await expect(text).toHaveValue(new RegExp(`Design file: ${file.replace('.', '\\.')} \\(attached\\)`));
    await expect(dialog.getByTestId('order-save-file')).toContainText('✓ Saved');

    const send = dialog.getByTestId('order-send');
    await expect(send).toHaveAttribute('href', 'https://m.me/example');
    await expect(send).toHaveAttribute('target', '_blank');
    // Opening Messenger itself is left out: the test only checks the order was copied.
    await send.evaluate((a) => a.addEventListener('click', (e) => e.preventDefault()));
    await send.click();
    await expect(send).toContainText('✓ Order copied');
    // Windows hands back the copied lines with \r\n endings.
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.replace(/\r\n/g, '\n')).toBe(await text.inputValue());
    await page.screenshot({ path: 'e2e/shots/52-order-send.png' });

    // Back keeps what was typed; Done closes.
    await dialog.getByRole('button', { name: 'Back' }).click();
    await expect(dialog.getByLabel('Your name')).toHaveValue('Ana Cruz');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('the Print Kit offers it too', async ({ page }) => {
    await preview(page, { printShop: 'JM Craftworks', printOrderUrl: 'https://m.me/example', products: [] });
    await openStudio(page);
    await page.getByRole('button', { name: 'Print Kit', exact: true }).click();
    await page.getByTestId('kit-order').getByRole('button', { name: 'Order prints' }).click();
    await expect(page.getByTestId('order-dialog')).toBeVisible();
  });
});
