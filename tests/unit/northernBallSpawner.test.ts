import { describe, expect, it } from 'vitest';
import {
  VERIFIED_NORTHERN_SPAWNS,
  NorthernBallSpawner,
} from '../../src/game/physics/northernBallSpawner';
import { getStaticFeatures } from '../../src/geography/aegeanData';

function pointInRing(
  pt: { x: number; y: number },
  ring: readonly { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]!.x;
    const yi = ring[i]!.y;
    const xj = ring[j]!.x;
    const yj = ring[j]!.y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

describe('NorthernBallSpawner', () => {
  it('has at least 30 verified northern Aegean open water spawn coordinates', () => {
    expect(VERIFIED_NORTHERN_SPAWNS.length).toBeGreaterThanOrEqual(30);
  });

  it('guarantees every spawn candidate is in the northern arena boundary', () => {
    for (const coord of VERIFIED_NORTHERN_SPAWNS) {
      expect(coord.x).toBeGreaterThanOrEqual(250);
      expect(coord.x).toBeLessThanOrEqual(600);
      expect(coord.y).toBeGreaterThanOrEqual(220);
      expect(coord.y).toBeLessThanOrEqual(270);
    }
  });

  it('guarantees every spawn candidate is outside all land polygons with clearance >= 28u', () => {
    const minClearance = 28; // Ball collision radius is 14u, clearance >= 28u gives 2.0x radius buffer
    const features = getStaticFeatures();
    for (const coord of VERIFIED_NORTHERN_SPAWNS) {
      for (const feature of features) {
        // Must never be inside land polygon
        for (const poly of feature.geometry.polygons) {
          const isInside = pointInRing(coord, poly.outerRing);
          expect(
            isInside,
            `Coord (${coord.x}, ${coord.y}) tested inside feature ${feature.id}`,
          ).toBe(false);
        }

        // Clearance to all boundary segments
        for (const seg of feature.collisionSegments) {
          const dist = distToSegment(coord, seg.p1, seg.p2);
          expect(
            dist,
            `Coordinate (${coord.x}, ${coord.y}) is too close (${dist.toFixed(1)}u) to feature ${feature.id}`,
          ).toBeGreaterThanOrEqual(minClearance);
        }
      }
    }
  }, 15000);

  it('generates deterministic spawns when given the same seed', () => {
    const spawnerA = new NorthernBallSpawner(12345);
    const spawnerB = new NorthernBallSpawner(12345);

    for (let i = 0; i < 20; i++) {
      const spawnA = spawnerA.generateSpawn(i);
      const spawnB = spawnerB.generateSpawn(i);

      expect(spawnA.point.x).toBe(spawnB.point.x);
      expect(spawnA.point.y).toBe(spawnB.point.y);
      expect(spawnA.velocity.x).toBeCloseTo(spawnB.velocity.x, 5);
      expect(spawnA.velocity.y).toBeCloseTo(spawnB.velocity.y, 5);
      expect(spawnA.corridor).toBe(spawnB.corridor);
    }
  });

  it('spawns ball with strictly southward velocity and controlled horizontal angle', () => {
    const spawner = new NorthernBallSpawner(42);

    for (let i = 0; i < 100; i++) {
      const spawn = spawner.generateSpawn(i, 500);

      // Southward velocity: Vy >= 450 (90% of base 500) and <= 560
      expect(spawn.velocity.y).toBeGreaterThanOrEqual(440);
      expect(spawn.velocity.y).toBeLessThanOrEqual(560);

      // Controlled horizontal variation
      expect(Math.abs(spawn.velocity.x)).toBeLessThanOrEqual(130);

      // Spawn point strictly within arena bounds
      expect(spawn.point.x).toBeGreaterThanOrEqual(250);
      expect(spawn.point.x).toBeLessThanOrEqual(600);
      expect(spawn.point.y).toBeGreaterThanOrEqual(220);
      expect(spawn.point.y).toBeLessThanOrEqual(270);
    }
  });

  it('tests 500 different random seeds to confirm zero land collisions', () => {
    const features = getStaticFeatures();
    for (let seed = 1; seed <= 500; seed++) {
      const spawner = new NorthernBallSpawner(seed);
      const spawn = spawner.generateSpawn();

      // Verify spawn position clearance against all features
      for (const feature of features) {
        for (const poly of feature.geometry.polygons) {
          expect(pointInRing(spawn.point, poly.outerRing)).toBe(false);
        }
      }
    }
  });
});
