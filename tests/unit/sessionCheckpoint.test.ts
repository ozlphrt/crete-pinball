import { describe, it, expect, beforeEach } from 'vitest';
import { SessionCheckpointService } from '../../src/persistence/SessionCheckpointService';
import { GameDatabase } from '../../src/persistence/GameDatabase';
import { FullSimulationSnapshot } from '../../src/persistence/contracts';
import { GEO_DATA_VERSION, PHYSICS_RULESET_VERSION, SCHEMA_VERSION } from '../../src/config';
import { makeIslandId, makeTimestampMs } from '../../src/types';

describe('SessionCheckpointService', () => {
  let db: GameDatabase;
  let service: SessionCheckpointService;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();
    service = new SessionCheckpointService(db);
  });

  const sampleSnapshot: FullSimulationSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    geoDataVersion: GEO_DATA_VERSION,
    physicsRulesetVersion: PHYSICS_RULESET_VERSION,
    savedAtTimestamp: 1770000000000,
    difficulty: 'normal',
    gameState: 'playing',
    score: {
      currentScore: 8400,
      comboMultiplier: 1.5,
      consecutiveDistinctIslands: 3,
      lastHitIslandId: makeIslandId('island-santorini'),
      lastHitTimestamp: makeTimestampMs(1770000000000),
    },
    lives: {
      currentLives: 3,
      maxLives: 3,
      extraLivesEarned: 0,
    },
    weather: {
      isActive: false,
      type: 'none',
      intensity: 0,
      durationRemainingMs: 0,
    },
    powerBounce: {
      isArmed: false,
      chargeLevel: 0.75,
    },
    multiball: {
      isActive: false,
      activeBallIds: ['ball_1'],
    },
    balls: [
      {
        ballId: 'ball_1',
        x: 450,
        y: 600,
        vx: 120,
        vy: -350,
        spin: 0,
      },
    ],
    paddle: {
      x: 460,
      vx: 20,
      powerBounceCharge: 0.75,
      powerBounceArmed: false,
    },
    sessionHitCounts: {
      'island-santorini': 3,
      'island-naxos': 2,
    },
    currentDropCount: 1,
    survivalDurationSeconds: 42.5,
  };

  it('saves and restores complete simulation snapshot when versions match', async () => {
    await service.saveCheckpoint(sampleSnapshot);

    const loaded = await service.loadCheckpoint();
    expect(loaded).not.toBeNull();
    expect(loaded?.score.currentScore).toBe(8400);
    expect(loaded?.balls.length).toBe(1);
    expect(loaded?.balls[0]?.vx).toBe(120);
    expect(loaded?.paddle.x).toBe(460);
    expect(loaded?.sessionHitCounts['island-santorini']).toBe(3);
    expect(loaded?.survivalDurationSeconds).toBe(42.5);
  });

  it('discards checkpoint and returns null when schemaVersion is incompatible', async () => {
    const incompatible = {
      ...sampleSnapshot,
      schemaVersion: 999, // Mismatched version
    };
    await service.saveCheckpoint(incompatible);

    // Override activeSession schemaVersion in db to test compatibility check
    const active = await db.getActiveSession();
    expect(active).not.toBeNull();
    if (active) {
      await db.saveActiveSession({
        ...active,
        schemaVersion: 999,
      });
    }

    const loaded = await service.loadCheckpoint();
    expect(loaded).toBeNull();

    // Checkpoint must have been cleared
    const afterCheck = await db.getActiveSession();
    expect(afterCheck).toBeNull();
  });

  it('discards checkpoint when physicsRulesetVersion or geoDataVersion is incompatible', async () => {
    await service.saveCheckpoint(sampleSnapshot);

    const active = await db.getActiveSession();
    if (active) {
      await db.saveActiveSession({
        ...active,
        physicsRulesetVersion: 999,
      });
    }

    const loaded = await service.loadCheckpoint();
    expect(loaded).toBeNull();
  });

  it('clears checkpoint atomically on demand', async () => {
    await service.saveCheckpoint(sampleSnapshot);
    expect(await service.loadCheckpoint()).not.toBeNull();

    await service.clearCheckpoint();
    expect(await service.loadCheckpoint()).toBeNull();
  });
});
