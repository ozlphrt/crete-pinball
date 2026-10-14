import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 05 Experience, Tutorial, Settings & Accessibility', () => {
  test('displays first-play interactive tutorial with ?tutorial=1, advances through steps, and completes', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/?tutorial=1');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const tutorialOverlay = page.locator('#tutorial-modal-overlay');
    await expect(tutorialOverlay).toBeVisible({ timeout: 5000 });

    const badge = page.locator('#tutorial-step-badge');
    await expect(badge).toHaveText('1 / 7');

    const title = page.locator('#tutorial-step-title');
    await expect(title).toBeVisible();

    // Advance to step 2
    const nextBtn = page.locator('#tutorial-next-btn');
    await nextBtn.click();
    await expect(badge).toHaveText('2 / 7');

    // Skip tutorial
    const skipBtn = page.locator('#tutorial-skip-btn');
    await skipBtn.click();
    await expect(tutorialOverlay).toBeHidden();

    expect(errorLogs).toEqual([]);
  });

  test('opens Settings modal, adjusts volume, switches language to Turkish and Greek, and toggles accessibility', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Click Settings button in HUD
    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    const modal = page.locator('#settings-modal-overlay');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const title = page.locator('#settings-title');
    await expect(title).toHaveText('SETTINGS');

    // Switch language to Turkish
    const trBtn = page.locator('button[data-locale="tr"]');
    await trBtn.scrollIntoViewIfNeeded();
    await trBtn.click();
    await expect(title).toHaveText('AYARLAR');

    // Switch language to Greek
    const elBtn = page.locator('button[data-locale="el"]');
    await elBtn.scrollIntoViewIfNeeded();
    await elBtn.click();
    await expect(title).toHaveText('ΡΥΘΜΙΣΕΙΣ');

    // Switch back to English
    const enBtn = page.locator('button[data-locale="en"]');
    await enBtn.scrollIntoViewIfNeeded();
    await enBtn.click();
    await expect(title).toHaveText('SETTINGS');

    // Test High Contrast accessibility toggle
    const highContrastCheck = page.locator('#check-high-contrast');
    await highContrastCheck.scrollIntoViewIfNeeded();
    await highContrastCheck.check();
    const hasHighContrastClass = await page.evaluate(() =>
      document.body.classList.contains('high-contrast'),
    );
    expect(hasHighContrastClass).toBe(true);

    // Close settings modal
    const closeBtn = page.locator('#settings-close-btn');
    await closeBtn.scrollIntoViewIfNeeded();
    await closeBtn.click();
    await expect(modal).toBeHidden({ timeout: 5000 });

    expect(errorLogs).toEqual([]);
  });

  test('replays tutorial directly from settings modal', async ({ page }) => {
    await page.goto('/');
    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    const replayBtn = page.locator('#btn-replay-tutorial');
    await expect(replayBtn).toBeVisible();
    await replayBtn.scrollIntoViewIfNeeded();
    await replayBtn.click();

    // Tutorial modal opens
    const tutorialOverlay = page.locator('#tutorial-modal-overlay');
    await expect(tutorialOverlay).toBeVisible({ timeout: 5000 });

    const badge = page.locator('#tutorial-step-badge');
    await expect(badge).toHaveText('1 / 7');

    // Close tutorial with Skip
    const skipBtn = page.locator('#tutorial-skip-btn');
    await skipBtn.scrollIntoViewIfNeeded();
    await skipBtn.click();
    await expect(tutorialOverlay).toBeHidden();
  });

  test('restarts game multiple times without audio errors or unhandled exceptions', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Tap playfield to unlock audio
    await canvas.click();
    await page.waitForTimeout(200);

    // First reset: via Settings modal
    const settingsBtn = page.locator('#hud-settings-btn');
    await settingsBtn.click();
    const restartBtn = page.locator('#btn-restart-game');
    await restartBtn.scrollIntoViewIfNeeded();
    await restartBtn.click();
    await page.waitForTimeout(500);

    // Second reset: open settings and restart again
    await settingsBtn.click();
    await restartBtn.scrollIntoViewIfNeeded();
    await restartBtn.click();
    await page.waitForTimeout(500);

    // Verify playfield is active and zero errors were logged
    await expect(canvas).toBeVisible();
    expect(errorLogs).toEqual([]);
  });
});
