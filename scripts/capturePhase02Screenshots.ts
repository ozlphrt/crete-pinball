import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

async function main(): Promise<void> {
  const screenshotsDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1600 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  console.log('Navigating to http://localhost:3000/...');
  await page.goto('http://localhost:3000/');

  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click Play Button (Y = 660, X = 450)
  console.log('Entering Game Scene...');
  await page.mouse.click(450, 660);
  await page.waitForTimeout(1000);

  // Screenshot 1: Held ball on Crete with Dev Diagnostics enabled
  await page.keyboard.press('KeyD');
  await page.waitForTimeout(400);
  const heldPath = path.join(screenshotsDir, 'phase02_ball_held_start.png');
  await canvas.screenshot({ path: heldPath });
  console.log(`Saved ${heldPath}`);

  // Enable Physics Vector Overlay (KeyP)
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);

  // Launch ball
  console.log('Launching ball northward...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(650);

  // Screenshot 2: Ball in active flight with velocity vector and trajectory
  const flightPath = path.join(screenshotsDir, 'phase02_ball_flight.png');
  await canvas.screenshot({ path: flightPath });
  console.log(`Saved ${flightPath}`);

  // Enable collision segments (KeyC) and bounding boxes (KeyB)
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(100);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(800);

  // Screenshot 3: Active ball navigating Aegean island colliders
  const debugPath = path.join(screenshotsDir, 'phase02_ball_collision_debug.png');
  await canvas.screenshot({ path: debugPath });
  console.log(`Saved ${debugPath}`);

  await browser.close();
  console.log('Phase 02 screenshot capture completed successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
