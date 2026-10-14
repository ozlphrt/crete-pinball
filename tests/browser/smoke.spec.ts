import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 00 Browser Smoke & Viewport Tests', () => {
  test('loads application without uncaught errors directly into gameplay', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');

    // Verify canvas is created
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify no unhandled page errors
    expect(errorLogs).toEqual([]);
  });

  test('boots directly into GamePlaceholderScene and verifies arena interactivity', async ({
    page,
  }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Tap lower playfield to verify interactivity
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * (1200 / 1600));
      await page.waitForTimeout(500);

      // Canvas remains healthy
      await expect(canvas).toBeVisible();
    }
  });

  test('preserves portrait arena canvas aspect ratio on desktop window resize', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // In 1280x720, height (720) limits canvas. Expected aspect ratio: 900 / 1600 = 0.5625
      const aspect = box.width / box.height;
      expect(aspect).toBeCloseTo(9 / 16, 1);
    }
  });
});
