import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('HUD Footer & Power Meter Layout Verification', () => {
  test('captures footer layout in charged state with multiball', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForSelector('.hud-footer');

    // Set state: Kythira target, multiball 5s, full power charge
    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const rc = scene['runController'];
      if (rc) {
        rc['targetSystem']['target'] = {
          islandId: 'kythira',
          name: 'Kythira',
          bonusPoints: 500,
          timerSeconds: 15,
        };
        const mb = rc.getMultiballSystem();
        mb['active'] = true;
        mb['remainingDurationMs'] = 5000;

        const energy = rc.getCreteEnergySystem();
        energy['currentCharge'] = 1.0;
      }
    });

    await page.waitForTimeout(300);

    const outDir = path.resolve('docs/screenshots');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const footerEl = page.locator('.hud-footer');
    await footerEl.screenshot({
      path: path.join(outDir, 'hud_footer_charged_multiball.png'),
    });

    // Verify alignment
    const metrics = await page.evaluate(() => {
      const targetName = document.querySelector('#hud-target-name')?.getBoundingClientRect();
      const statusText = document.querySelector('#hud-status-text')?.getBoundingClientRect();
      const row2 = document.querySelector('.hud-row-2')?.getBoundingClientRect();
      const powerMeter = document.querySelector('.hud-power-meter')?.getBoundingClientRect();

      return {
        targetNameMid: targetName ? (targetName.top + targetName.bottom) / 2 : 0,
        statusTextMid: statusText ? (statusText.top + statusText.bottom) / 2 : 0,
        row2Width: row2?.width ?? 0,
        powerMeterWidth: powerMeter?.width ?? 0,
      };
    });

    // Check vertical alignment: midpoints should be virtually identical
    expect(Math.abs(metrics.targetNameMid - metrics.statusTextMid)).toBeLessThanOrEqual(2);
    // Power meter spans full width of row2 (minus borders)
    expect(metrics.powerMeterWidth).toBeGreaterThanOrEqual(metrics.row2Width - 3);
  });

  test('captures footer layout in partial charge state (50%)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForSelector('.hud-footer');

    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const rc = scene['runController'];
      if (rc) {
        rc['targetSystem']['target'] = {
          islandId: 'naxos',
          name: 'Naxos',
          bonusPoints: 500,
          timerSeconds: 15,
        };
        const energy = rc.getCreteEnergySystem();
        energy['currentCharge'] = 0.55;
      }
    });

    await page.waitForTimeout(300);

    const outDir = path.resolve('docs/screenshots');
    const footerEl = page.locator('.hud-footer');
    await footerEl.screenshot({
      path: path.join(outDir, 'hud_footer_partial_charge.png'),
    });
  });

  test('renders long target island name with POWER READY without clipping or truncation', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForSelector('.hud-footer');

    await page.evaluate(() => {
      const game = (window as unknown as { game?: any }).game;
      if (!game) throw new Error('game not found');
      const scene = game.scene.getScene('GamePlaceholderScene');
      if (!scene) throw new Error('GamePlaceholderScene not found');

      const hud = scene['hud'];
      if (hud) {
        hud.update(
          12500,
          1,
          3,
          'Astypalaia',
          500,
          'normal',
          false,
          {
            powerCharge: 1.0,
            isPowerArmed: false,
            weatherType: 'none',
            weatherDurationRemainingSeconds: 0,
            isMultiballActive: false,
            multiballDurationRemainingSeconds: 0,
          }
        );
      }
    });

    await page.waitForTimeout(300);

    const outDir = path.resolve('docs/screenshots');
    const footerEl = page.locator('.hud-footer');
    await footerEl.screenshot({
      path: path.join(outDir, 'hud_footer_astypalaia_power_ready.png'),
    });

    const isTruncated = await page.evaluate(() => {
      const el = document.querySelector('#hud-target-name');
      if (!el) return true;
      return el.scrollWidth > el.clientWidth;
    });

    expect(isTruncated).toBe(false);
  });
});
