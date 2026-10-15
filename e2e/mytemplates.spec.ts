import { expect, test } from '@playwright/test';
import { chooseTemplate, openStudio } from './helpers';

test.describe('My templates', () => {
  test('built-in templates cannot be deleted; saved ones can, after a confirmation', async ({ page }) => {
    const errors = await openStudio(page);
    await page.getByRole('button', { name: 'Templates' }).click();
    const builtIn = page.getByTestId('built-in-templates');
    const mine = page.getByTestId('my-templates');
    await expect(builtIn.locator('.tpl')).not.toHaveCount(0);
    await expect(builtIn.getByRole('button', { name: /Delete/ })).toHaveCount(0);

    // Save the current design with a name.
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: 'Add a heading' }).click();
    await page.locator('.insp textarea').fill('Santos Family');
    await page.getByRole('button', { name: 'Templates' }).click();
    await mine.getByRole('button', { name: 'Save this design as a template' }).click();
    const save = page.getByTestId('save-template-modal');
    await expect(save).toBeVisible();
    await expect(save.getByLabel('Template name')).toBeFocused();
    await save.getByLabel('Template name').fill('Santos 2027');
    await page.screenshot({ path: 'e2e/shots/42-save-template.png' });
    await save.getByLabel('Template name').press('Enter');
    await expect(save).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Saved “Santos 2027”');
    const card = mine.locator('.mytpl', { hasText: 'Santos 2027' });
    await expect(card).toBeVisible();

    // It survives a reload and can replace another design.
    await page.reload();
    await page.getByRole('button', { name: 'Templates' }).click();
    await expect(card).toBeVisible();
    await chooseTemplate(page, 'Blank page');
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toHaveCount(0);
    await card.locator('.tpl').click();
    await mine.locator('.tpl[data-armed]').click();
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();

    // Delete asks first: Cancel, Escape and clicking outside all keep it.
    const del = page.getByTestId('delete-template-modal');
    await page.locator('.ph .tx', { hasText: 'Santos Family' }).click();
    await expect(page.getByTestId('insp-title')).not.toHaveText(/Page/);
    await card.getByRole('button', { name: 'Delete template Santos 2027' }).click();
    await expect(del).toContainText('Santos 2027');
    await expect(del.getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.screenshot({ path: 'e2e/shots/43-delete-template.png' });
    // Editor shortcuts are paused while the dialog is open.
    const before = await page.locator('.ph .page > .el').count();
    await page.keyboard.press('Delete');
    await expect(page.locator('.ph .page > .el')).toHaveCount(before);
    await del.getByRole('button', { name: 'Cancel' }).click();
    await expect(del).toHaveCount(0);
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Delete template/ }).click();
    await page.keyboard.press('Escape');
    await expect(del).toHaveCount(0);
    await card.getByRole('button', { name: /Delete template/ }).click();
    await page.locator('.modal-back').click({ position: { x: 5, y: 5 } });
    await expect(del).toHaveCount(0);
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Delete template/ }).click();
    await del.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(card).toHaveCount(0);
    await expect(page.locator('.toast')).toContainText('Deleted “Santos 2027”');
    // The calendar on screen is not affected, and the template stays gone after a reload.
    await expect(page.locator('.ph .tx', { hasText: 'Santos Family' })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Templates' }).click();
    await expect(mine.locator('.mytpl')).toHaveCount(0);
    await expect(builtIn.locator('.tpl', { hasText: 'Business · 2 months' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
