import { expect, test } from '@playwright/test';
import { chooseTemplate } from '../helpers';
import { cleanupUsers, cloudConfigured, deleteAllStats, newUser, setAccount, signIn } from './helpers';

test.skip(!cloudConfigured, 'needs the TEST Supabase project (.env.test.local)');
test.beforeAll(deleteAllStats);
test.afterAll(async () => {
  await deleteAllStats();
  await cleanupUsers();
});

test('what a visitor does shows up on the admin’s Stats page', async ({ page, browser }) => {
  // A visitor (not signed in) opens the editor, picks a template, saves a PNG and opens the Print Kit.
  const visitor = await browser.newPage();
  await visitor.addInitScript(() => {
    window.__KS_COUNT__ = true;
    window.__KS_SUPPORT__ = { designServiceUrl: 'https://m.me/example' };
  });
  await visitor.goto('/');
  await expect(visitor.locator('.ph .page')).toBeVisible();
  await chooseTemplate(visitor, 'Business · 2 months');
  const dl = visitor.waitForEvent('download');
  await visitor.getByRole('button', { name: 'PNG' }).click();
  await dl;
  await visitor.getByRole('button', { name: 'Print Kit', exact: true }).click();
  await expect(visitor.getByTestId('design-service')).toBeVisible();
  const popup = visitor.waitForEvent('popup');
  await visitor.getByTestId('design-service').getByRole('link', { name: 'Message me' }).click();
  await (await popup).close();
  // Opening the editor again in the same tab session isn't another visit.
  await visitor.reload();
  await expect(visitor.locator('.ph .page')).toBeVisible();

  const boss = await newUser('Boss');
  await setAccount(boss.id, { admin: true });
  await signIn(page, boss);
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Stats' }).click();
  await expect(page).toHaveURL(/\/admin\/stats$/);
  const row = (label: string) => page.locator(`tr[data-label="${label}"] td`);
  // The admin's own sign-in isn't counted: that browser has no __KS_COUNT__.
  await expect(row('Opened the editor').nth(1)).toHaveText('1');
  await expect(row('Saved a PNG').nth(1)).toHaveText('1');
  await expect(row('Opened the Print Kit').nth(1)).toHaveText('1');
  await expect(row('Tapped “Message me” (design service)').nth(1)).toHaveText('1');
  await expect(row('Business · 2 months').nth(3)).toHaveText('1');
  await expect(page.getByTestId('stats-insight')).toContainText('Visits: 1 · Prints and PNGs: 1 (100% of visits)');
  await page.screenshot({ path: 'e2e/shots/49-admin-stats.png', fullPage: true });
  await visitor.close();
});
