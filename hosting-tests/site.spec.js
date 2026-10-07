import { test, expect } from '@playwright/test';

test('production assets, exploration, and home navigation work under a hosting subpath', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto('./');
  await expect(page).toHaveTitle('Apple Atlas — A world within');
  const canvas = page.locator('#world');
  await expect(canvas).toHaveAttribute('data-rendered-mode', 'fruit');
  await expect(page.locator('#error')).toBeHidden();
  await page.getByRole('button', { name: 'Enter the apple' }).click();
  await expect.poll(async () => {
    const p = (await canvas.getAttribute('data-camera')).split(',').map(Number);
    return Math.hypot(p[0], p[1] - .1, p[2] + .65);
  }, { timeout: 15000 }).toBeLessThan(.1);
  await page.getByRole('button', { name: '02 Cell' }).click();
  await expect(canvas).toHaveAttribute('data-rendered-mode', 'cell');
  await page.getByRole('button', { name: '03 Molecule' }).click();
  await expect(canvas).toHaveAttribute('data-rendered-mode', 'molecule');

  await page.getByRole('link', { name: 'Apple Atlas home' }).click();
  await expect(page).toHaveURL(/\/virtualworld\/$/);
  await expect(canvas).toHaveAttribute('data-rendered-mode', 'fruit');
  expect(errors).toEqual([]);
});
