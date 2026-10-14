import { describe, it, expect } from 'vitest';
import { ContinuousCollision } from '../../src/game/physics/continuousCollision';
import { CollisionSegment } from '../../src/geography/contracts';

describe('ContinuousCollision Swept-Circle Solver (Phase 02)', () => {
  const horizontalSegment: CollisionSegment = {
    id: 'seg-test-1',
    p1: { x: 100, y: 500 },
    p2: { x: 300, y: 500 },
    normal: { x: 0, y: -1 }, // Points upward (north)
    length: 200,
  };

  const candidate = {
    segment: horizontalSegment,
    featureId: 'island-test',
    isDynamicCrete: false,
  };

  it('detects impact against flat segment and computes exact time of impact and normal', () => {
    const radius = 14;
    // Ball starts at (200, 400) and moves downward to (200, 600)
    const p0 = { x: 200, y: 400 };
    const p1 = { x: 200, y: 600 };

    const hit = ContinuousCollision.sweepCircle(p0, p1, radius, [candidate]);

    expect(hit).not.toBeNull();
    // Distance from center to line is 500 - 400 = 100.
    // Circle touches when center is at 500 - 14 = 486.
    // Displacement is 200, so t = (486 - 400) / 200 = 86 / 200 = 0.43
    expect(hit!.t).toBeCloseTo(0.43, 2);
    expect(hit!.normal.x).toBeCloseTo(0, 4);
    expect(hit!.normal.y).toBeCloseTo(-1, 4);
    expect(hit!.point.x).toBeCloseTo(200, 1);
    expect(hit!.point.y).toBeCloseTo(500, 1);
    expect(hit!.isVertexHit).toBe(false);
  });

  it('prevents high-speed tunneling across thin segment at maximum speed ceiling (1250 u/s)', () => {
    const radius = 14;

    // Fast ball traversing from Y = 400 straight through Y = 500 to Y = 650 (250 units in 1 step)
    const p0 = { x: 200, y: 400 };
    const p1 = { x: 200, y: 650 };

    const hit = ContinuousCollision.sweepCircle(p0, p1, radius, [candidate]);

    expect(hit).not.toBeNull();
    expect(hit!.t).toBeGreaterThan(0);
    expect(hit!.t).toBeLessThan(1.0);
    // Center at impact must be strictly above the segment
    const impactCenterY = p0.y + hit!.t * (p1.y - p0.y);
    expect(impactCenterY).toBeCloseTo(500 - radius, 1);
  });

  it('detects vertex impact at acute corner and computes radial outward normal', () => {
    const radius = 14;
    // Ball aimed directly at the left endpoint p1 (100, 500) from the north-west (50, 450)
    const p0 = { x: 50, y: 450 };
    const p1 = { x: 150, y: 550 };

    const hit = ContinuousCollision.sweepCircle(p0, p1, radius, [candidate]);

    expect(hit).not.toBeNull();
    expect(hit!.isVertexHit).toBe(true);
    expect(hit!.point.x).toBeCloseTo(100, 0);
    expect(hit!.point.y).toBeCloseTo(500, 0);

    // Normal must be a unit vector pointing outward
    const normLen = Math.hypot(hit!.normal.x, hit!.normal.y);
    expect(normLen).toBeCloseTo(1.0, 3);
  });

  it('ignores balls moving away from the surface (divergent velocity)', () => {
    const radius = 14;
    // Ball starts at (200, 450) and moves upward to (200, 300) away from segment
    const p0 = { x: 200, y: 450 };
    const p1 = { x: 200, y: 300 };

    const hit = ContinuousCollision.sweepCircle(p0, p1, radius, [candidate]);
    expect(hit).toBeNull();
  });

  it('handles grazing parallel trajectories without false positives', () => {
    const radius = 14;
    // Ball moves horizontally at Y = 450 (50 units above segment, radius is 14)
    const p0 = { x: 50, y: 450 };
    const p1 = { x: 350, y: 450 };

    const hit = ContinuousCollision.sweepCircle(p0, p1, radius, [candidate]);
    expect(hit).toBeNull();
  });
});
