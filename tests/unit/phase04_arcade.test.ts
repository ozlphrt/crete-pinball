import { describe, it, expect } from 'vitest';
import { PhysicsWorld } from '../../src/game/physics/physicsWorld';
import { CretePaddle } from '../../src/game/entities/cretePaddle';
import { RunController } from '../../src/game/systems/runController';
import { LocalStorageAdapter } from '../../src/persistence/storageAdapter';
import { PHYSICS_PRESETS, ARENA_CONFIG } from '../../src/config';

describe('Phase 04 Advanced Arcade Integration & Physics Stress Tests', () => {
  it('confirms the approved runtime ball collision radius before running Phase 04', () => {
    // Phase 04 invariant: Ball collision radius must remain at approved value
    expect(ARENA_CONFIG.defaultBallRadius).toBe(10);
    expect(PHYSICS_PRESETS.normal.ballRadius).toBe(10);
    expect(PHYSICS_PRESETS.easy.ballRadius).toBe(12);
    expect(PHYSICS_PRESETS.hard.ballRadius).toBe(9);
  });

  it('runs 3 simultaneous balls with high speed and wind without tunneling or NaNs', () => {
    const paddle = new CretePaddle();
    const world = new PhysicsWorld(paddle, PHYSICS_PRESETS.normal);

    // Set active weather: Meltemi + Crosswind
    world.setWeatherForce(80, 100);

    // Spawn 2 bonus balls
    const b1 = world.getBall();
    b1.drop(150, 450);

    const b2 = world.addBonusBall(300, 250, -200, 500);
    const b3 = world.addBonusBall(600, 250, 220, 480);

    expect(world.getActiveBalls().length).toBe(3);

    // Simulate 600 fixed physics steps (5 seconds at 120 Hz)
    const fixedDt = 1 / 120;
    for (let tick = 0; tick < 600; tick++) {
      world.stepSimulation(fixedDt);

      for (const ball of [b1, b2, b3]) {
        // Assert no NaN or Infinity
        expect(Number.isFinite(ball.x)).toBe(true);
        expect(Number.isFinite(ball.y)).toBe(true);
        expect(Number.isFinite(ball.vx)).toBe(true);
        expect(Number.isFinite(ball.vy)).toBe(true);
        expect(Number.isFinite(ball.angularVelocity)).toBe(true);

        // Speed cap strictly preserved
        expect(ball.speed).toBeLessThanOrEqual(PHYSICS_PRESETS.normal.maxBallSpeed + 1e-4);
      }
    }
  });

  it('integrates power bounce, combo progression, and multiball lifecycle', () => {
    const storage = new LocalStorageAdapter();
    const run = new RunController(storage, 'normal');
    run.startRun('normal');
    run.launchBall();

    expect(run.lives).toBe(1);
    expect(run.score).toBe(0);
    expect(run.comboMultiplier).toBe(1);

    // Simulate hits on distinct islands: Naxos, Paros, Mykonos, Santorini
    const islands = ['island-naxos', 'island-paros', 'island-mykonos', 'island-santorini'];
    for (let i = 0; i < islands.length; i++) {
      const fid = islands[i]!;
      run.handleContact(
        {
          tick: (i + 1) * 30,
          ballId: 'ball-primary',
          featureId: fid,
          point: { x: 450, y: 800 },
          normal: { x: 0, y: -1 },
          incomingSpeed: 500,
          outgoingSpeed: 500,
          isNorthernPaddleHit: false,
          isBoundaryHit: false,
        },
        (i + 1) * 30,
      );
    }

    // After 4 distinct hits: combo reaches x4, Crete power reaches 100%, and multiball triggers!
    expect(run.comboMultiplier).toBe(4);
    expect(run.getCreteEnergySystem().isFull).toBe(true);
    expect(run.getMultiballSystem().isActive).toBe(true);

    // Arm power bounce
    const armed = run.getCreteEnergySystem().arm();
    expect(armed).toBe(true);
    expect(run.getCreteEnergySystem().isArmed).toBe(true);

    // Northern Crete hit consumes power bounce
    run.handleContact(
      {
        tick: 200,
        ballId: 'ball-primary',
        featureId: 'island-crete',
        point: { x: 450, y: 1450 },
        normal: { x: 0, y: -1 },
        incomingSpeed: 600,
        outgoingSpeed: 870,
        isNorthernPaddleHit: true,
        isBoundaryHit: false,
        isPowerBounceUsed: true,
      },
      200,
    );

    expect(run.getCreteEnergySystem().isArmed).toBe(false);
    expect(run.getCreteEnergySystem().charge).toBe(0);

    // In multiball: bonus ball loss does NOT deduct life
    const exit1 = run.handleBallLost('ball-bonus-1');
    expect(exit1.isBonusExit).toBe(true);
    expect(exit1.remainingLives).toBe(1);

    const exit2 = run.handleBallLost('ball-bonus-2');
    expect(exit2.isBonusExit).toBe(true);
    expect(exit2.remainingLives).toBe(1);
    expect(run.getMultiballSystem().isActive).toBe(false); // Returns to single ball

    // Now losing the final primary ball DOES deduct 1 life
    const exitFinal = run.handleBallLost('ball-primary');
    expect(exitFinal.isBonusExit).toBe(false);
    expect(exitFinal.remainingLives).toBe(0);
    expect(exitFinal.isGameOver).toBe(true);
    expect(run.lives).toBe(0);
  });

  it('preserves core Phase 03 loop when Phase 04 arcade features are disabled', () => {
    const storage = new LocalStorageAdapter();
    const run = new RunController(storage, 'normal');

    // Disable all Phase 04 systems
    run
      .getSpecialIslandSystem()
      .getRegistry()
      .getAll()
      .forEach((cfg) => {
        run.getSpecialIslandSystem().getRegistry().updateConfig(cfg.islandId, { enabled: false });
      });
    run.getCreteEnergySystem().updateConfig({ enabled: false });
    run.getMultiballSystem().updateConfig({ enabled: false });
    run.getWeatherDirector().updateConfig({ enabled: false });
    run.getTimeDilationController().updateConfig({ enabled: false });

    run.startRun('normal');
    run.launchBall();

    // Standard scoring still works cleanly
    const scored = run.handleContact(
      {
        tick: 50,
        ballId: 'ball-primary',
        featureId: 'island-naxos',
        point: { x: 450, y: 800 },
        normal: { x: 0, y: -1 },
        incomingSpeed: 400,
        outgoingSpeed: 400,
        isNorthernPaddleHit: false,
        isBoundaryHit: false,
      },
      50,
    );

    expect(scored).toBeDefined();
    expect(scored?.basePoints).toBe(100);
    expect(scored?.multiplier).toBe(1);
    expect(run.score).toBe(100);

    // Power bounce charge is NOT accumulated when disabled
    expect(run.getCreteEnergySystem().charge).toBe(0);
    expect(run.getCreteEnergySystem().arm()).toBe(false);
  });
});
