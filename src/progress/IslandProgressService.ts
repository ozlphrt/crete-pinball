import { getStaticFeatures } from '../geography/aegeanData';
import { IslandProgressItem, IslandProgressRecord } from '../persistence/contracts';
import { GameDatabase } from '../persistence/GameDatabase';
import { makeIslandId } from '../types';

export interface IslandHitResult {
  readonly islandId: string;
  readonly isNewDiscovery: boolean;
  readonly totalDiscoveredCount: number;
  readonly totalTrackableCount: number;
  readonly discoveryPercentage: number;
}

export class IslandProgressService {
  private static instance: IslandProgressService | null = null;

  private readonly db: GameDatabase;
  private progress: IslandProgressRecord = { discoveredIslands: {} };
  private sessionHits: Map<string, number> = new Map();
  private readonly trackableIslandIds: Set<string>;
  private readonly totalTrackableCount: number;

  // Rate limiter / deduplicator for physics ticks
  private lastHitTimes: Map<string, number> = new Map();

  public static getInstance(db?: GameDatabase): IslandProgressService {
    if (!IslandProgressService.instance) {
      IslandProgressService.instance = new IslandProgressService(db);
    }
    return IslandProgressService.instance;
  }

  constructor(db?: GameDatabase) {
    this.db = db ?? GameDatabase.getInstance();

    // Authoritative trackable islands calculation from dataset
    const staticFeatures = getStaticFeatures();
    const trackables = staticFeatures.filter(
      (f) => f.isTrackable && f.isCollidable && !f.classification.includes('mainland'),
    );

    this.trackableIslandIds = new Set(trackables.map((f) => f.id));
    this.totalTrackableCount = this.trackableIslandIds.size;

    this.loadProgress();
  }

  public async loadProgress(): Promise<void> {
    await this.db.init();
    const data = await this.db.getIslandProgress();
    this.progress = { discoveredIslands: { ...data.discoveredIslands } };
  }

  public resetSession(): void {
    this.sessionHits.clear();
    this.lastHitTimes.clear();
  }

  public getSessionHitCounts(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [id, count] of this.sessionHits.entries()) {
      res[id] = count;
    }
    return res;
  }

  public getSessionDistinctIslandsCount(): number {
    return this.sessionHits.size;
  }

  public getSessionTotalHits(): number {
    let total = 0;
    for (const count of this.sessionHits.values()) {
      total += count;
    }
    return total;
  }

  public isTrackable(islandId: string): boolean {
    return this.trackableIslandIds.has(islandId);
  }

  public isDiscovered(islandId: string): boolean {
    return Boolean(this.progress.discoveredIslands[islandId]);
  }

  public getIslandStats(islandId: string): IslandProgressItem | null {
    return this.progress.discoveredIslands[islandId] || null;
  }

  public getDiscoveredCount(): number {
    return Object.keys(this.progress.discoveredIslands).length;
  }

  public getTotalTrackableCount(): number {
    return this.totalTrackableCount;
  }

  public getDiscoveredPercentage(): number {
    if (this.totalTrackableCount === 0) return 0;
    return (this.getDiscoveredCount() / this.totalTrackableCount) * 100;
  }

  public getAllDiscoveredIds(): Set<string> {
    return new Set(Object.keys(this.progress.discoveredIslands));
  }

  /**
   * Records a collision hit on an island.
   * Updates session hits and lifetime discovery statistics atomically.
   */
  public async recordHit(
    islandId: string,
    points: number,
    timestampMs: number = Date.now(),
  ): Promise<IslandHitResult> {
    // Only track qualifying islands (exclude mainland & non-trackable islets)
    const isQualifying = this.trackableIslandIds.has(islandId);
    if (!isQualifying) {
      return {
        islandId,
        isNewDiscovery: false,
        totalDiscoveredCount: this.getDiscoveredCount(),
        totalTrackableCount: this.totalTrackableCount,
        discoveryPercentage: this.getDiscoveredPercentage(),
      };
    }

    // Deduplication check: prevent same-island double registration within 25ms
    const lastHit = this.lastHitTimes.get(islandId) ?? 0;
    if (timestampMs - lastHit < 25) {
      return {
        islandId,
        isNewDiscovery: false,
        totalDiscoveredCount: this.getDiscoveredCount(),
        totalTrackableCount: this.totalTrackableCount,
        discoveryPercentage: this.getDiscoveredPercentage(),
      };
    }
    this.lastHitTimes.set(islandId, timestampMs);

    // Update session hits
    const curSessionCount = this.sessionHits.get(islandId) ?? 0;
    this.sessionHits.set(islandId, curSessionCount + 1);

    // Update persistent lifetime records
    const nowIso = new Date(timestampMs).toISOString();
    let isNewDiscovery = false;

    const existing = this.progress.discoveredIslands[islandId];
    if (!existing) {
      isNewDiscovery = true;
      this.progress.discoveredIslands[islandId] = {
        islandId: makeIslandId(islandId),
        firstHitDateIso: nowIso,
        lastHitDateIso: nowIso,
        totalHitCount: 1,
        totalPointsContributed: points,
      };
    } else {
      this.progress.discoveredIslands[islandId] = {
        islandId: existing.islandId,
        firstHitDateIso: existing.firstHitDateIso,
        lastHitDateIso: nowIso,
        totalHitCount: existing.totalHitCount + 1,
        totalPointsContributed: existing.totalPointsContributed + points,
      };
    }

    // Persist to database
    await this.db.saveIslandProgress(this.progress);

    return {
      islandId,
      isNewDiscovery,
      totalDiscoveredCount: this.getDiscoveredCount(),
      totalTrackableCount: this.totalTrackableCount,
      discoveryPercentage: this.getDiscoveredPercentage(),
    };
  }
}
