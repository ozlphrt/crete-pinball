import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 01 Aegean Geography & Crete Movement', () => {
  test('navigates to ExploreScene and returns to GamePlaceholderScene', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Transition to ExploreScene
      await page.evaluate(() => {
        const game = (window as unknown as { game: { scene: { start: (key: string) => void } } })
          .game;
        game.scene.start('ExploreScene');
      });
      await page.waitForTimeout(600);

      // We should now be in ExploreScene. Click back button at top-left:
      // X = 100 (~6.25%), Y = 45 (~2.8%)
      const backX = box.x + box.width * (100 / 900);
      const backY = box.y + box.height * (45 / 1600);
      await page.mouse.click(backX, backY);
      await page.waitForTimeout(600);

      // Verify canvas is healthy and no errors occurred
      await expect(canvas).toBeVisible();
      expect(errorLogs).toEqual([]);
    }
  });

  test('toggles diagnostic overlay and displays authentic geography telemetry', async ({
    page,
  }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      await page.waitForTimeout(600);
      await canvas.click({ position: { x: 10, y: 10 } });

      // Diagnostic overlay is initially hidden
      const devPanel = page.locator('#dev-diagnostics-panel');
      await expect(devPanel).toBeHidden();

      // Press 'D' to toggle diagnostics
      await page.keyboard.press('KeyD');
      await expect(devPanel).toBeVisible();

      // Verify dev panel contains authentic Phase 01 telemetry
      await expect(devPanel).toContainText('PHASE 01 GEOGRAPHY');
      await expect(devPanel).toContainText('Crete: X=');
      await expect(devPanel).toContainText('Islands:');

      // Test hotkeys C, B, L to toggle debug layers
      await page.keyboard.press('KeyC');
      await page.waitForTimeout(100);
      await expect(devPanel).toContainText('Colliders (ON)');

      await page.keyboard.press('KeyB');
      await page.waitForTimeout(100);
      await expect(devPanel).toContainText('Bounds (ON)');

      await page.keyboard.press('KeyL');
      await page.waitForTimeout(100);
      await expect(devPanel).toContainText('Labels (ON)');

      // Toggle 'D' again to hide
      await page.keyboard.press('KeyD');
      await expect(devPanel).toBeHidden();
    }
  });

  test('drags Crete paddle horizontally across lower control zone', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      await page.waitForTimeout(600);

      // Open dev panel to inspect Crete paddle X coordinate
      await page.keyboard.press('KeyD');
      const devPanel = page.locator('#dev-diagnostics-panel');
      await expect(devPanel).toBeVisible();

      // Initial center position oscillates discovery wave around X=450 [400..500]
      await expect(devPanel).toContainText(/Crete: X=4\d\d/);

      // Click in lower control zone (Y = 1200 / 1600 ~ 75%) to the left (X = 280)
      const targetLocalX = box.width * (280 / 900);
      const targetLocalY = box.height * (1200 / 1600);
      await page.mouse.click(box.x + targetLocalX, box.y + targetLocalY);

      // In addition, test keyboard left arrow to ensure dual-input support
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');

      // Verify Crete paddle moved to the left (target ~280 or moved left via arrow keys)
      await expect
        .poll(
          async () => {
            const text = await devPanel.textContent();
            const match = text?.match(/Crete: X=([0-9]+)/);
            return match ? parseInt(match[1]!, 10) : 450;
          },
          { timeout: 4000 },
        )
        .toBeLessThan(440);
    }
  });
});
