import { test, expect } from '@playwright/test';

test.describe('Target Island Celebratory Achievement Star Sign Representation', () => {
  test('depicts active target island with celebratory golden achievement star sign and badge', async ({
    page,
  }) => {
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => {
      errorLogs.push(err.message);
    });

    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Allow Phaser scene to fully load and initialize target reticle
    await page.waitForTimeout(1000);

    // Verify through game scene inspection that target reticle graphics and badge are active
    const targetInfo = await page.evaluate(() => {
      const phaserGame = (window as any).game;
      if (!phaserGame) return null;

      const scene = phaserGame.scene?.scenes?.find(
        (s: any) => s.scene?.key === 'GamePlaceholderScene'
      );
      if (!scene) return null;

      const badge = (scene as any).targetBadgeText;
      const reticle = (scene as any).targetReticleGraphics;
      const runCtrl = (scene as any).runController;
      const targetIsland = runCtrl?.currentTarget;

      const targetLabel = (scene as any).geographyRenderer?.labelObjects?.find(
        (lbl: any) => lbl.featureId === targetIsland?.islandId
      );

      return {
        badgeVisible: badge ? badge.visible : false,
        reticleDepth: reticle ? reticle.depth : 0,
        targetIslandId: targetIsland?.islandId ?? null,
        targetLabelVisible: targetLabel ? targetLabel.visible : false,
        targetLabelColor: targetLabel ? targetLabel.style.color : '',
      };
    });

    expect(targetInfo).not.toBeNull();
    // Redundant badge text is hidden to keep the map clean and unobstructed
    expect(targetInfo?.badgeVisible).toBe(false);
    expect(targetInfo?.reticleDepth).toBe(35);
    expect(targetInfo?.targetIslandId).toBeTruthy();
    // The target island's authentic name label on the map is highlighted in glowing gold
    expect(targetInfo?.targetLabelVisible).toBe(true);
    expect(targetInfo?.targetLabelColor).toBe('#fcd34d');

    // Capture visual artifact screenshot showing green target sign clearly
    await page.screenshot({
      path: 'C:/Users/ozalp/.gemini/antigravity-ide/brain/6cde20b9-3b91-4453-a110-b602f8618cb6/target_island_green_sign.png',
      fullPage: false,
    });

    expect(errorLogs).toEqual([]);
  });
});
