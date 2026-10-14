import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Larger Terrain Lighting Verification', () => {
  test('captures wide expansive terrain lighting across Aegean islands', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(800);

    // Dismiss countdown if any
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);

    // Position ball at Naxos collision point and trigger high-velocity strike
    const shaderData = await page.evaluate(() => {
      const g = (window as unknown as { game?: any }).game;
      if (!g) throw new Error('no game');
      const scene = g.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('no scene');

      // Place ball directly at collision point on Naxos
      const ball = scene.physicsWorld.getBall();
      ball.x = 479;
      ball.y = 963;
      ball.vx = 0;
      ball.vy = 0;

      // Clear any prior flashes so index 0 is our test strike
      scene.geographyRenderer.activeFlashes.length = 0;

      // Trigger impact on Naxos in central Cyclades with realistic impact speed
      scene.geographyRenderer.flashIslandImpact('island-naxos', { x: 479, y: 963 }, 500, 0x38bdf8, 1200);
      scene.effectDirector.spawnIslandHitEffects({ x: 479, y: 963 }, 250, false, false, 500);

      // Set flash start time 350ms in the past so currentRadius is near peak expansion (> 320px)
      const flash = scene.geographyRenderer.activeFlashes[0];
      if (flash) {
        flash.startTime = scene.time.now - 350;
      }

      scene.geographyRenderer.update();
      scene.ballRenderer.update(ball, 0.016);

      const shader = scene.geographyRenderer.terrainLightingShader;
      const count = shader?.uniforms?.uLightCount?.value ?? 0;
      const light0 = shader?.uniforms?.uLight0?.value;

      return {
        count,
        radius: light0?.z ?? 0,
        alpha: light0?.w ?? 0,
        visible: shader?.visible ?? false,
      };
    });

    const outDir = path.resolve('docs/screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const shotPath = path.join(outDir, 'larger_terrain_lighting_naxos.png');
    await page.screenshot({ path: shotPath });

    expect(shaderData.visible).toBe(true);
    expect(shaderData.count).toBeGreaterThanOrEqual(1);
    // Radius should be wide (> 300px)
    expect(shaderData.radius).toBeGreaterThanOrEqual(300);
  });
});
