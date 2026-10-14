import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('On-Map HUD Elements (Bottom Panel Removed)', () => {
  test('verifies bottom panel is completely removed from DOM and info renders on map', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');

    // 1. Verify bottom footer panel does NOT exist
    const footerCount = await page.locator('.hud-footer').count();
    expect(footerCount).toBe(0);

    // 2. Set state: Kythira target, multiball 5s, full power charge
    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const rc = scene['runController'];
      if (rc) {
        rc['targetSystem']['currentBonusTarget'] = {
          islandId: 'island-kythira',
          name: 'Kythira',
          bonusPoints: 500,
          timerSeconds: 15,
        };
        const mb = rc.getMultiballSystem();
        (mb as any)['active'] = true;
        (mb as any)['remainingDurationMs'] = 5000;

        const energy = rc.getCreteEnergySystem();
        energy['currentCharge'] = 1.0;
      }
    });

    await page.waitForTimeout(400);

    // 3. Verify on-map representations
    const onMapInfo = await page.evaluate(() => {
      const game = (window as any).game;
      const scene = game.scene.getScene('GamePlaceholderScene');
      return {
        targetBadgeText: scene.targetBadgeText?.text ?? '',
        targetBadgeVisible: scene.targetBadgeText?.visible ?? false,
        cretePowerText: scene.cretePowerText?.text ?? '',
        cretePowerVisible: scene.cretePowerText?.visible ?? false,
        mapStatusText: scene.mapStatusBadgeText?.text ?? '',
        mapStatusVisible: scene.mapStatusBadgeText?.visible ?? false,
      };
    });

    expect(onMapInfo.targetBadgeVisible).toBe(true);
    expect(onMapInfo.targetBadgeText).toContain('BONUS');
    expect(onMapInfo.targetBadgeText).toContain('KYTHIRA');
    expect(onMapInfo.targetBadgeText).toContain('+500');

    expect(onMapInfo.cretePowerVisible).toBe(true);
    expect(onMapInfo.cretePowerText).toBe('⚡ READY');

    expect(onMapInfo.mapStatusVisible).toBe(true);
    expect(onMapInfo.mapStatusText).toContain('3-BALL MULTIBALL');

    // 4. If achievement modal(s) opened, dismiss them so map is clearly visible
    while (await page.locator('#achievement-resume-btn').isVisible()) {
      await page.locator('#achievement-resume-btn').click();
      await page.waitForTimeout(200);
    }

    // 5. Capture screenshot showing full map without bottom panel and with on-map info
    const outDir = path.resolve('C:/Users/ozalp/.gemini/antigravity-ide/brain/6cde20b9-3b91-4453-a110-b602f8618cb6');
    await page.screenshot({
      path: path.join(outDir, 'on_map_hud_no_bottom_panel.png'),
    });
  });

  test('verifies on-map Crete power meter when charging (55%)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');

    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const rc = scene['runController'];
      if (rc) {
        rc['targetSystem']['target'] = {
          islandId: 'island-naxos',
          name: 'Naxos',
          bonusPoints: 500,
          timerSeconds: 15,
        };
        const energy = rc.getCreteEnergySystem();
        energy['currentCharge'] = 0.55;
      }
    });

    await page.waitForTimeout(300);

    const powerInfo = await page.evaluate(() => {
      const game = (window as any).game;
      const scene = game.scene.getScene('GamePlaceholderScene');
      return {
        powerText: scene.cretePowerText?.text ?? '',
        powerVisible: scene.cretePowerText?.visible ?? false,
      };
    });

    expect(powerInfo.powerVisible).toBe(true);
    expect(powerInfo.powerText).toBe('55%');
  });
});
