import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../../src/game/physics/physicsWorld';
import { CretePaddle } from '../../src/game/entities/cretePaddle';
import { PHYSICS_PRESETS, ARENA_CONFIG } from '../../src/config';

describe('PhysicsWorld Simulation & Determinism (Phase 02)', () => {
  it('guarantees frame-rate independence across 30, 60, 90, and 120 FPS render schedules', () => {
    // Run identical scenario across 4 different display framerate schedules for exactly 1.0 second of real time
    const runSimulationWithFramerate = (
      frameDeltaMs: number,
    ): {
      tick: number;
      pos: { x: number; y: number };
      vel: { vx: number; vy: number };
    } => {
      const paddle = new CretePaddle(450);
      const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);

      // Launch ball northward
      world.getBall().launch(600, 0.1);

      const totalTimeMs = 1000; // 1 second
      const frames = Math.round(totalTimeMs / frameDeltaMs);

      for (let f = 0; f < frames; f++) {
        world.update(frameDeltaMs);
      }

      return {
        tick: world.getSimTick(),
        pos: { x: world.getBall().x, y: world.getBall().y },
        vel: { vx: world.getBall().vx, vy: world.getBall().vy },
      };
    };

    const result30fps = runSimulationWithFramerate(1000 / 30);
    const result60fps = runSimulationWithFramerate(1000 / 60);
    const result90fps = runSimulationWithFramerate(1000 / 90);
    const result120fps = runSimulationWithFramerate(1000 / 120);

    // Number of 120 Hz fixed ticks must match (120 ticks in 1000ms)
    expect(result60fps.tick).toBe(120);
    expect(result120fps.tick).toBe(120);

    // Ball positions must agree within 1 world unit tolerance across all framerates
    expect(Math.abs(result30fps.pos.x - result120fps.pos.x)).toBeLessThan(1.5);
    expect(Math.abs(result30fps.pos.y - result120fps.pos.y)).toBeLessThan(1.5);
    expect(Math.abs(result60fps.pos.x - result120fps.pos.x)).toBeLessThan(0.01);
    expect(Math.abs(result60fps.pos.y - result120fps.pos.y)).toBeLessThan(0.01);
    expect(Math.abs(result90fps.pos.x - result120fps.pos.x)).toBeLessThan(0.5);
    expect(Math.abs(result90fps.pos.y - result120fps.pos.y)).toBeLessThan(0.5);
  });

  it('applies gentle southward gravity accelerating ball downward in open water', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const ball = world.getBall();

    // Place in open water at (450, 600) with stationary initial velocity
    ball.setPosition(450, 600);
    ball.setVelocity(0, 0);
    ball.state = 'in_play';

    const dt = 1 / 120;

    // Step 60 ticks (0.5s)
    for (let i = 0; i < 60; i++) {
      world.stepSimulation(dt);
    }

    // Velocity must accelerate purely southward: vx = 0, vy ~ 240 * 0.5 = 120 u/s
    expect(ball.vx).toBe(0);
    expect(ball.vy).toBeCloseTo(120, 0);
    expect(ball.y).toBeGreaterThan(600);
  });

  it('reflects ball from open-water boundaries at north, west, and east', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const ball = world.getBall();
    ball.state = 'in_play';

    // 1. Test West Boundary (X = 0)
    ball.setPosition(11, 600);
    ball.setVelocity(-300, 0);
    world.stepSimulation(1 / 120);
    expect(ball.vx).toBeGreaterThan(0); // Reflected to the right
    expect(ball.x).toBeGreaterThanOrEqual(ball.radius);

    // 2. Test East Boundary (X = 900)
    ball.setPosition(889, 600);
    ball.setVelocity(300, 0);
    world.stepSimulation(1 / 120);
    expect(ball.vx).toBeLessThan(0); // Reflected to the left
    expect(ball.x).toBeLessThanOrEqual(ARENA_CONFIG.worldWidth - ball.radius);

    // 3. Test North Boundary (Y = 120)
    ball.setPosition(450, 131);
    ball.setVelocity(0, -300);
    world.stepSimulation(1 / 120);
    expect(ball.vy).toBeGreaterThan(0); // Reflected southward
    expect(ball.y).toBeGreaterThanOrEqual(120 + ball.radius);
  });

  it('keeps ball in play behind Crete until entire core crosses southern drain (Y = 1580)', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const ball = world.getBall();
    ball.state = 'in_play';

    // Position behind Crete at Y = 1550 (below Crete baseline 1460, but above 1580 drain)
    ball.setPosition(450, 1550);
    ball.setVelocity(0, 50);
    world.stepSimulation(1 / 120);

    // Still in play!
    expect(ball.state).toBe('in_play');

    // Move to Y = 1586 (center 1586 - radius 10 = 1576, not yet fully across 1580)
    ball.setPosition(450, 1586);
    world.stepSimulation(1 / 120);
    expect(ball.state).toBe('in_play');

    // Move to Y = 1595 (center 1595 - radius 10 = 1585 >= 1580: entire physical core crossed!)
    ball.setPosition(450, 1595);
    world.stepSimulation(1 / 120);
    expect(ball.state).toBe('lost');
  });

  it('activates anti-stuck assistance on trapped ball and applies corrective impulse', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const ball = world.getBall();
    ball.state = 'in_play';

    // Simulate ball trapped in a tiny corner for 140 ticks
    ball.setPosition(250, 750);
    ball.setVelocity(2, 2);

    for (let i = 0; i < 160; i++) {
      // Force position to remain confined in tiny spot
      ball.setPosition(250 + (i % 2), 750 + (i % 2));
      world.stepSimulation(1 / 120);
    }

    const lastEvent = world.getLastAntiStuckEvent();
    expect(lastEvent).not.toBeNull();
    expect(lastEvent!.impulse.y).toBeLessThan(0); // Pushes toward open water
  });

  it('creates and restores identical physics snapshots', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const ball = world.getBall();
    ball.state = 'in_play';
    ball.setPosition(320, 680);
    ball.setVelocity(250, -400);
    ball.angularVelocity = 3.5;

    const snapshot = world.createSnapshot();
    expect(snapshot.ball.x).toBe(320);
    expect(snapshot.ball.y).toBe(680);
    expect(snapshot.ball.vx).toBe(250);
    expect(snapshot.ball.vy).toBe(-400);

    // Mutate state
    ball.setPosition(100, 100);
    ball.setVelocity(0, 0);

    // Restore
    world.restoreSnapshot(snapshot);
    expect(ball.x).toBe(320);
    expect(ball.y).toBe(680);
    expect(ball.vx).toBe(250);
    expect(ball.vy).toBe(-400);
    expect(ball.angularVelocity).toBe(3.5);
  });

  it('correctly tracks active balls and promotes surviving bonus ball when primary was lost', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const primary = world.getBall();
    primary.state = 'in_play';

    expect(world.hasActiveBalls()).toBe(true);

    // Add bonus ball
    const bonus = world.addBonusBall(300, 500, 100, -200, 'ball-bonus-1');
    bonus.state = 'in_play';
    expect(world.hasActiveBalls()).toBe(true);

    // Primary ball drains earlier during multiball
    primary.markLost();
    expect(world.hasActiveBalls()).toBe(true); // Bonus ball is still active

    // Multiball ends by timeout, retiring bonus balls but promoting survivor
    world.retireBonusBalls('ball-bonus-1');

    // Primary ball must now be promoted with the survivor's position and in_play state!
    expect(primary.state).toBe('in_play');
    expect(primary.x).toBe(300);
    expect(primary.y).toBe(500);
    expect(primary.vx).toBe(100);
    expect(primary.vy).toBe(-200);
    expect(world.hasActiveBalls()).toBe(true);

    // Primary ball now drains
    primary.markLost();
    expect(world.hasActiveBalls()).toBe(false);
  });

  it('passes the actual ballId to onBallLostCallback on final ball drain', () => {
    const paddle = new CretePaddle(450);
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);
    const primary = world.getBall();
    primary.state = 'lost';

    const bonus = world.addBonusBall(450, ARENA_CONFIG.escapeBoundaryY + 20, 0, 100, 'ball-bonus-2');
    bonus.state = 'in_play';

    let lostBallId = '';
    world.setOnBallLost((ballId) => {
      lostBallId = ballId;
    });

    world.stepSimulation(1 / 120);

    expect(lostBallId).toBe('ball-bonus-2');
  });
});
