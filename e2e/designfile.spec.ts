import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { chooseTemplate, makePng, openStudio } from './helpers';

test.describe('Design file', () => {
  test('save a design with photos, replace it, open the file next year, undo', async ({ page }) => {
    const errors = await openStudio(page);
    // A design with an uploaded photo, a custom heading and year 2030.
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    const pick = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Upload photos' }).click();
    await (await pick).setFiles([{ name: 'family.png', mimeType: 'image/png', buffer: await makePng(page, '#264653') }]);
    await expect(page.getByTestId('tray').locator('.t')).toHaveCount(1);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add a heading' }).click();
    await page.locator('.insp textarea').fill('Santos Family');
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.locator('.drawer').getByLabel('Year', { exact: true }).fill('2030');
    await expect(page.getByTestId('design-file')).toBeVisible();
    await page.screenshot({ path: 'e2e/shots/36-design-file.png' });

    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save design file' }).click();
    const file = await dl;
    expect(file.suggestedFilename()).toBe('my-calendar-2030.kalendaryo');
    const path = await file.path();
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    expect(saved.app).toBe('kalendaryo-studio');
    expect(saved.doc.year).toBe(2030);
    expect(Object.values(saved.doc.assets as Record<string, { src: string }>)[0].src).toMatch(/^data:image\//);

    // Start over with a different template: the heading and photo are gone.
    await chooseTemplate(page, 'Blank page');
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toHaveCount(0);

    // Open the file: everything comes back, photos included.
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    const open = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open design file' }).click();
    await (await open).setFiles(path);
    await expect(page.locator('.toast')).toContainText('Opened');
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
    await expect(page.locator('.drawer').getByLabel('Year', { exact: true })).toHaveValue('2030');
    await expect(page.getByTestId('page-label')).toHaveText(/of 12/);
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    await expect(page.getByTestId('tray').locator('.t')).toHaveCount(1);

    // Next year: change the year and the calendar follows.
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    await page.locator('.drawer').getByLabel('Year', { exact: true }).fill('2031');
    await expect(page.getByTestId('page-label')).toHaveText(/January/);

    // Undo goes back past the open to the blank design.
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toHaveCount(0);

    // Opened designs autosave like any other.
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Ctrl+S saves and a wrong file is refused with a message', async ({ page }) => {
    const errors = await openStudio(page);
    const dl = page.waitForEvent('download');
    await page.keyboard.press('Control+s');
    expect((await dl).suggestedFilename()).toMatch(/^my-calendar-\d{4}\.kalendaryo$/);
    const dl2 = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save file', exact: true }).click();
    expect((await dl2).suggestedFilename()).toMatch(/\.kalendaryo$/);
    await expect(page.getByRole('button', { name: 'Open file', exact: true })).toBeVisible();

    const before = await page.locator('.ph .page > .el').count();
    await page.getByRole('button', { name: 'Pages', exact: true }).click();
    const open = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open design file' }).click();
    await (await open).setFiles([{ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') }]);
    await expect(page.locator('.toast')).toContainText('not a Kalendaryo design file');
    await expect(page.locator('.ph .page > .el')).toHaveCount(before);
    expect(errors).toEqual([]);
  });
});
