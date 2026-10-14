import { ARENA_CONFIG } from '../config';
import { GameEventBus } from '../game/events/gameEventBus';
import { AnalyticsDataRecord } from '../persistence/contracts';
import { GameDatabase } from '../persistence/GameDatabase';
import { DEFAULT_ANALYTICS } from '../persistence/storageAdapter';

export class AnalyticsCollector {
  private static instance: AnalyticsCollector | null = null;

  private readonly db: GameDatabase;
  private readonly eventBus: GameEventBus;
  private data: AnalyticsDataRecord = { ...DEFAULT_ANALYTICS };
  private isEnabled = true;
  private unregisterFns: (() => void)[] = [];

  // Heatmap dimensions: 20 cols x 35 rows over 900x1600
  public static readonly GRID_COLS = 20;
  public static readonly GRID_ROWS = 35;
  private static readonly CELL_WIDTH = ARENA_CONFIG.worldWidth / AnalyticsCollector.GRID_COLS;
  private static readonly CELL_HEIGHT = ARENA_CONFIG.worldHeight / AnalyticsCollector.GRID_ROWS;

  private saveDebounceTimer: number | null = null;

  public static getInstance(db?: GameDatabase, eventBus?: GameEventBus): AnalyticsCollector {
    if (!AnalyticsCollector.instance) {
      AnalyticsCollector.instance = new AnalyticsCollector(db, eventBus);
    }
    return AnalyticsCollector.instance;
  }

  constructor(db?: GameDatabase, eventBus?: GameEventBus) {
    this.db = db ?? GameDatabase.getInstance();
    this.eventBus = eventBus ?? GameEventBus.getInstance();
    this.init();
  }

  public async init(): Promise<void> {
    await this.db.init();
    const prefs = await this.db.getPreferences();
    this.isEnabled = prefs.analyticsEnabled ?? true;
    this.data = await this.db.getAnalyticsData();
    this.attachEventListeners();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getAnalyticsData(): AnalyticsDataRecord {
    return { ...this.data };
  }

  public recordBounceLocation(worldX: number, worldY: number): void {
    if (!this.isEnabled) return;

    const col = Math.min(
      AnalyticsCollector.GRID_COLS - 1,
      Math.max(0, Math.floor(worldX / AnalyticsCollector.CELL_WIDTH)),
    );
    const row = Math.min(
      AnalyticsCollector.GRID_ROWS - 1,
      Math.max(0, Math.floor(worldY / AnalyticsCollector.CELL_HEIGHT)),
    );
    const key = `${col}_${row}`;

    this.data.heatmapGrid[key] = (this.data.heatmapGrid[key] || 0) + 1;
  }

  public recordCreteRebound(_isCharged: boolean): void {
    if (!this.isEnabled) return;
    this.data = {
      ...this.data,
      totalNorthernCatches: this.data.totalNorthernCatches + 1,
    };
    this.recomputeSaveRate();
    this.scheduleDebouncedSave();
  }

  public recordBallLost(speedAtLoss: number): void {
    if (!this.isEnabled) return;
    this.data = {
      ...this.data,
      totalSouthernMisses: this.data.totalSouthernMisses + 1,
    };

    // Bucket loss speed
    let bucket = '>1000';
    if (speedAtLoss < 400) bucket = '<400';
    else if (speedAtLoss < 600) bucket = '400-600';
    else if (speedAtLoss < 800) bucket = '600-800';
    else if (speedAtLoss <= 1000) bucket = '800-1000';

    const currentBuckets = { ...this.data.lossSpeedBuckets };
    currentBuckets[bucket] = (currentBuckets[bucket] || 0) + 1;

    this.data = {
      ...this.data,
      lossSpeedBuckets: currentBuckets,
    };

    this.recomputeSaveRate();
    this.scheduleDebouncedSave();
  }

  public recordAntiStuckActivated(): void {
    if (!this.isEnabled) return;
    this.data = {
      ...this.data,
      antiStuckActivations: this.data.antiStuckActivations + 1,
    };
    this.scheduleDebouncedSave();
  }

  public recordSessionCompleted(survivalSeconds: number, highestCombo: number): void {
    if (!this.isEnabled) return;

    const comboClamped = Math.min(5, Math.max(1, Math.round(highestCombo)));
    const comboDist = { ...this.data.maxComboDistribution };
    comboDist[comboClamped] = (comboDist[comboClamped] || 0) + 1;

    this.data = {
      ...this.data,
      totalSessions: this.data.totalSessions + 1,
      totalSurvivalSeconds: this.data.totalSurvivalSeconds + survivalSeconds,
      maxComboDistribution: comboDist,
      lastUpdatedIso: new Date().toISOString(),
    };

    this.scheduleDebouncedSave(true);
  }

  private recomputeSaveRate(): void {
    const totalOps = this.data.totalNorthernCatches + this.data.totalSouthernMisses;
    const saveRate = totalOps > 0 ? this.data.totalNorthernCatches / totalOps : 0;
    this.data = { ...this.data, saveRate };
  }

  private attachEventListeners(): void {
    for (const unreg of this.unregisterFns) {
      unreg();
    }
    this.unregisterFns = [];

    // Island Hit
    const unregIsland = this.eventBus.on('islandHit', (evt) => {
      if (!this.isEnabled) return;
      this.recordBounceLocation(evt.impactPoint.x, evt.impactPoint.y);

      const hits = { ...this.data.islandHitCounts };
      hits[evt.islandId] = (hits[evt.islandId] || 0) + 1;
      this.data = { ...this.data, islandHitCounts: hits };
      this.scheduleDebouncedSave();
    });
    this.unregisterFns.push(unregIsland);

    // Crete Rebound
    const unregCrete = this.eventBus.on('creteRebound', (evt) => {
      if (!this.isEnabled) return;
      this.recordBounceLocation(evt.impactPoint.x, evt.impactPoint.y);
      this.recordCreteRebound(evt.isCharged);
    });
    this.unregisterFns.push(unregCrete);

    // Special Island
    const unregSpecial = this.eventBus.on('specialIslandActivated', (evt) => {
      if (!this.isEnabled) return;
      const abilities = { ...this.data.specialAbilitiesUsed };
      abilities[evt.ability] = (abilities[evt.ability] || 0) + 1;
      this.data = { ...this.data, specialAbilitiesUsed: abilities };
      this.scheduleDebouncedSave();
    });
    this.unregisterFns.push(unregSpecial);

    // Multiball
    const unregMulti = this.eventBus.on('multiballStarted', () => {
      if (!this.isEnabled) return;
      this.data = { ...this.data, multiballCount: this.data.multiballCount + 1 };
      this.scheduleDebouncedSave();
    });
    this.unregisterFns.push(unregMulti);

    // Weather
    const unregWeather = this.eventBus.on('weatherChanged', (evt) => {
      if (!this.isEnabled) return;
      if (evt.type !== 'none' && evt.type !== 'calm') {
        this.data = { ...this.data, weatherEventsCount: this.data.weatherEventsCount + 1 };
        this.scheduleDebouncedSave();
      }
    });
    this.unregisterFns.push(unregWeather);
  }

  private scheduleDebouncedSave(immediate = false): void {
    if (immediate) {
      if (this.saveDebounceTimer !== null) {
        clearTimeout(this.saveDebounceTimer);
        this.saveDebounceTimer = null;
      }
      this.db.saveAnalyticsData(this.data).catch(() => {});
      return;
    }

    if (this.saveDebounceTimer !== null) return;

    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.db.saveAnalyticsData(this.data).catch(() => {});
    }, 5000) as unknown as number;
  }

  public async clearAnalytics(): Promise<void> {
    this.data = { ...DEFAULT_ANALYTICS, lastUpdatedIso: new Date().toISOString() };
    await this.db.saveAnalyticsData(this.data);
  }

  public exportAnalyticsJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public destroy(): void {
    for (const unreg of this.unregisterFns) {
      unreg();
    }
    this.unregisterFns = [];
    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
  }
}
