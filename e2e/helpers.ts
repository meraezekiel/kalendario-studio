import { expect, type Page } from '@playwright/test';

/** Opens the editor and waits until fonts and the first page are ready; fails on any runtime error. */
export async function openStudio(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /fonts\.(googleapis|gstatic)/.test(m.text())) return;
    // Network hiccups loading external resources (Google Fonts) are not app errors.
    const from = m.location().url;
    if (/^Failed to load resource/.test(m.text()) && from && !from.startsWith(new URL(page.url()).origin)) return;
    errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.locator('.ph .page')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  return errors;
}

export const stageEls = (page: Page) => page.locator('.ph .page > .el');
export const inspectorTitle = (page: Page) => page.getByTestId('insp-title');

/** A small solid-colour PNG generated in the browser. */
export async function makePng(page: Page, color = '#2a9d8f', w = 320, h = 200): Promise<Buffer> {
  const b64 = await page.evaluate(
    ([c, w, h]) => {
      const cv = document.createElement('canvas');
      cv.width = +w;
      cv.height = +h;
      const g = cv.getContext('2d')!;
      g.fillStyle = String(c);
      g.fillRect(0, 0, +w, +h);
      g.fillStyle = '#fff';
      g.fillRect(+w / 4, +h / 4, +w / 2, +h / 2);
      return cv.toDataURL('image/png').split(',')[1];
    },
    [color, w, h] as const,
  );
  return Buffer.from(b64, 'base64');
}

/** Clicks a template card twice (the second click confirms replacing the calendar). */
export async function chooseTemplate(page: Page, name: string) {
  await page.getByRole('button', { name: 'Templates' }).click();
  const card = page.locator('.tpl', { hasText: name });
  await card.click();
  await expect(page.locator('.tpl[data-armed]')).toHaveCount(1);
  await page.locator('.tpl[data-armed]').click();
}

/** Design px per inch on an A4 page (794 px across 210 mm). The X/Y/Width/Height fields show inches. */
export const PX_PER_IN = 794 / (210 / 25.4);
export type ArrangeName = 'X' | 'Y' | 'Width' | 'Height';
export const arrangeField = (page: Page, name: ArrangeName) => page.getByLabel(`${name} (in)`, { exact: true });
/** An arrange field's value converted back to page px (to within the 2-decimal rounding, about half a px). */
export const readPx = async (page: Page, name: ArrangeName) => +(await arrangeField(page, name).inputValue()) * PX_PER_IN;
/** Page px as the inches text a person would type. */
export const inches = (px: number) => String(+(px / PX_PER_IN).toFixed(2));
