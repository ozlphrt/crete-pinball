import { test, expect } from '@playwright/test';

test('dynamic terrain lighting shader compiles and activates on impact', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const debugInfo = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as unknown as any).game;
    if (!g) return { error: 'No game' };
    const scene = g.scene.getScene('GamePlaceholderScene');
    if (!scene) return { error: 'No scene' };
    const geo = scene.geographyRenderer;

    geo.flashIslandImpact('island-chios', { x: 560, y: 701 }, 450, 0x38bdf8, 500);
    geo.update();

    const shader = geo.terrainLightingShader;
    let progInfoLog = 'no shader';
    if (shader && shader.program) {
      const gl = shader.gl;
      progInfoLog = gl.getProgramInfoLog(shader.program.webGLProgram) || 'OK';
    }

    return {
      isWebGL: scene.sys.game.renderer.type === 2,
      hasDaylightTex: scene.textures.exists('aegean_terrain_daylight'),
      hasNormalTex: scene.textures.exists('aegean_terrain_normal'),
      hasShaderObj: !!geo.terrainLightingShader,
      shaderVisible: geo.terrainLightingShader?.visible,
      progInfoLog,
      lightCount: geo.terrainLightingShader?.uniforms?.uLightCount?.value,
    };
  });

  expect(debugInfo.isWebGL).toBe(true);
  expect(debugInfo.hasDaylightTex).toBe(true);
  expect(debugInfo.hasNormalTex).toBe(true);
  expect(debugInfo.hasShaderObj).toBe(true);
  expect(debugInfo.shaderVisible).toBe(true);
  expect(debugInfo.progInfoLog).toBe('OK');
  expect(debugInfo.lightCount).toBe(1);
});

test('Crete paddle illuminates with daylight mountain terrain on collision', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const creteDebug = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as unknown as any).game;
    if (!g) return { error: 'No game' };
    const scene = g.scene.getScene('GamePlaceholderScene');
    if (!scene) return { error: 'No scene' };
    const geo = scene.geographyRenderer;

    // Trigger contact on Crete paddle
    geo.flashIslandImpact('island-crete', { x: 450, y: 1450 }, 400, 0x38bdf8, 520);
    geo.update();

    return {
      hasCreteDaylightTex: scene.textures.exists('crete_paddle_daylight'),
      hasCreteDaylightSprite: !!geo.creteDaylightSprite,
      creteDaylightVisible: geo.creteDaylightSprite?.visible,
      creteDaylightAlpha: geo.creteDaylightSprite?.alpha,
      impactGlowDepth: geo.impactGlowLayer.depth,
    };
  });

  expect(creteDebug.hasCreteDaylightTex).toBe(true);
  expect(creteDebug.hasCreteDaylightSprite).toBe(true);
  expect(creteDebug.creteDaylightVisible).toBe(true);
  expect(creteDebug.creteDaylightAlpha).toBeGreaterThan(0.5);
  expect(creteDebug.impactGlowDepth).toBe(11);
});

