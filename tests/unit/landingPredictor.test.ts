import { describe, it, expect } from 'vitest';
import { LandingPredictor } from '../../src/game/assist/landingPredictor';
import { SpatialHashGrid } from '../../src/game/physics/spatialHashGrid';
import { CollisionSegment } from '../../src/geography/contracts';

describe('LandingPredictor', () => {
  const predictor = new LandingPredictor();
  const grid = new SpatialHashGrid(75);

  it('predicts straight landing point when path is clear to Crete baseline (Y: 1460)', () => {
    const ballPos = { x: 450, y: 1200 };
    const ballVel = { x: 0, y: 400 };
    const ballRadius = 10;
    const effectiveGravity = { x: 0, y: 240 };

    const pred = predictor.predict(ballPos, ballVel, ballRadius, effectiveGravity, grid);
    expect(pred.isReliable).toBe(true);
    expect(pred.predictedLandingX).toBeCloseTo(450, 0);
    expect(pred.trajectoryPoints.length).toBeGreaterThan(2);
  });

  it('suppresses landing prediction when path is blocked by an intervening island', () => {
    const obstacleGrid = new SpatialHashGrid(75);
    const islandSeg: CollisionSegment = {
      id: 'island-test-seg',
      p1: { x: 400, y: 1300 },
      p2: { x: 500, y: 1300 },
      normal: { x: 0, y: -1 },
      length: 100,
    };
    obstacleGrid.insert(islandSeg, 'island-naxos', false);

    const ballPos = { x: 450, y: 1200 };
    const ballVel = { x: 0, y: 400 };
    const ballRadius = 10;
    const effectiveGravity = { x: 0, y: 240 };

    const pred = predictor.predict(ballPos, ballVel, ballRadius, effectiveGravity, obstacleGrid);
    // Because the intervening island blocks the path, prediction is marked unreliable and landing X is null
    expect(pred.isReliable).toBe(false);
    expect(pred.predictedLandingX).toBeNull();
  });

  it('incorporates wind horizontal force into landing prediction trajectory', () => {
    const ballPos = { x: 450, y: 1200 };
    const ballVel = { x: 0, y: 400 };
    const ballRadius = 10;
    const gravityWithEastWind = { x: 80, y: 240 };

    const pred = predictor.predict(ballPos, ballVel, ballRadius, gravityWithEastWind, grid);
    expect(pred.isReliable).toBe(true);
    // Eastward wind should drift landing X to the right (> 450)
    expect(pred.predictedLandingX).toBeGreaterThan(450);
  });

  it('suppresses prediction for balls moving northward away from Crete', () => {
    const ballPos = { x: 450, y: 1200 };
    const ballVel = { x: 0, y: -300 }; // Traveling upward
    const ballRadius = 10;
    const effectiveGravity = { x: 0, y: 240 };

    const pred = predictor.predict(ballPos, ballVel, ballRadius, effectiveGravity, grid);
    expect(pred.isReliable).toBe(false);
    expect(pred.predictedLandingX).toBeNull();
  });
});
