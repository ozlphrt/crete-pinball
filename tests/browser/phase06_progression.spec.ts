import { test, expect } from '@playwright/test';

test.describe('Crete Pinball — Phase 06 Player Progress, Exploration & Persistence', () => {
  test('opens Achievements gallery from settings modal and renders 20 cosmetic badges', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Open settings modal
    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    const settingsModal = page.locator('#settings-modal-overlay');
    await expect(settingsModal).toBeVisible({ timeout: 5000 });

    // Click Badges shortcut
    const badgesBtn = page.locator('#btn-open-achievements');
    await expect(badgesBtn).toBeVisible();
    await badgesBtn.click();

    // Achievements modal should open
    const achsModal = page.locator('#achievements-modal');
    await expect(achsModal).toBeVisible({ timeout: 5000 });
    await expect(achsModal).toContainText('AEGEAN ACHIEVEMENTS');
    await expect(achsModal).toContainText('0 / 20 UNLOCKED');

    // Close achievements modal
    const closeAchsBtn = page.locator('#achievements-close');
    await expect(closeAchsBtn).toBeVisible();
    await closeAchsBtn.click();
    await expect(achsModal).toBeHidden();

    expect(errorLogs).toEqual([]);
  });

  test('provides backup export and restore controls in Settings modal', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    // Verify backup export and restore buttons
    const exportBtn = page.locator('#btn-export-backup');
    await expect(exportBtn).toBeVisible();

    const importBtn = page.locator('#btn-import-backup');
    await expect(importBtn).toBeVisible();

    // Verify backup file input is attached to DOM
    const fileInput = page.locator('#backup-file-input');
    await expect(fileInput).toBeAttached();

    // Close settings modal
    const closeBtn = page.locator('#settings-close-btn');
    await closeBtn.click();
    await expect(page.locator('#settings-modal-overlay')).toBeHidden();

    expect(errorLogs).toEqual([]);
  });

  test('navigates to Aegean Exploration Atlas from settings', async ({ page }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const settingsBtn = page.locator('#hud-settings-btn');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await settingsBtn.click();

    const atlasBtn = page.locator('#btn-open-atlas');
    await expect(atlasBtn).toBeVisible();
    await atlasBtn.click();

    // Settings modal closes and canvas remains interactive
    await expect(page.locator('#settings-modal-overlay')).toBeHidden();
    await page.waitForTimeout(500);

    expect(errorLogs).toEqual([]);
  });
});
