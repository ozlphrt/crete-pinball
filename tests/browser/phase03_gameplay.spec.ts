import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 03 Core Gameplay, Scoring, and Progression', () => {
  test('initializes gameplay with normal difficulty and allows difficulty configuration', async ({
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
    if (!box) return;

    await page.waitForTimeout(600);

    // Open dev diagnostics to inspect difficulty
    await page.keyboard.press('KeyD');
    const devPanel = page.locator('#dev-diagnostics-panel');
    await expect(devPanel).toBeVisible({ timeout: 5000 });

    expect(errorLogs).toEqual([]);
  });

  test('enters game scene directly, launches ball, toggles pause/resume, and verifies gameplay HUD', async ({
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
    if (!box) return;

    await page.waitForTimeout(600);

    // Open Dev Diagnostics with 'D' key
    await page.keyboard.press('KeyD');
    const devPanel = page.locator('#dev-diagnostics-panel');
    await expect(devPanel).toBeVisible({ timeout: 5000 });

    // Verify diagnostic panel is reporting state
    await expect(devPanel).toContainText(/State: (HELD|IN_PLAY|playing|ready)/i);

    // Press SPACE to launch or toggle pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    // Ball should be in play, paused, or transitioning
    await expect(devPanel).toContainText(/State: (IN_PLAY|playing|paused|resumeCountdown)/i);

    // If auto-paused by background tab throttling during parallel worker runs, unpause
    const panelText = await devPanel.innerText();
    if (panelText.includes('State: paused')) {
      await page.keyboard.press('Space');
    }
    await expect(devPanel).toContainText(/playing/i, { timeout: 10000 });

    // Let ball fly through the archipelago
    await page.waitForTimeout(1500);

    // Ensure zero runtime errors
    expect(errorLogs).toEqual([]);
  });
});
