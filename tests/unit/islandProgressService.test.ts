import { describe, it, expect, beforeEach } from 'vitest';
import { IslandProgressService } from '../../src/progress/IslandProgressService';
import { GameDatabase } from '../../src/persistence/GameDatabase';

describe('IslandProgressService', () => {
  let db: GameDatabase;
  let service: IslandProgressService;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();
    service = new IslandProgressService(db);
    await service.loadProgress();
    service.resetSession();
  });

  it('determines the authoritative trackable island count as exactly 75', () => {
    expect(service.getTotalTrackableCount()).toBe(75);
  });

  it('correctly distinguishes trackable islands from mainlands and visual islets', () => {
    expect(service.isTrackable('island-santorini')).toBe(true);
    expect(service.isTrackable('island-naxos')).toBe(true);
    expect(service.isTrackable('island-rhodes')).toBe(true);

    expect(service.isTrackable('mainland-greece')).toBe(false);
    expect(service.isTrackable('mainland-turkey')).toBe(false);
  });

  it('ignores hits on non-trackable geographical features', async () => {
    const res = await service.recordHit('mainland-greece', 100);
    expect(res.isNewDiscovery).toBe(false);
    expect(res.totalDiscoveredCount).toBe(0);
    expect(service.getSessionTotalHits()).toBe(0);
  });

  it('records first hit as a new discovery with accurate stats and timestamps', async () => {
    const now = 1770000000000;
    const res = await service.recordHit('island-santorini', 250, now);

    expect(res.isNewDiscovery).toBe(true);
    expect(res.totalDiscoveredCount).toBe(1);
    expect(res.totalTrackableCount).toBe(75);
    expect(res.discoveryPercentage).toBeCloseTo((1 / 75) * 100, 2);

    expect(service.isDiscovered('island-santorini')).toBe(true);
    expect(service.getSessionDistinctIslandsCount()).toBe(1);
    expect(service.getSessionTotalHits()).toBe(1);

    const stats = service.getIslandStats('island-santorini');
    expect(stats).not.toBeNull();
    expect(stats?.totalHitCount).toBe(1);
    expect(stats?.totalPointsContributed).toBe(250);
    expect(stats?.firstHitDateIso).toBe(new Date(now).toISOString());
  });

  it('throttles rapid duplicate hits on the same island within 25ms', async () => {
    const t0 = 1770000000000;
    await service.recordHit('island-naxos', 100, t0);
    expect(service.getSessionTotalHits()).toBe(1);

    // Hit 10ms later -> throttled
    const throttledRes = await service.recordHit('island-naxos', 100, t0 + 10);
    expect(throttledRes.isNewDiscovery).toBe(false);
    expect(service.getSessionTotalHits()).toBe(1);

    // Hit 35ms later -> registered
    const validRes = await service.recordHit('island-naxos', 100, t0 + 35);
    expect(validRes.isNewDiscovery).toBe(false);
    expect(service.getSessionTotalHits()).toBe(2);

    const stats = service.getIslandStats('island-naxos');
    expect(stats?.totalHitCount).toBe(2);
    expect(stats?.totalPointsContributed).toBe(200);
  });

  it('resets session hits while preserving lifetime discovered islands', async () => {
    await service.recordHit('island-rhodes', 300, 1000);
    await service.recordHit('island-kos', 200, 2000);

    expect(service.getSessionDistinctIslandsCount()).toBe(2);
    expect(service.getDiscoveredCount()).toBe(2);

    service.resetSession();

    expect(service.getSessionDistinctIslandsCount()).toBe(0);
    expect(service.getSessionTotalHits()).toBe(0);
    expect(service.getDiscoveredCount()).toBe(2);
    expect(service.isDiscovered('island-rhodes')).toBe(true);
    expect(service.isDiscovered('island-kos')).toBe(true);
  });
});
