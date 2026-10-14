import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsCollector } from '../../src/analytics/AnalyticsCollector';
import { GameDatabase } from '../../src/persistence/GameDatabase';
import { GameEventBus } from '../../src/game/events/gameEventBus';
import { ARENA_CONFIG } from '../../src/config';

describe('AnalyticsCollector', () => {
  let db: GameDatabase;
  let eventBus: GameEventBus;
  let collector: AnalyticsCollector;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();
    eventBus = new GameEventBus();

    collector = new AnalyticsCollector(db, eventBus);
    await collector.init();
  });

  it('bins spatial collision locations into a bounded 20x35 discrete grid', () => {
    // Top-left corner (0, 0) -> cell '0_0'
    collector.recordBounceLocation(10, 10);
    // Bottom-right corner -> cell '19_34'
    collector.recordBounceLocation(ARENA_CONFIG.worldWidth - 5, ARENA_CONFIG.worldHeight - 5);
    // Middle
    collector.recordBounceLocation(ARENA_CONFIG.worldWidth / 2, ARENA_CONFIG.worldHeight / 2);

    const data = collector.getAnalyticsData();
    expect(data.heatmapGrid['0_0']).toBe(1);
    expect(data.heatmapGrid['19_34']).toBe(1);
    expect(data.heatmapGrid['10_17']).toBe(1);

    // Number of active cells should be exactly 3
    expect(Object.keys(data.heatmapGrid).length).toBe(3);
  });

  it('clamps extreme out-of-bound coordinates cleanly into boundary cells', () => {
    collector.recordBounceLocation(-500, -200);
    collector.recordBounceLocation(ARENA_CONFIG.worldWidth + 1000, ARENA_CONFIG.worldHeight + 2000);

    const data = collector.getAnalyticsData();
    expect(data.heatmapGrid['0_0']).toBe(1);
    expect(data.heatmapGrid['19_34']).toBe(1);
  });

  it('accurately computes Crete paddle save rate', () => {
    // 3 saves (catches), 1 miss
    collector.recordCreteRebound(false);
    collector.recordCreteRebound(true);
    collector.recordCreteRebound(false);
    collector.recordBallLost(550);

    const data = collector.getAnalyticsData();
    expect(data.totalNorthernCatches).toBe(3);
    expect(data.totalSouthernMisses).toBe(1);
    expect(data.saveRate).toBeCloseTo(0.75, 4);
  });

  it('categorizes ball loss speeds into correct telemetry buckets', () => {
    collector.recordBallLost(350); // <400
    collector.recordBallLost(500); // 400-600
    collector.recordBallLost(750); // 600-800
    collector.recordBallLost(950); // 800-1000
    collector.recordBallLost(1200); // >1000

    const data = collector.getAnalyticsData();
    expect(data.lossSpeedBuckets['<400']).toBe(1);
    expect(data.lossSpeedBuckets['400-600']).toBe(1);
    expect(data.lossSpeedBuckets['600-800']).toBe(1);
    expect(data.lossSpeedBuckets['800-1000']).toBe(1);
    expect(data.lossSpeedBuckets['>1000']).toBe(1);
  });

  it('respects user telemetry opt-out by ignoring events when disabled', () => {
    collector.setEnabled(false);

    collector.recordBounceLocation(200, 300);
    collector.recordCreteRebound(true);
    collector.recordBallLost(500);
    collector.recordAntiStuckActivated();

    const data = collector.getAnalyticsData();
    expect(Object.keys(data.heatmapGrid).length).toBe(0);
    expect(data.totalNorthernCatches).toBe(0);
    expect(data.totalSouthernMisses).toBe(0);
    expect(data.antiStuckActivations).toBe(0);
  });

  it('records session completion stats and combo distribution', () => {
    collector.recordSessionCompleted(120, 4);
    collector.recordSessionCompleted(80, 2);

    const data = collector.getAnalyticsData();
    expect(data.totalSessions).toBe(2);
    expect(data.totalSurvivalSeconds).toBe(200);
    expect(data.maxComboDistribution[4]).toBe(1);
    expect(data.maxComboDistribution[2]).toBe(1);
  });
});
