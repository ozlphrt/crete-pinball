import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Island Collision Display — Large Island Name & No Score Numbers', () => {
  test('displays island name prominently on collision without floating points', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 }); // iPhone 14 Pro Max portrait
    await page.goto('/');
    await page.waitForSelector('canvas');

    await page.waitForTimeout(600);

    // Launch ball out of countdown overlay
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    // Trigger an island impact on Naxos and verify label
    const hitLabelDetails = await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      // Trigger impact on island-naxos
      const geoRenderer = scene['geographyRenderer'];
      geoRenderer.flashIslandImpact('island-naxos', undefined, 450);

      const activeLabels = geoRenderer['activeHitLabels'];
      if (!activeLabels || activeLabels.length === 0) return null;

      const latest = activeLabels[activeLabels.length - 1];
      return {
        text: latest.text,
        fontSize: latest.style.fontSize,
        color: latest.style.color,
        strokeThickness: latest.style.strokeThickness,
        depth: latest.depth,
        scaleX: latest.scaleX,
        visible: latest.visible,
      };
    });

    expect(hitLabelDetails).not.toBeNull();
    expect(hitLabelDetails?.text).toContain('NAXOS');
    expect(hitLabelDetails?.fontSize).toBe('28px');
    expect(hitLabelDetails?.depth).toBe(185);
    expect(hitLabelDetails?.strokeThickness).toBe(7);

    // Wait a brief moment for tween punch-in
    await page.waitForTimeout(200);

    const outDir = path.resolve('docs/screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const screenshotPath = path.join(outDir, 'island_collision_naxos.png');
    await page.screenshot({ path: screenshotPath });

    // Now test a bonus target island hit (e.g. Rhodes as target)
    const targetLabelDetails = await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      const scene = game.scene.getScene('GamePlaceholderScene');
      const geoRenderer = scene['geographyRenderer'];

      geoRenderer.setTargetIsland('island-rhodes');
      geoRenderer.flashIslandImpact('island-rhodes', { x: 800, y: 850 }, 500);

      const activeLabels = geoRenderer['activeHitLabels'];
      const latest = activeLabels[activeLabels.length - 1];
      return {
        text: latest.text,
        fontSize: latest.style.fontSize,
        color: latest.style.color,
        depth: latest.depth,
      };
    });

    expect(targetLabelDetails.text).toBe('🎯 RHODES');
    expect(targetLabelDetails.fontSize).toBe('34px');
    expect(targetLabelDetails.color).toBe('#fde047');

    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'island_collision_target_rhodes.png') });
  });
});
