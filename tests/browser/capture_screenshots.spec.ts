import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const ARTIFACT_DIR = path.resolve(
  'C:/Users/ozalp/.gemini/antigravity-ide/brain/5353ee86-72be-49bc-bbe4-7fefe96b54b6/phase05_screenshots',
);

test.describe('Phase 05 Visual Screenshots & Viewport Verification', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
  });

  test('captures iPhone 13 portrait (390x844) gameplay and edge-to-edge terrain', async ({
    page,
    browserName,
  }) => {
    // Only capture once from the designated device
    if (browserName !== 'chromium') return;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1600);

    const shotPath = path.join(ARTIFACT_DIR, '01_iphone13_gameplay_390x844.png');
    await page.screenshot({ path: shotPath });
  });

  test('captures small iPhone portrait (375x812) with interactive tutorial overlay', async ({
    page,
    browserName,
  }) => {
    if (browserName !== 'chromium') return;

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?tutorial=1');
    await page.waitForSelector('#tutorial-modal-overlay');
    await page.waitForTimeout(700);

    const shotPath = path.join(ARTIFACT_DIR, '02_small_iphone_tutorial_375x812.png');
    await page.screenshot({ path: shotPath });
  });

  test('captures Android portrait (393x851) with Settings modal in Turkish', async ({
    page,
    browserName,
  }) => {
    if (browserName !== 'chromium') return;

    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/');
    await page.waitForSelector('#hud-settings-btn');
    await page.click('#hud-settings-btn');
    await page.waitForSelector('#settings-modal-overlay');

    const trBtn = page.locator('button[data-locale="tr"]');
    await trBtn.scrollIntoViewIfNeeded();
    await trBtn.click();
    await page.waitForTimeout(700);

    const shotPath = path.join(ARTIFACT_DIR, '03_android_settings_turkish_393x851.png');
    await page.screenshot({ path: shotPath });
  });

  test('captures Desktop portrait (540x960) with Greek localization', async ({
    page,
    browserName,
  }) => {
    if (browserName !== 'chromium') return;

    await page.setViewportSize({ width: 540, height: 960 });
    await page.goto('/');
    await page.waitForSelector('#hud-settings-btn');
    await page.click('#hud-settings-btn');
    await page.waitForSelector('button[data-locale="el"]');

    const elBtn = page.locator('button[data-locale="el"]');
    await elBtn.scrollIntoViewIfNeeded();
    await elBtn.click();

    const closeBtn = page.locator('#settings-close-btn');
    await closeBtn.click();
    await page.waitForTimeout(1000);

    const shotPath = path.join(ARTIFACT_DIR, '04_desktop_greek_hud_540x960.png');
    await page.screenshot({ path: shotPath });
  });

  test('captures multiball action with ripple effects and active balls', async ({
    page,
    browserName,
  }) => {
    if (browserName !== 'chromium') return;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);

    // Launch multiball via dev key 'M'
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(1400);

    const shotPath = path.join(ARTIFACT_DIR, '05_iphone13_multiball_action_390x844.png');
    await page.screenshot({ path: shotPath });
  });

  test('captures collision thunderstorm lightning and localized daylight terrain reveal', async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== 'Mobile Portrait (iPhone 13)') return;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(800);

    // Dismiss "GO!" countdown to enter live gameplay
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);

    // Trigger localized daylight reveal and micro-lightning arcs
    await page.evaluate(() => {
      const g = (window as unknown as { game?: Phaser.Game }).game;
      if (g) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = g.scene.getScene('GamePlaceholderScene') as any;
        if (scene) {
          // Trigger collision on Naxos and Chios
          scene.geographyRenderer.flashIslandImpact('island-naxos', { x: 479, y: 963 }, 500);
          scene.effectDirector.spawnIslandHitEffects({ x: 479, y: 963 }, 250, false, false, 500);

          scene.geographyRenderer.flashIslandImpact('island-chios', { x: 560, y: 701 }, 450);
          scene.effectDirector.spawnIslandHitEffects({ x: 560, y: 701 }, 150, true, false, 450);
        }
      }
    });

    // Wait ~25ms for lightning strike to be at initial full flash
    await page.waitForTimeout(25);

    const shotPath = path.join(
      ARTIFACT_DIR,
      '06_thunderstorm_lightning_daylight_reveal_390x844.png',
    );
    await page.screenshot({ path: shotPath });

    const docsPath = path.resolve(
      'docs/screenshots/06_thunderstorm_lightning_daylight_reveal_390x844.png',
    );
    await page.screenshot({ path: docsPath });
  });
});
