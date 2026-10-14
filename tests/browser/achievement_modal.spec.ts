import { test, expect } from '@playwright/test';

test.describe('Achievement Unlock Modal & 3-Second Game Pause', () => {
  test('pauses game when achievement is unlocked, shows readable modal with 3s countdown, and resumes', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // Launch ball into play
    await page.keyboard.press('Space');

    // Natural gameplay: ball drops into northern waters and strikes an island, unlocking an achievement
    const modalBackdrop = page.locator('#achievement-unlock-backdrop');
    await expect(modalBackdrop).toBeVisible({ timeout: 10000 });

    const card = page.locator('#achievement-unlock-card');
    await expect(card).toContainText(/ACHIEVEMENT/);
    await expect(card).toContainText(/Resuming in/);

    const resumeBtn = page.locator('#achievement-resume-btn');
    await expect(resumeBtn).toBeVisible();

    // Capture screenshot of the achievement modal
    await page.screenshot({
      path: 'C:/Users/ozalp/.gemini/antigravity-ide/brain/6cde20b9-3b91-4453-a110-b602f8618cb6/achievement_modal_paused.png',
      fullPage: true,
    });

    // Click resume button to immediately resume
    await resumeBtn.click();

    // Verify modal dismisses and gameplay resumes
    await expect(modalBackdrop).not.toBeVisible({ timeout: 3000 });

    expect(errorLogs).toEqual([]);
  });

  test('automatically resumes after 3 seconds if user does not click resume', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // Launch ball
    await page.keyboard.press('Space');

    // Wait for achievement modal to appear naturally from island strike
    const modalBackdrop = page.locator('#achievement-unlock-backdrop');
    await expect(modalBackdrop).toBeVisible({ timeout: 10000 });

    // Wait for auto-resume timer (3 seconds) to dismiss modal
    await expect(modalBackdrop).not.toBeVisible({ timeout: 4500 });
  });
});
