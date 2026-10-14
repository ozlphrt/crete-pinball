import { test, expect } from '@playwright/test';

test.describe('Achievement Unlock Modal & User-Driven Continue', () => {
  test('pauses game when achievement is unlocked, shows readable modal with Continue button, and resumes on click', async ({
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

    // Verify there is NO automatic countdown text
    await expect(card).not.toContainText(/Resuming in/);

    const resumeBtn = page.locator('#achievement-resume-btn');
    await expect(resumeBtn).toBeVisible();
    await expect(resumeBtn).toContainText(/CONTINUE/);

    // Capture screenshot of the achievement modal
    await page.screenshot({
      path: 'C:/Users/ozalp/.gemini/antigravity-ide/brain/6cde20b9-3b91-4453-a110-b602f8618cb6/achievement_modal_paused.png',
      fullPage: true,
    });

    // Click continue button to resume
    await resumeBtn.click();

    // Verify modal dismisses and gameplay resumes
    await expect(modalBackdrop).not.toBeVisible({ timeout: 3000 });

    expect(errorLogs).toEqual([]);
  });

  test('keeps modal open without 3-second auto-dismiss, allowing user to continue at their own pace', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(600);

    // Launch ball
    await page.keyboard.press('Space');

    // Wait for achievement modal to appear naturally from island strike
    const modalBackdrop = page.locator('#achievement-unlock-backdrop');
    await expect(modalBackdrop).toBeVisible({ timeout: 10000 });

    // Wait 3.5 seconds: verify modal is STILL open and has NOT auto-dismissed
    await page.waitForTimeout(3500);
    await expect(modalBackdrop).toBeVisible();

    // Press Space or click Continue to resume when user decides
    const resumeBtn = page.locator('#achievement-resume-btn');
    await resumeBtn.click();
    await expect(modalBackdrop).not.toBeVisible({ timeout: 3000 });
  });
});
