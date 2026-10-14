import { describe, it, expect } from 'vitest';
import { CoordinateTransformer } from '../../src/game/world/coordinateTransformer';
import { ARENA_CONFIG } from '../../src/config';

describe('CoordinateTransformer', () => {
  it('preserves 9:16 aspect ratio with uniform scaling (never scales X and Y independently)', () => {
    // Desktop wide screen (1920 x 1080) - height constrained (pillarbox)
    const transformerDesktop = new CoordinateTransformer(900, 1600, {
      width: 1920,
      height: 1080,
    });
    const transformDesktop = transformerDesktop.getTransform();

    // Scale must be min(1920/900, 1080/1600) = min(2.133, 0.675) = 0.675
    expect(transformDesktop.scale).toBeCloseTo(1080 / 1600, 5);
    // Vertical offset must be 0 (touching top & bottom)
    expect(transformDesktop.offsetY).toBeCloseTo(0, 5);
    // Horizontal offset centers the arena
    const expectedPillarbox = (1920 - 900 * (1080 / 1600)) / 2;
    expect(transformDesktop.offsetX).toBeCloseTo(expectedPillarbox, 5);

    // Tall phone screen (390 x 844) - width constrained (letterbox)
    const transformerPhone = new CoordinateTransformer(900, 1600, {
      width: 390,
      height: 844,
    });
    const transformPhone = transformerPhone.getTransform();

    // 390 / 900 = 0.4333, 844 / 1600 = 0.5275 -> scale must be 390 / 900
    expect(transformPhone.scale).toBeCloseTo(390 / 900, 5);
    expect(transformPhone.offsetX).toBeCloseTo(0, 5);
    const expectedLetterbox = (844 - 1600 * (390 / 900)) / 2;
    expect(transformPhone.offsetY).toBeCloseTo(expectedLetterbox, 5);
  });

  it('guarantees exact mathematical roundtrip between world and screen coordinates', () => {
    const viewports = [
      { width: 1920, height: 1080, dpr: 1 }, // desktop
      { width: 390, height: 844, dpr: 3 }, // iPhone 13
      { width: 412, height: 915, dpr: 2.625 }, // Pixel 7
      { width: 768, height: 1024, dpr: 2 }, // iPad portrait
      { width: 320, height: 568, dpr: 2 }, // iPhone SE
    ];

    for (const vp of viewports) {
      const transformer = new CoordinateTransformer(900, 1600, vp);

      const testPoints = [
        { x: 0, y: 0 }, // Top-left
        { x: 900, y: 0 }, // Top-right
        { x: 0, y: 1600 }, // Bottom-left
        { x: 900, y: 1600 }, // Bottom-right
        { x: 450, y: 800 }, // Center
        { x: 123.456, y: 789.012 }, // Arbitrary floating point
      ];

      for (const pt of testPoints) {
        const screen = transformer.worldToScreen(pt);
        const roundtripWorld = transformer.screenToWorld(screen);

        expect(roundtripWorld.x).toBeCloseTo(pt.x, 5);
        expect(roundtripWorld.y).toBeCloseTo(pt.y, 5);
      }
    }
  });

  it('correctly detects points inside vs outside arena in pillarbox regions', () => {
    const transformer = new CoordinateTransformer(900, 1600, {
      width: 1920,
      height: 1080,
    });
    const transform = transformer.getTransform();

    // Center of arena should be inside
    expect(
      transformer.isInsideArenaScreen({
        x: 1920 / 2,
        y: 1080 / 2,
      }),
    ).toBe(true);

    // Far left pillarbox region
    expect(
      transformer.isInsideArenaScreen({
        x: transform.offsetX - 50,
        y: 500,
      }),
    ).toBe(false);

    // Far right pillarbox region
    expect(
      transformer.isInsideArenaScreen({
        x: 1920 - 20,
        y: 500,
      }),
    ).toBe(false);
  });

  it('clamps coordinates to arena boundaries', () => {
    const transformer = new CoordinateTransformer();

    const clamped1 = transformer.clampToWorldBounds({ x: -50, y: 800 });
    expect(clamped1).toEqual({ x: 0, y: 800 });

    const clamped2 = transformer.clampToWorldBounds({ x: 950, y: 1700 });
    expect(clamped2).toEqual({
      x: ARENA_CONFIG.worldWidth,
      y: ARENA_CONFIG.worldHeight,
    });
  });
});
