import { chromium } from '@playwright/test';
import path from 'path';

async function capture() {
  const browser = await chromium.launch();

  const targets = [
    {
      name: 'iPhone 13 (390×844)',
      viewport: { width: 390, height: 844 },
      file: 'docs/design/after_redesign_iphone13.png',
    },
    {
      name: 'iPhone 375 (375×812)',
      viewport: { width: 375, height: 812 },
      file: 'docs/design/after_redesign_iphone_375x812.png',
    },
    {
      name: 'Android Pixel 5 (393×851)',
      viewport: { width: 393, height: 851 },
      file: 'docs/design/after_redesign_pixel5.png',
    },
    {
      name: 'iPhone Pro Max (430×932)',
      viewport: { width: 430, height: 932 },
      file: 'docs/design/after_redesign_iphone_430x932.png',
    },
    {
      name: 'Desktop Portrait Arena (720×1280)',
      viewport: { width: 720, height: 1280 },
      file: 'docs/design/after_redesign_desktop.png',
    },
    {
      name: 'Desktop Landscape Browser (1280×800)',
      viewport: { width: 1280, height: 800 },
      file: 'docs/design/after_redesign_desktop_landscape.png',
    },
  ];

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Capturing ${t.name}...`);
    const page = await browser.newPage({ viewport: t.viewport });
    await page.goto('http://localhost:3000/');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForSelector('#hud-overlay', { timeout: 10000 });
    await page.waitForTimeout(600);

    // Wait for game scene to render
    await page.waitForTimeout(1200);

    // Press Space to launch/drop ball into active flight
    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);

    // Measure CSS pixel typography sizes & element bounding rects via string evaluate
    const metrics: any = await page.evaluate(`
      (() => {
        function read(sel) {
          const el = document.querySelector(sel);
          if (!el) return null;
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return {
            fontSize: s.fontSize,
            fontWeight: s.fontWeight,
            color: s.color,
            width: Math.round(r.width * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            top: Math.round(r.top * 10) / 10,
            bottom: Math.round(r.bottom * 10) / 10,
          };
        }
        const canvasEl = document.querySelector('canvas');
        const cRect = canvasEl ? canvasEl.getBoundingClientRect() : null;
        return {
          score: read('#hud-score-val'),
          scoreLabel: read('.hud-score-label'),
          combo: read('#hud-combo-val'),
          livesContainer: read('#hud-lives-container'),
          pauseBtn: read('#hud-pause-btn'),
          targetName: read('#hud-target-name'),
          targetLabel: read('.hud-target-label'),
          targetBonus: read('#hud-target-bonus'),
          status: read('#hud-status-text'),
          powerMeter: read('.hud-power-meter'),
          hudHeader: read('.hud-header'),
          hudFooter: read('.hud-footer'),
          canvas: cRect ? {
            top: Math.round(cRect.top * 10) / 10,
            bottom: Math.round(cRect.bottom * 10) / 10,
            width: Math.round(cRect.width * 10) / 10,
            height: Math.round(cRect.height * 10) / 10,
          } : null,
        };
      })()
    `);

    console.log(`Measurements for ${t.name}:`);
    console.log(`  - Score: font-size = ${metrics.score?.fontSize} (Target: 30-38px)`);
    console.log(`  - Combo: font-size = ${metrics.combo?.fontSize} (Target: 24-28px)`);
    console.log(`  - Target island: font-size = ${metrics.targetName?.fontSize} (Target: 18-22px)`);
    console.log(`  - Bonus points: font-size = ${metrics.targetBonus?.fontSize} (Target: 16-18px)`);
    console.log(`  - Status: font-size = ${metrics.status?.fontSize} (Target: 16-18px)`);
    console.log(`  - Small labels: font-size = ${metrics.scoreLabel?.fontSize} (Target: 14-16px)`);
    console.log(`  - Pause touch target: ${metrics.pauseBtn?.width}×${metrics.pauseBtn?.height}px (Target: min 44×44px)`);
    console.log(`  - HUD Header top: ${metrics.hudHeader?.top}px, height: ${metrics.hudHeader?.height}px`);
    console.log(`  - HUD Footer bottom: ${metrics.hudFooter?.bottom}px, power meter: ${metrics.powerMeter?.width}×${metrics.powerMeter?.height}px`);
    console.log(`  - Canvas: top=${metrics.canvas?.top}px, height=${metrics.canvas?.height}px, bottom=${metrics.canvas?.bottom}px`);

    // Take full page viewport screenshot
    const outPath = path.resolve(t.file);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot to ${outPath}`);

    await page.close();
  }

  await browser.close();
  console.log('\nAll fullscreen responsive screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Failed to capture screenshots:', err);
  process.exit(1);
});
