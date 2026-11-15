import { test, expect } from '@playwright/test';

test.describe('Mob Control PWA - E2E', () => {
  test('loads the game page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Mob Control/i);
    await expect(page.locator('#count')).toBeVisible();
    await expect(page.locator('#status')).toBeVisible();
  });

  test('renders a canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });

  test('HUD shows initial mob count', async ({ page }) => {
    await page.goto('/');
    const count = page.locator('#count');
    await expect(count).toContainText(/Mobs:/i);
  });

  test('responds to pointer interaction', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await canvas.waitFor({ state: 'visible' });
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2);
    await page.mouse.up();
    await expect(page.locator('#count')).toBeVisible();
  });
});
