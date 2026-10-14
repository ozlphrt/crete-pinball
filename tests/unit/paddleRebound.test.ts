import { describe, it, expect } from 'vitest';
import { PaddleRebound } from '../../src/game/physics/paddleRebound';
import { SweptHit } from '../../src/game/physics/continuousCollision';
import { PHYSICS_PRESETS } from '../../src/config';

describe('PaddleRebound Hybrid Physics (Phase 02)', () => {
  const config = PHYSICS_PRESETS.normal;
  const paddleY = 1460;
  const paddleHalfWidth = 216;

  const northernHit: SweptHit = {
    t: 0.5,
    point: { x: 450, y: 1400 },
    normal: { x: 0, y: -1 }, // North-facing
    segment: {
      id: 'crete-n-1',
      p1: { x: 400, y: 1400 },
      p2: { x: 500, y: 1400 },
      normal: { x: 0, y: -1 },
      length: 100,
    },
    featureId: 'island-crete',
    isDynamicCrete: true,
    isVertexHit: false,
  };

  const southernHit: SweptHit = {
    t: 0.5,
    point: { x: 450, y: 1530 },
    normal: { x: 0, y: 1 }, // South-facing
    segment: {
      id: 'crete-s-1',
      p1: { x: 400, y: 1530 },
      p2: { x: 500, y: 1530 },
      normal: { x: 0, y: 1 },
      length: 100,
    },
    featureId: 'island-crete',
    isDynamicCrete: true,
    isVertexHit: false,
  };

  it('classifies north-facing Crete hit as eligible paddle rebound', () => {
    const ballVelocity = { x: 0, y: 500 };
    const eligible = PaddleRebound.isEligibleNorthernContact(northernHit, ballVelocity, paddleY);
    expect(eligible).toBe(true);
  });

  it('classifies south-facing Crete hit as standard land collision', () => {
    const ballVelocity = { x: 0, y: -300 }; // Moving upward toward southern shore
    const eligible = PaddleRebound.isEligibleNorthernContact(southernHit, ballVelocity, paddleY);
    expect(eligible).toBe(false);

    // Rebound must reflect downward away from southern shore without paddle assist
    const res = PaddleRebound.computeRebound(
      southernHit,
      ballVelocity,
      450,
      paddleHalfWidth,
      0,
      config,
    );
    expect(res.isNorthernPaddleHit).toBe(false);
    expect(res.newVelocity.y).toBeGreaterThan(0); // Bounces downward back toward south
  });

  it('steers outgoing angle according to impact offset along Crete width', () => {
    const ballVelocity = { x: 0, y: 500 };
    const paddleX = 450;

    // 1. Center hit (x = 450)
    const centerHit: SweptHit = { ...northernHit, point: { x: 450, y: 1400 } };
    const centerRes = PaddleRebound.computeRebound(
      centerHit,
      ballVelocity,
      paddleX,
      paddleHalfWidth,
      0,
      config,
    );
    expect(centerRes.isNorthernPaddleHit).toBe(true);
    expect(centerRes.newVelocity.y).toBeLessThan(0); // Strictly northward
    expect(Math.abs(centerRes.newVelocity.x)).toBeLessThan(120); // Near vertical

    // 2. West tip hit (x = 300, offset left)
    const westHit: SweptHit = { ...northernHit, point: { x: 300, y: 1400 } };
    const westRes = PaddleRebound.computeRebound(
      westHit,
      ballVelocity,
      paddleX,
      paddleHalfWidth,
      0,
      config,
    );
    expect(westRes.isNorthernPaddleHit).toBe(true);
    expect(westRes.newVelocity.x).toBeLessThan(-50); // Directed to the left (north-west)
    expect(westRes.newVelocity.y).toBeLessThan(0);

    // 3. East tip hit (x = 600, offset right)
    const eastHit: SweptHit = { ...northernHit, point: { x: 600, y: 1400 } };
    const eastRes = PaddleRebound.computeRebound(
      eastHit,
      ballVelocity,
      paddleX,
      paddleHalfWidth,
      0,
      config,
    );
    expect(eastRes.isNorthernPaddleHit).toBe(true);
    expect(eastRes.newVelocity.x).toBeGreaterThan(50); // Directed to the right (north-east)
    expect(eastRes.newVelocity.y).toBeLessThan(0);
  });

  it('transfers bounded momentum from horizontal paddle movement', () => {
    const ballVelocity = { x: 0, y: 500 };
    const paddleX = 450;

    // Moving paddle rapidly to the right (vx = 800 u/s)
    const movingRightRes = PaddleRebound.computeRebound(
      northernHit,
      ballVelocity,
      paddleX,
      paddleHalfWidth,
      800,
      config,
    );
    expect(movingRightRes.newVelocity.x).toBeGreaterThan(100);

    // Moving paddle rapidly to the left (vx = -800 u/s)
    const movingLeftRes = PaddleRebound.computeRebound(
      northernHit,
      ballVelocity,
      paddleX,
      paddleHalfWidth,
      -800,
      config,
    );
    expect(movingLeftRes.newVelocity.x).toBeLessThan(-100);
  });

  it('strictly respects maximum speed ceiling on boosted rebounds', () => {
    // Fast incoming ball at 1000 u/s
    const fastVelocity = { x: 0, y: 1000 };
    const res = PaddleRebound.computeRebound(
      northernHit,
      fastVelocity,
      450,
      paddleHalfWidth,
      1100,
      config,
    );

    const speed = Math.hypot(res.newVelocity.x, res.newVelocity.y);
    expect(speed).toBeLessThanOrEqual(config.maxBallSpeed);
  });
});
