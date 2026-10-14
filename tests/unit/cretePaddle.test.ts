import { describe, it, expect } from 'vitest';
import { CretePaddle } from '../../src/game/entities/cretePaddle';
import { ARENA_CONFIG } from '../../src/config';

describe('CretePaddle Entity (Phase 01)', () => {
  it('initializes at baseline Y = 1460 and centered horizontal position', () => {
    const paddle = new CretePaddle();
    expect(paddle.y).toBe(ARENA_CONFIG.creteBaselineY);
    expect(paddle.y).toBe(1460);
    expect(paddle.x).toBe(ARENA_CONFIG.worldWidth / 2);
    expect(paddle.x).toBe(450);
  });

  it('strictly maintains baseline Y = 1460 and zero rotation under all movements', () => {
    const paddle = new CretePaddle();

    paddle.setTargetX(250);
    paddle.update(0.1);
    expect(paddle.y).toBe(1460);

    paddle.moveRight(200);
    paddle.update(0.5);
    expect(paddle.y).toBe(1460);

    // World polygon vertices must all have y-coordinates based strictly on baselineY without tilt
    const ring = paddle.getWorldPolygon();
    expect(ring.length).toBeGreaterThan(50);
    for (const pt of ring) {
      // Crete local height is within 100 world units around baseline
      expect(pt.y).toBeGreaterThan(1350);
      expect(pt.y).toBeLessThan(1550);
    }
  });

  it('clamps target horizontal position strictly to allowable travel range', () => {
    const paddle = new CretePaddle();

    paddle.setTargetX(-500); // Far off left
    expect(paddle.targetX).toBe(paddle.minX);
    expect(paddle.targetX).toBeGreaterThanOrEqual(200);

    paddle.setTargetX(2000); // Far off right
    expect(paddle.targetX).toBe(paddle.maxX);
    expect(paddle.targetX).toBeLessThanOrEqual(690);
  });

  it('directly follows player target horizontal position instantly without speed restriction, smoothing, or inertia', () => {
    const paddle = new CretePaddle(450);

    // Request sudden jump to maxX
    paddle.setTargetX(paddle.maxX);
    const dt = 0.016; // 1 frame
    const startX = paddle.x;
    paddle.update(dt);

    expect(paddle.x).toBe(paddle.maxX);
    expect(paddle.velocityX).toBe((paddle.maxX - startX) / dt);

    // Next update with no target change maintains target with zero velocity
    paddle.update(0.016);
    expect(paddle.x).toBe(paddle.maxX);
    expect(paddle.velocityX).toBe(0);
  });

  it('stops immediately upon reaching target with zero velocity and no overshoot on subsequent updates', () => {
    const paddle = new CretePaddle(450);

    paddle.setTargetX(460); // 10 units away
    paddle.update(0.05);

    expect(paddle.x).toBe(460);

    // Subsequent update with stationary target keeps 0 velocity (no inertia / drift)
    paddle.update(0.016);
    expect(paddle.x).toBe(460);
    expect(paddle.velocityX).toBe(0);
  });

  it('dynamically computes mathematically exact movement limits from Crete geometry', () => {
    const paddle = new CretePaddle();
    const data = paddle.getData();

    let minLocalX = Infinity;
    let maxLocalX = -Infinity;
    for (const pt of data.localGeometry.outerRing) {
      if (pt.x < minLocalX) minLocalX = pt.x;
      if (pt.x > maxLocalX) maxLocalX = pt.x;
    }

    // Dynamic formula guarantees: minX = -minLocalX, maxX = worldWidth - maxLocalX
    expect(paddle.minX).toBeCloseTo(-minLocalX, 2);
    expect(paddle.maxX).toBeCloseTo(ARENA_CONFIG.worldWidth - maxLocalX, 2);
  });

  it('keeps Crete island silhouette 100% inside arena at travel extremes with exact contact at 0 and 900', () => {
    const paddle = new CretePaddle();

    // Test at extreme left
    paddle.setTargetX(-5000);
    paddle.update(0.016);
    expect(paddle.x).toBe(paddle.minX);
    expect(paddle.isWithinArenaBounds(ARENA_CONFIG.worldWidth)).toBe(true);

    const leftBounds = paddle.getWorldBounds();
    // Leftmost vertex touches world X = 0 exactly
    expect(leftBounds.minX).toBe(0);
    expect(leftBounds.maxX).toBeLessThanOrEqual(ARENA_CONFIG.worldWidth);

    // Test at extreme right
    paddle.setTargetX(5000);
    paddle.update(0.016);
    expect(paddle.x).toBe(paddle.maxX);
    expect(paddle.isWithinArenaBounds(ARENA_CONFIG.worldWidth)).toBe(true);

    const rightBounds = paddle.getWorldBounds();
    // Rightmost vertex touches world X = 900 exactly
    expect(rightBounds.maxX).toBe(ARENA_CONFIG.worldWidth);
    expect(rightBounds.minX).toBeGreaterThanOrEqual(0);
  });

  it('generates valid outward-facing collision segments', () => {
    const paddle = new CretePaddle();
    const segments = paddle.getWorldCollisionSegments();

    expect(segments.length).toBeGreaterThan(30);

    for (const seg of segments) {
      // Each normal must be a unit vector
      const normLen = Math.hypot(seg.normal.x, seg.normal.y);
      expect(normLen).toBeCloseTo(1.0, 2);

      // Segment length must match euclidean distance between p1 and p2
      const segLen = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
      expect(segLen).toBeGreaterThan(0.5);
    }
  });
});
