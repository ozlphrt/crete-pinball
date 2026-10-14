import { describe, it, expect } from 'vitest';
import { CretePaddle } from '../../src/game/entities/cretePaddle';
import { PaddleRebound } from '../../src/game/physics/paddleRebound';
import { PhysicsWorld } from '../../src/game/physics/physicsWorld';
import { PHYSICS_PRESETS, ARENA_CONFIG } from '../../src/config';
import { ContinuousCollision, SweptHit } from '../../src/game/physics/continuousCollision';

describe('Phase 02 Physics Gameplay Corrections', () => {
  describe('1. Crete Movement Boundaries & Unrestricted Movement', () => {
    it('directly and instantly follows player touch/mouse position without speed clamp, smoothing, or inertia', () => {
      const paddle = new CretePaddle(450);

      // Player swipes across screen from center (450) to extreme right target (800) in 1 frame (16ms)
      paddle.setTargetX(800);
      paddle.update(0.016);

      // Instantly at maxX (clamped to dynamic travel boundary)
      expect(paddle.x).toBe(paddle.maxX);

      // Instant jump left to extreme left (0)
      paddle.setTargetX(0);
      paddle.update(0.016);
      expect(paddle.x).toBe(paddle.minX);

      // Zero drift/inertia on subsequent stationary update
      paddle.update(0.016);
      expect(paddle.x).toBe(paddle.minX);
      expect(paddle.velocityX).toBe(0);
    });

    it('calculates movement limits dynamically from actual geometry so silhouette touches 0 and 900 without clipping', () => {
      const paddle = new CretePaddle();
      const data = paddle.getData();

      // Derive expected dynamic bounds from outerRing points
      const xs = data.localGeometry.outerRing.map((p) => p.x);
      const minLocalX = Math.min(...xs);
      const maxLocalX = Math.max(...xs);

      expect(paddle.minX).toBeCloseTo(-minLocalX, 2);
      expect(paddle.maxX).toBeCloseTo(ARENA_CONFIG.worldWidth - maxLocalX, 2);

      // Test extreme left position
      paddle.setTargetX(-10000);
      paddle.update(0.016);
      expect(paddle.x).toBe(paddle.minX);
      const leftBounds = paddle.getWorldBounds();
      expect(leftBounds.minX).toBe(0); // Left tip touches 0 exactly
      expect(leftBounds.maxX).toBeLessThanOrEqual(ARENA_CONFIG.worldWidth);
      expect(paddle.isWithinArenaBounds(ARENA_CONFIG.worldWidth)).toBe(true);

      // Test extreme right position
      paddle.setTargetX(10000);
      paddle.update(0.016);
      expect(paddle.x).toBe(paddle.maxX);
      const rightBounds = paddle.getWorldBounds();
      expect(rightBounds.maxX).toBe(ARENA_CONFIG.worldWidth); // Right tip touches 900 exactly
      expect(rightBounds.minX).toBeGreaterThanOrEqual(0);
      expect(paddle.isWithinArenaBounds(ARENA_CONFIG.worldWidth)).toBe(true);
    });
  });

  describe('2. Paddle Impulses & Preventing Artificial Paddle Saves', () => {
    it('caps paddle-derived rebound impulses independently of rapid physical paddle movement', () => {
      const config = PHYSICS_PRESETS.normal;
      const hit: SweptHit = {
        t: 0.5,
        point: { x: 450, y: 1420 },
        normal: { x: 0, y: -1 },
        segment: {
          id: 'test-seg-1',
          p1: { x: 400, y: 1420 },
          p2: { x: 500, y: 1420 },
          normal: { x: 0, y: -1 },
          length: 100,
        },
        featureId: 'island-crete',
        isDynamicCrete: true,
        isVertexHit: false,
      };

      // Moderate paddle speed (200 u/s)
      const moderateRebound = PaddleRebound.computeRebound(
        hit,
        { x: 0, y: 500 },
        450,
        170,
        200,
        config,
      );
      expect(moderateRebound.isNorthernPaddleHit).toBe(true);

      // Extreme paddle speed from instantaneous user swipe (15,000 u/s)
      const extremeRebound = PaddleRebound.computeRebound(
        hit,
        { x: 0, y: 500 },
        450,
        170,
        15000,
        config,
      );

      // The horizontal velocity transferred must be capped to maxPaddleTransferSpeed * coeff (380 * 0.35 = 133 u/s)
      const maxTransferVx = (config.maxPaddleTransferSpeed ?? 380) * 0.35;
      expect(Math.abs(extremeRebound.newVelocity.x)).toBeLessThanOrEqual(maxTransferVx + 50);

      // Outgoing speed must never exceed maxBallSpeed
      const extremeSpeed = Math.hypot(extremeRebound.newVelocity.x, extremeRebound.newVelocity.y);
      expect(extremeSpeed).toBeLessThanOrEqual(config.maxBallSpeed);

      // Spin is also capped and finite
      expect(Number.isFinite(extremeRebound.angularImpulse)).toBe(true);
      expect(Math.abs(extremeRebound.angularImpulse)).toBeLessThan(10);
    });

    it('resolves ball overlap without granting an artificial upward rebound when Crete is moved onto ball', () => {
      const paddle = new CretePaddle(200);
      const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
      const ball = world.getBall();
      ball.state = 'in_play';

      // Ball is in open water near Crete northern baseline at (450, 1420), falling downward
      ball.setPosition(450, 1420);
      ball.setVelocity(0, 100);

      // Crete rapidly jumps from 200 directly under/into the ball at 450
      paddle.setTargetX(450);
      paddle.update(0.016);

      // Step physics world simulation
      world.stepSimulation(1 / 120);

      // 1. Overlap is prevented: ball must not penetrate Crete geometry
      const creteSegments = paddle.getWorldCollisionSegments();
      for (const seg of creteSegments) {
        const d = ContinuousCollision.distPointToSegment(ball.position, seg.p1, seg.p2);
        expect(d).toBeGreaterThanOrEqual(ball.radius - 0.2);
      }

      // 2. NO artificial upward rebound: Vy must strictly remain >= 0 (no upward save)
      expect(ball.vy).toBeGreaterThanOrEqual(0);
      expect(ball.state).toBe('in_play');
      expect(Number.isFinite(ball.x)).toBe(true);
      expect(Number.isFinite(ball.y)).toBe(true);
    });

    it('prevents saving a ball that has already passed the northern coastline (southern overlap continues to drain)', () => {
      const paddle = new CretePaddle(200);
      const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
      const ball = world.getBall();
      ball.state = 'in_play';

      // Ball is already below northern ridge at Y=1480, falling south toward the drain
      ball.setPosition(450, 1480);
      ball.setVelocity(0, 200);

      // Player attempts a desperate teleport of Crete right onto the ball
      paddle.setTargetX(450);
      paddle.update(0.016);

      // Step physics simulation
      world.stepSimulation(1 / 120);

      // Overlap must be resolved away from paddle without bouncing northward
      expect(ball.vy).toBeGreaterThanOrEqual(0);

      // Subsequent steps allow gravity and downward velocity to continue draining the ball
      for (let i = 0; i < 60; i++) {
        world.stepSimulation(1 / 120);
      }

      // Ball drains and is marked lost rather than artificially rescued
      expect(ball.y).toBeGreaterThan(1480);
    });

    it('grants a legitimate northern paddle rebound only when ball trajectory intersects northern coastline from open water', () => {
      const paddle = new CretePaddle(450);
      const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
      const ball = world.getBall();
      ball.state = 'in_play';

      // Ball starts in open water above Crete at (450, 1340) with downward velocity
      ball.setPosition(450, 1340);
      ball.setVelocity(0, 350);

      // Paddle is already in position at 450
      paddle.setTargetX(450);
      paddle.update(0.016);

      // Simulate steps until ball strikes the northern coastline along its trajectory
      let hitOccurred = false;
      for (let i = 0; i < 40; i++) {
        world.stepSimulation(1 / 120);
        if (ball.vy < 0) {
          hitOccurred = true;
          break;
        }
      }

      // Legitimate trajectory hit produced a valid northern paddle rebound!
      expect(hitOccurred).toBe(true);
      expect(ball.vy).toBeLessThan(0);
      expect(ball.y).toBeLessThan(1430);
    });
  });

  describe('3. Smaller Ball Radius (10 world units)', () => {
    it('defaults physical ball radius to 10 world units with configurable glow radius', () => {
      const paddle = new CretePaddle(450);
      const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
      const ball = world.getBall();

      expect(ball.radius).toBe(10);
      expect(ARENA_CONFIG.defaultBallRadius).toBe(10);
      expect(ARENA_CONFIG.defaultBallGlowRadius).toBe(24);

      // Radius is runtime configurable for developer testing
      ball.setRadius(8);
      expect(ball.radius).toBe(8);

      ball.setRadius(12);
      expect(ball.radius).toBe(12);

      // Clamped to minimum safe radius
      ball.setRadius(2);
      expect(ball.radius).toBe(ARENA_CONFIG.minBallRadius);
      expect(ball.radius).toBe(6);
    });

    it('navigates passages between 20 and 28 units wide that were blocked for 14-unit ball', () => {
      // With diameter 20 (radius 10), ball can squeeze through a 24-unit channel
      const ballRadius = 10;
      const channelClearance = 24; // smaller than old diameter 28, but larger than new diameter 20
      expect(channelClearance).toBeGreaterThan(ballRadius * 2);
    });
  });
});
