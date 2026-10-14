import { test, expect } from '@playwright/test';

test.describe('HUD Dynamic Zoom and Crete Offscreen Indicator', () => {
  test('renders magnifier zoom button enabled by default, toggles cleanly, and provides offscreen Crete indicator', async ({ page }) => {
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

    // Default state is ON (active)
    await expect(zoomBtn).toHaveClass(/active/);
    await expect(zoomBtn).toHaveAttribute('aria-pressed', 'true');

    // Verify offscreen Crete indicator exists in DOM with label and arrow
    const creteIndicator = page.locator('#hud-crete-indicator');
    await expect(creteIndicator).toBeAttached();
    const creteLabel = page.locator('#hud-crete-label');
    await expect(creteLabel).toHaveText(/CRETE|GİRİT|ΚΡΗΤΗ/);

    // Click to toggle dynamic zoom OFF
    await zoomBtn.click();
    await expect(zoomBtn).not.toHaveClass(/active/);
    await expect(zoomBtn).toHaveAttribute('aria-pressed', 'false');

    // Wait briefly
    await page.waitForTimeout(600);

    // Click again to re-enable dynamic zoom
    await zoomBtn.click();
    await expect(zoomBtn).toHaveClass(/active/);
    await expect(zoomBtn).toHaveAttribute('aria-pressed', 'true');

    // Canvas remains fully visible and error-free
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    expect(errorLogs).toEqual([]);
  });

  test('displays Crete indicator when ball is in northern waters and camera zooms north', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // Launch ball from northern spawn
    await page.keyboard.press('Space');
    // Move Crete paddle to the right so we can verify tracking
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(50);
    }

    // Wait 1.8 seconds for the camera to zoom into the northern active ball
    await page.waitForTimeout(1800);

    const creteIndicator = page.locator('#hud-crete-indicator');
    await expect(creteIndicator).toBeVisible({ timeout: 5000 });

    // Capture screenshot showing zoom and Crete indicator
    const projectName = test.info().project.name;
    const filename = projectName.includes('Mobile')
      ? 'zoom_default_crete_indicator_mobile.png'
      : 'zoom_default_crete_indicator.png';

    await page.screenshot({
      path: `C:/Users/ozalp/.gemini/antigravity-ide/brain/6cde20b9-3b91-4453-a110-b602f8618cb6/${filename}`,
      fullPage: true,
    });
  });
});
