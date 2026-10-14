import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('HUD Header Layout & Overlap Verification', () => {
  test('settings and play buttons never overlap lives dots or combo on mobile and desktop', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#hud-score-val');

    // Manipulate game state to reproduce user scenario: 5 lives, score 7,048,700, combo x5, paused (play button)
    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game instance not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      // Set score and combo
      const rc = scene['runController'];
      if (rc) {
        rc['scoringSystem']['totalScore'] = 7048700;
        rc['comboSystem']['multiplier'] = 5;
        // Ensure lives = 5
        const livesSys = rc.getLivesSystem();
        while (livesSys.currentLives < 5) {
          livesSys.addExtraLife();
        }
      }

      // Pause the game so play button is displayed
      const sm = rc['stateManager'];
      if (sm && sm.getState() !== 'paused') {
        sm.forceState('paused');
      }
    });

    // Wait for a frame render and DOM update
    await page.waitForTimeout(300);

    // Verify layout and bounding boxes
    const layout = await page.evaluate(() => {
      const row1 = document.querySelector('.hud-row-1') as HTMLElement;
      const scoreVal = document.querySelector('#hud-score-val') as HTMLElement;
      const comboVal = document.querySelector('#hud-combo-val') as HTMLElement;
      const settingsBtn = document.querySelector('#hud-settings-btn') as HTMLElement;
      const playBtn = document.querySelector('#hud-pause-btn') as HTMLElement;
      const lifeSpheres = Array.from(document.querySelectorAll('.hud-life-sphere')) as HTMLElement[];

      const row1Rect = row1.getBoundingClientRect();
      const scoreRect = scoreVal.getBoundingClientRect();
      const comboRect = comboVal.getBoundingClientRect();
      const settingsRect = settingsBtn.getBoundingClientRect();
      const playRect = playBtn.getBoundingClientRect();
      const lifeRects = lifeSpheres.map((el) => el.getBoundingClientRect());

      return {
        row1Rect,
        scoreRect,
        comboRect,
        settingsRect,
        playRect,
        lifeRects,
        livesCount: lifeSpheres.length,
      };
    });

    expect(layout.livesCount).toBe(5);
    expect(layout.lifeRects.length).toBeGreaterThan(0);

    // 1. Rightmost life dot must be strictly to the left of settings button
    const firstLife = layout.lifeRects[0]!;
    const rightmostLife = layout.lifeRects.reduce((max, r) => (r.right > max.right ? r : max), firstLife);
    const gapLifeToSettings = layout.settingsRect.left - rightmostLife.right;
    expect(gapLifeToSettings).toBeGreaterThanOrEqual(4); // at least 4px clear gap

    // 2. Settings button must be strictly to the left of play button
    const gapSettingsToPlay = layout.playRect.left - layout.settingsRect.right;
    expect(gapSettingsToPlay).toBeGreaterThanOrEqual(4); // at least 4px clear gap

    // 3. Score must not overlap combo
    expect(layout.comboRect.left).toBeGreaterThanOrEqual(layout.scoreRect.right - 1);

    // 4. Combo must not overlap leftmost life dot
    const leftmostLife = layout.lifeRects.reduce((min, r) => (r.left < min.left ? r : min), firstLife);
    expect(leftmostLife.left).toBeGreaterThanOrEqual(layout.comboRect.right);

    // 5. Play button must fit inside row1 right boundary
    expect(layout.playRect.right).toBeLessThanOrEqual(layout.row1Rect.right + 1);

    // 6. Settings button must fit inside row1
    expect(layout.settingsRect.left).toBeGreaterThanOrEqual(layout.row1Rect.left);

    // Capture screenshot of row1
    const row1Element = page.locator('.hud-row-1');
    const outDir = path.resolve('docs/screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    await row1Element.screenshot({
      path: path.join(outDir, 'hud_5_lives_verified.png'),
    });
  });

  test('settings and play buttons never overlap on narrow 360px screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#hud-score-val');

    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game instance not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const rc = scene['runController'];
      if (rc) {
        rc['scoringSystem']['totalScore'] = 7048700;
        rc['comboSystem']['multiplier'] = 5;
        const livesSys = rc.getLivesSystem();
        while (livesSys.currentLives < 5) {
          livesSys.addExtraLife();
        }
      }

      const sm = rc['stateManager'];
      if (sm && sm.getState() !== 'paused') {
        sm.forceState('paused');
      }
    });

    await page.waitForTimeout(300);

    const layout = await page.evaluate(() => {
      const row1 = document.querySelector('.hud-row-1') as HTMLElement;
      const settingsBtn = document.querySelector('#hud-settings-btn') as HTMLElement;
      const playBtn = document.querySelector('#hud-pause-btn') as HTMLElement;
      const lifeSpheres = Array.from(document.querySelectorAll('.hud-life-sphere')) as HTMLElement[];

      const row1Rect = row1.getBoundingClientRect();
      const settingsRect = settingsBtn.getBoundingClientRect();
      const playRect = playBtn.getBoundingClientRect();
      const lifeRects = lifeSpheres.map((el) => el.getBoundingClientRect());

      return {
        row1Rect,
        settingsRect,
        playRect,
        lifeRects,
        livesCount: lifeSpheres.length,
      };
    });

    expect(layout.livesCount).toBe(5);
    expect(layout.lifeRects.length).toBeGreaterThan(0);

    // Rightmost life dot must be strictly to the left of settings button
    const firstLife = layout.lifeRects[0]!;
    const rightmostLife = layout.lifeRects.reduce((max, r) => (r.right > max.right ? r : max), firstLife);
    const gapLifeToSettings = layout.settingsRect.left - rightmostLife.right;
    expect(gapLifeToSettings).toBeGreaterThanOrEqual(4);

    // Settings button must be strictly to the left of play button
    const gapSettingsToPlay = layout.playRect.left - layout.settingsRect.right;
    expect(gapSettingsToPlay).toBeGreaterThanOrEqual(4);

    // Buttons must fit within row1
    expect(layout.playRect.right).toBeLessThanOrEqual(layout.row1Rect.right + 1);
    expect(layout.settingsRect.left).toBeGreaterThanOrEqual(layout.row1Rect.left);

    const row1Element = page.locator('.hud-row-1');
    const outDir = path.resolve('docs/screenshots');
    await row1Element.screenshot({
      path: path.join(outDir, 'hud_360px_verified.png'),
    });
  });
});
