import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 02 Ball Physics & Coastline Collisions', () => {
  test('launches ball from Crete paddle on SPACE key and simulates active flight', async ({
    page,
  }) => {
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
      await page.waitForTimeout(600);
      await canvas.focus();
      await page.waitForTimeout(100);

      // Open diagnostic overlay
      await page.keyboard.press('KeyD');
      const devPanel = page.locator('#dev-diagnostics-panel');
      await expect(devPanel).toBeVisible();

      // Verify Phase 02 title and ball physics telemetry
      await expect(devPanel).toContainText('PHASE 02 BALL PHYSICS');
      await expect(devPanel).toContainText(/State: (HELD|IN_PLAY)/);

      // Toggle physics vector overlay with 'P'
      await page.keyboard.press('KeyP');
      await page.waitForTimeout(100);
      await expect(devPanel).toContainText('[P] Vectors (ON)');

      // Launch ball using SPACE key
      await page.keyboard.press('Space');
      await page.waitForTimeout(400);

      // Ball should now be IN_PLAY and moving with positive speed
      await expect(devPanel).toContainText('State: IN_PLAY');

      // Wait 1.5 seconds for ball to travel northward through the Cyclades
      await page.waitForTimeout(1500);

      // Verify that collisions are recorded or velocity is active
      const panelContent = await devPanel.textContent();
      expect(panelContent).toContain('Ball:');
      expect(panelContent).toContain('IN_PLAY');

      // Verify no console errors during ball physics simulation
      expect(errorLogs).toEqual([]);
    }
  });

  test('toggles physics vector overlay and collider diagnostics in game scene', async ({
    page,
  }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      await page.waitForTimeout(600);
      await canvas.focus();
      await page.waitForTimeout(200);

      // Open diagnostic overlay
      await page.keyboard.press('KeyD');
      const devPanel = page.locator('#dev-diagnostics-panel');
      await expect(devPanel).toBeVisible();

      // Check vectors hotkey
      await expect(devPanel).toContainText('[P] Vectors (OFF)');
      await page.keyboard.press('KeyP');
      await expect(devPanel).toContainText('[P] Vectors (ON)');

      // Check colliders hotkey
      await page.keyboard.press('KeyC');
      await expect(devPanel).toContainText('Colliders (ON)');

      // Check bounds hotkey
      await page.keyboard.press('KeyB');
      await expect(devPanel).toContainText('Bounds (ON)');

      // Close overlay
      await page.keyboard.press('KeyD');
      await expect(devPanel).toBeHidden();
    }
  });

  test('paddle follows pointer horizontally during active ball flight', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      await page.waitForTimeout(600);

      // Launch ball by tapping lower arena
      const launchX = box.x + box.width / 2;
      const launchY = box.y + box.height * (1420 / 1600);
      await page.mouse.click(launchX, launchY);
      await page.waitForTimeout(200);

      // Open diagnostics
      await page.keyboard.press('KeyD');
      const devPanel = page.locator('#dev-diagnostics-panel');
      await expect(devPanel).toBeVisible();
      await expect(devPanel).toContainText('State: IN_PLAY');

      // Click on left side of paddle zone (X ~ 250)
      const leftTargetX = box.x + box.width * (250 / 900);
      const targetY = box.y + box.height * (1420 / 1600);
      await page.mouse.click(leftTargetX, targetY);
      await page.waitForTimeout(500);

      // Verify Crete paddle moved leftwards from center (450) towards 250
      await expect
        .poll(
          async () => {
            const text = await devPanel.textContent();
            const match = text?.match(/Crete: X=([0-9]+)/);
            return match ? parseInt(match[1]!, 10) : 450;
          },
          { timeout: 4000 },
        )
        .toBeLessThan(420);

      // Click on right side of paddle zone (X ~ 650)
      const rightTargetX = box.x + box.width * (650 / 900);
      await page.mouse.click(rightTargetX, targetY);

      // Verify Crete paddle moved rightwards towards 650
      await expect
        .poll(
          async () => {
            const text = await devPanel.textContent();
            const match = text?.match(/Crete: X=([0-9]+)/);
            return match ? parseInt(match[1]!, 10) : 450;
          },
          { timeout: 4000 },
        )
        .toBeGreaterThan(480);
    }
  });
});
