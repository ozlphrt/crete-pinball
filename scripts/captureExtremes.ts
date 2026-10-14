import { chromium } from '@playwright/test';
import * as path from 'path';

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), 'docs', 'screenshots');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1600 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Play button
  await page.mouse.click(450, 660);
  await page.waitForTimeout(1500);

  // Drag Crete to extreme left (click at X=0, Y=1200)
  await page.mouse.click(10, 1200);
  await page.waitForTimeout(1000);
  const leftPath = path.join(screenshotsDir, 'phase01_crete_extreme_left.png');
  await canvas.screenshot({ path: leftPath });
  console.log(`Captured extreme left screenshot: ${leftPath}`);

  // Drag Crete to extreme right (click at X=890, Y=1200)
  await page.mouse.click(890, 1200);
  await page.waitForTimeout(1000);
  const rightPath = path.join(screenshotsDir, 'phase01_crete_extreme_right.png');
  await canvas.screenshot({ path: rightPath });
  console.log(`Captured extreme right screenshot: ${rightPath}`);

  await browser.close();
  console.log('Done capturing travel extremes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
