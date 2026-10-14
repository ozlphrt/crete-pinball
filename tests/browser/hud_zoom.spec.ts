import { test, expect } from '@playwright/test';

test.describe('HUD Dynamic Zoom Toggle Button', () => {
  test('renders magnifier zoom button with default state OFF, and toggles cleanly', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');

    const zoomBtn = page.locator('#hud-zoom-btn');
    await expect(zoomBtn).toBeVisible({ timeout: 10000 });

    // Verify SVG icon exists inside button
    const svgIcon = zoomBtn.locator('svg');
    await expect(svgIcon).toBeVisible();

    // Default state must be strictly OFF
    await expect(zoomBtn).not.toHaveClass(/active/);

    // Click to enable dynamic zoom
    await zoomBtn.click();
    await expect(zoomBtn).toHaveClass(/active/);
    await expect(zoomBtn).toHaveAttribute('aria-pressed', 'true');

    // Wait 1 second to let dynamic zoom run smoothly
    await page.waitForTimeout(1000);

    // Click again to disable dynamic zoom
    await zoomBtn.click();
    await expect(zoomBtn).not.toHaveClass(/active/);
    await expect(zoomBtn).toHaveAttribute('aria-pressed', 'false');

    // Canvas remains fully visible and error-free
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    expect(errorLogs).toEqual([]);
  });
});
