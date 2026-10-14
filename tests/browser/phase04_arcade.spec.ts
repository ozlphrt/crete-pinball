import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 04 Advanced Arcade Mechanics', () => {
  test('opens developer tuning panel, triggers power bounce, multiball, weather, and slow motion', async ({
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

    // Open Developer Tuning Panel with 'T' key
    await page.keyboard.press('KeyT');
    const tuningPanel = page.locator('#physics-tuning-panel');
    await expect(tuningPanel).toBeVisible({ timeout: 5000 });

    // Verify Tuning Panel contents
    await expect(tuningPanel).toContainText('Physics & Arcade Tuning');
    await expect(tuningPanel).toContainText('Crete Power Bounce');
    await expect(tuningPanel).toContainText('Multiball System');
    await expect(tuningPanel).toContainText('Aegean Weather Director');
    await expect(tuningPanel).toContainText('Cinematic Slow Motion');

    // Test Arm Power Bounce button
    const btnArmPower = page.locator('#btn-arm-power');
    await expect(btnArmPower).toBeVisible();
    await btnArmPower.click({ force: true });
    await page.waitForTimeout(300);

    // Test Spawn 3-Ball Multiball button
    const btnMultiball = page.locator('#btn-trigger-multiball');
    await expect(btnMultiball).toBeVisible();
    await btnMultiball.click({ force: true });
    await page.waitForTimeout(300);

    // Test Meltemi Weather trigger
    const btnMeltemi = page.locator('#btn-weather-meltemi');
    await expect(btnMeltemi).toBeVisible();
    await btnMeltemi.click({ force: true });
    await page.waitForTimeout(300);

    // Test Slow Motion trigger
    const btnSlowMo = page.locator('#btn-trigger-slowmo');
    await expect(btnSlowMo).toBeVisible();
    await btnSlowMo.click({ force: true });
    await page.waitForTimeout(500);

    // Close tuning panel with 'T' key
    await page.keyboard.press('KeyT');
    await expect(tuningPanel).not.toBeVisible();

    // Verify simulation runs without errors for 2 seconds
    await page.waitForTimeout(2000);

    // Ensure zero runtime errors
    expect(errorLogs).toEqual([]);
  });
});
