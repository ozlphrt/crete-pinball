import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  // Standard portrait mobile viewport with 9:16 aspect ratio matching world dimensions
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
  console.log('Clicking Play Game button...');
  await page.mouse.click(450, 660);
  await page.waitForTimeout(1500);

  // Capture Screenshot 1: Complete Aegean geography with Crete in default position
  const defaultPath = path.join(screenshotsDir, 'phase01_arena_default.png');
  console.log(`Capturing ${defaultPath}...`);
  await canvas.screenshot({ path: defaultPath });
  console.log('Captured default arena screenshot.');

  // Press 'KeyC' (collision geometry) and 'KeyB' (bounding boxes)
  console.log('Enabling collision geometry (C) and bounding boxes (B)...');
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(200);
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(500);

  // Capture Screenshot 2: Arena with collision geometry and bounding boxes enabled
  const debugPath = path.join(screenshotsDir, 'phase01_arena_debug.png');
  console.log(`Capturing ${debugPath}...`);
  await canvas.screenshot({ path: debugPath });
  console.log('Captured debug arena screenshot.');

  // Also capture an ExploreScene screenshot for complete documentation
  await page.keyboard.press('KeyC'); // toggle back
  await page.keyboard.press('KeyB');
  // Click back to main menu
  await page.mouse.click(100, 105);
  await page.waitForTimeout(1000);
  // Click Explore Aegean button (Y = 760, X = 450)
  await page.mouse.click(450, 760);
  await page.waitForTimeout(1500);
  const explorePath = path.join(screenshotsDir, 'phase01_aegean_explore.png');
  await canvas.screenshot({ path: explorePath });
  console.log(`Captured explore atlas screenshot to ${explorePath}.`);

  await browser.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
