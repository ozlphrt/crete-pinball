import { SCHEMA_VERSION } from '../config';
import {
  AchievementItem,
  AchievementsRecord,
  AnalyticsDataRecord,
  FullBackupPayload,
  HighScoresRecord,
  IStorageAdapter,
  IslandProgressRecord,
  SavedGameSession,
  SessionSummariesRecord,
  SessionSummaryItem,
  UserPreferences,
} from './contracts';
import {
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_ANALYTICS,
  DEFAULT_HIGH_SCORES,
  DEFAULT_ISLAND_PROGRESS,
  DEFAULT_PREFERENCES,
} from './storageAdapter';
import { SchemaMigrations } from './SchemaMigrations';

const DB_NAME = 'CretePinballDB';
const DB_VERSION = 1;

export class GameDatabase implements IStorageAdapter {
  private static instance: GameDatabase | null = null;

  private db: IDBDatabase | null = null;
  private isIndexedDbAvailable = false;
  private initPromise: Promise<void> | null = null;

  // In-memory cache & fallback store
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private highScores: HighScoresRecord = {
    easy: { ...DEFAULT_HIGH_SCORES.easy },
    normal: { ...DEFAULT_HIGH_SCORES.normal },
    hard: { ...DEFAULT_HIGH_SCORES.hard },
  };
  private islandProgress: IslandProgressRecord = { discoveredIslands: {} };
  private achievements: AchievementsRecord = { unlocked: {} };
  private activeSession: SavedGameSession | null = null;
  private sessionSummaries: SessionSummaryItem[] = [];
  private analyticsData: AnalyticsDataRecord = {
    ...DEFAULT_ANALYTICS,
    maxComboDistribution: { ...DEFAULT_ANALYTICS.maxComboDistribution },
    lossSpeedBuckets: { ...DEFAULT_ANALYTICS.lossSpeedBuckets },
    islandHitCounts: {},
    specialAbilitiesUsed: {},
    heatmapGrid: {},
  };

  private readonly storagePrefix = 'crete_pinball_';

  public static getInstance(): GameDatabase {
    if (!GameDatabase.instance) {
      GameDatabase.instance = new GameDatabase();
    }
    return GameDatabase.instance;
  }

  constructor() {
    this.checkIndexedDbSupport();
  }

  private checkIndexedDbSupport(): void {
    try {
      this.isIndexedDbAvailable =
        typeof window !== 'undefined' &&
        'indexedDB' in window &&
        window.indexedDB !== null &&
        window.indexedDB !== undefined;
    } catch {
      this.isIndexedDbAvailable = false;
    }
  }

  public async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      // First load any localStorage items as bootstrap
      this.loadFromLocalStorageFallback();

      if (this.isIndexedDbAvailable) {
        try {
          await this.openIndexedDb();
          await this.loadAllFromIndexedDb();
        } catch (err) {
          console.warn(
            '[GameDatabase] IndexedDB open/load failed, operating on memory/localStorage fallback:',
            err,
          );
          this.isIndexedDbAvailable = false;
        }
      }
    })();

    return this.initPromise;
  }

  private openIndexedDb(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('keyValueStore')) {
            db.createObjectStore('keyValueStore');
          }
          if (!db.objectStoreNames.contains('sessionSummaries')) {
            db.createObjectStore('sessionSummaries', { keyPath: 'id' });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private async loadAllFromIndexedDb(): Promise<void> {
    if (!this.db) return;

    try {
      const prefs = await this.getFromKvStore<UserPreferences>('preferences');
      if (prefs) this.preferences = { ...DEFAULT_PREFERENCES, ...prefs };

      const scores = await this.getFromKvStore<HighScoresRecord>('highScores');
      if (scores) this.highScores = { ...DEFAULT_HIGH_SCORES, ...scores };

      const islands = await this.getFromKvStore<IslandProgressRecord>('islandProgress');
      if (islands) this.islandProgress = { ...DEFAULT_ISLAND_PROGRESS, ...islands };

      const achs = await this.getFromKvStore<AchievementsRecord>('achievements');
      if (achs) this.achievements = { ...DEFAULT_ACHIEVEMENTS, ...achs };

      const session = await this.getFromKvStore<SavedGameSession>('activeSession');
      if (session) this.activeSession = session;

      const analytics = await this.getFromKvStore<AnalyticsDataRecord>('analytics');
      if (analytics) this.analyticsData = { ...DEFAULT_ANALYTICS, ...analytics };

      const summaries = await this.getAllFromObjectStore<SessionSummaryItem>('sessionSummaries');
      if (summaries && summaries.length > 0) {
        this.sessionSummaries = summaries;
      }
    } catch (e) {
      console.warn('[GameDatabase] Could not read all data from IndexedDB:', e);
    }
  }

  private loadFromLocalStorageFallback(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawPrefs = window.localStorage.getItem(`${this.storagePrefix}prefs`);
        if (rawPrefs) {
          this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(rawPrefs) };
        }

        const rawScores = window.localStorage.getItem(`${this.storagePrefix}scores`);
        if (rawScores) {
          this.highScores = { ...DEFAULT_HIGH_SCORES, ...JSON.parse(rawScores) };
        }

        const rawSession = window.localStorage.getItem(`${this.storagePrefix}session`);
        if (rawSession) {
          this.activeSession = JSON.parse(rawSession);
        }

        const rawIslands = window.localStorage.getItem(`${this.storagePrefix}islands`);
        if (rawIslands) {
          this.islandProgress = { ...DEFAULT_ISLAND_PROGRESS, ...JSON.parse(rawIslands) };
        }

        const rawAchs = window.localStorage.getItem(`${this.storagePrefix}achievements`);
        if (rawAchs) {
          this.achievements = { ...DEFAULT_ACHIEVEMENTS, ...JSON.parse(rawAchs) };
        }
      }
    } catch {
      // In-memory fallback
    }
  }

  private getFromKvStore<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      try {
        const tx = this.db.transaction('keyValueStore', 'readonly');
        const store = tx.objectStore('keyValueStore');
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private setInKvStore<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      try {
        const tx = this.db.transaction('keyValueStore', 'readwrite');
        const store = tx.objectStore('keyValueStore');
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  private getAllFromObjectStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve) => {
      if (!this.db) return resolve([]);
      try {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  // Synchronous getters/setters for fast render loop access
  public getPreferencesSync(): UserPreferences {
    return { ...this.preferences };
  }

  public savePreferencesSync(prefs: UserPreferences): void {
    this.preferences = { ...prefs };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${this.storagePrefix}prefs`, JSON.stringify(prefs));
      }
    } catch {
      // ignore
    }
    if (this.db) {
      this.setInKvStore('preferences', prefs).catch(() => {});
    }
  }

  public async getPreferences(): Promise<UserPreferences> {
    return { ...this.preferences };
  }

  public async savePreferences(prefs: UserPreferences): Promise<void> {
    this.preferences = { ...prefs };
    this.savePreferencesSync(prefs);
    if (this.db) {
      await this.setInKvStore('preferences', prefs);
    }
  }

  public async getHighScores(): Promise<HighScoresRecord> {
    return { ...this.highScores };
  }

  public getHighScoresSync(): HighScoresRecord {
    return { ...this.highScores };
  }

  public async saveHighScores(scores: HighScoresRecord): Promise<void> {
    this.highScores = { ...scores };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${this.storagePrefix}scores`, JSON.stringify(scores));
      }
    } catch {
      // ignore
    }
    if (this.db) {
      await this.setInKvStore('highScores', scores);
    }
  }

  public async getIslandProgress(): Promise<IslandProgressRecord> {
    return { discoveredIslands: { ...this.islandProgress.discoveredIslands } };
  }

  public getIslandProgressSync(): IslandProgressRecord {
    return { discoveredIslands: { ...this.islandProgress.discoveredIslands } };
  }

  public async saveIslandProgress(progress: IslandProgressRecord): Promise<void> {
    this.islandProgress = { discoveredIslands: { ...progress.discoveredIslands } };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${this.storagePrefix}islands`, JSON.stringify(progress));
      }
    } catch {
      // ignore
    }
    if (this.db) {
      await this.setInKvStore('islandProgress', progress);
    }
  }

  public async getAchievements(): Promise<AchievementsRecord> {
    return { unlocked: { ...this.achievements.unlocked } };
  }

  public getAchievementsSync(): AchievementsRecord {
    return { unlocked: { ...this.achievements.unlocked } };
  }

  public async saveAchievements(achievements: AchievementsRecord): Promise<void> {
    this.achievements = { ...achievements };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          `${this.storagePrefix}achievements`,
          JSON.stringify(achievements),
        );
      }
    } catch {
      // ignore
    }
    if (this.db) {
      await this.setInKvStore('achievements', achievements);
    }
  }

  public async getActiveSession(): Promise<SavedGameSession | null> {
    return this.activeSession ? { ...this.activeSession } : null;
  }

  public getActiveSessionSync(): SavedGameSession | null {
    return this.activeSession ? { ...this.activeSession } : null;
  }

  public async saveActiveSession(session: SavedGameSession | null): Promise<void> {
    this.activeSession = session ? { ...session } : null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (session) {
          window.localStorage.setItem(`${this.storagePrefix}session`, JSON.stringify(session));
        } else {
          window.localStorage.removeItem(`${this.storagePrefix}session`);
        }
      }
    } catch {
      // ignore
    }
    if (this.db) {
      await this.setInKvStore('activeSession', session);
    }
  }

  public clearActiveSessionSync(): void {
    this.activeSession = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`${this.storagePrefix}session`);
      }
    } catch {
      // ignore
    }
    if (this.db) {
      this.setInKvStore('activeSession', null).catch(() => {});
    }
  }

  public async getSessionSummaries(): Promise<SessionSummariesRecord> {
    return { summaries: [...this.sessionSummaries] };
  }

  public async saveSessionSummaries(record: SessionSummariesRecord): Promise<void> {
    this.sessionSummaries = [...record.summaries];
    if (this.db) {
      try {
        const tx = this.db.transaction('sessionSummaries', 'readwrite');
        const store = tx.objectStore('sessionSummaries');
        await new Promise<void>((resolve, reject) => {
          store.clear().onsuccess = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        for (const item of this.sessionSummaries) {
          store.put(item);
        }
      } catch (err) {
        console.warn('[GameDatabase] saveSessionSummaries error:', err);
      }
    }
  }

  public async addSessionSummary(summary: SessionSummaryItem): Promise<void> {
    // Keep bounded history of last 50 sessions
    this.sessionSummaries.unshift(summary);
    if (this.sessionSummaries.length > 50) {
      this.sessionSummaries = this.sessionSummaries.slice(0, 50);
    }
    await this.saveSessionSummaries({ summaries: this.sessionSummaries });
  }

  public async getAnalyticsData(): Promise<AnalyticsDataRecord> {
    return { ...this.analyticsData };
  }

  public async saveAnalyticsData(analytics: AnalyticsDataRecord): Promise<void> {
    this.analyticsData = { ...analytics };
    if (this.db) {
      await this.setInKvStore('analytics', analytics);
    }
  }

  public async exportFullBackup(): Promise<FullBackupPayload> {
    return {
      metadata: {
        schemaVersion: SCHEMA_VERSION,
        createdAtIso: new Date().toISOString(),
        lastModifiedIso: new Date().toISOString(),
      },
      preferences: await this.getPreferences(),
      highScores: await this.getHighScores(),
      islandProgress: await this.getIslandProgress(),
      achievements: await this.getAchievements(),
      sessionSummaries: this.sessionSummaries,
      activeSession: await this.getActiveSession(),
    };
  }

  public async importFullBackup(
    payload: FullBackupPayload,
    mode: 'merge' | 'replace',
  ): Promise<void> {
    const migration = SchemaMigrations.migrateBackupPayload(payload);
    const sanitized = migration.data;

    if (mode === 'replace') {
      await this.savePreferences(sanitized.preferences);
      await this.saveHighScores(sanitized.highScores);
      await this.saveIslandProgress(sanitized.islandProgress);
      await this.saveAchievements(sanitized.achievements);
      await this.saveActiveSession(sanitized.activeSession);
      if (sanitized.sessionSummaries) {
        await this.saveSessionSummaries({ summaries: sanitized.sessionSummaries });
      }
    } else {
      // Merge mode
      const mergedPrefs: UserPreferences = {
        ...this.preferences,
        ...sanitized.preferences,
      };

      const mergedScores: HighScoresRecord = {
        easy:
          (sanitized.highScores?.easy?.highScore ?? 0) > this.highScores.easy.highScore
            ? sanitized.highScores.easy
            : this.highScores.easy,
        normal:
          (sanitized.highScores?.normal?.highScore ?? 0) > this.highScores.normal.highScore
            ? sanitized.highScores.normal
            : this.highScores.normal,
        hard:
          (sanitized.highScores?.hard?.highScore ?? 0) > this.highScores.hard.highScore
            ? sanitized.highScores.hard
            : this.highScores.hard,
      };

      // Discovered islands merge: union of IDs, earliest first hit, latest last hit, max hits/points
      const mergedIslands: Record<string, (typeof this.islandProgress.discoveredIslands)[string]> =
        {
          ...this.islandProgress.discoveredIslands,
        };
      if (sanitized.islandProgress?.discoveredIslands) {
        for (const [id, item] of Object.entries(sanitized.islandProgress.discoveredIslands)) {
          const existing = mergedIslands[id];
          if (!existing) {
            mergedIslands[id] = item;
          } else {
            const firstHitDateIso =
              existing.firstHitDateIso < item.firstHitDateIso
                ? existing.firstHitDateIso
                : item.firstHitDateIso;
            const lastHitDateIso =
              (existing.lastHitDateIso ?? '') > (item.lastHitDateIso ?? '')
                ? existing.lastHitDateIso
                : item.lastHitDateIso;
            mergedIslands[id] = {
              islandId: existing.islandId,
              firstHitDateIso,
              lastHitDateIso,
              totalHitCount: Math.max(existing.totalHitCount, item.totalHitCount),
              totalPointsContributed: Math.max(
                existing.totalPointsContributed,
                item.totalPointsContributed,
              ),
            };
          }
        }
      }

      // Achievements merge: union of unlocked
      const mergedAchs: Record<string, AchievementItem> = {
        ...this.achievements.unlocked,
      };
      if (sanitized.achievements?.unlocked) {
        for (const [id, item] of Object.entries(sanitized.achievements.unlocked)) {
          if (!mergedAchs[id]) {
            mergedAchs[id] = item;
          }
        }
      }

      // Session summaries: deduplicate by id
      const existingIds = new Set(this.sessionSummaries.map((s) => s.id));
      const newSummaries = [...this.sessionSummaries];
      if (sanitized.sessionSummaries) {
        for (const s of sanitized.sessionSummaries) {
          if (!existingIds.has(s.id)) {
            newSummaries.push(s);
            existingIds.add(s.id);
          }
        }
      }

      await this.savePreferences(mergedPrefs);
      await this.saveHighScores(mergedScores);
      await this.saveIslandProgress({ discoveredIslands: mergedIslands });
      await this.saveAchievements({ unlocked: mergedAchs });
      await this.saveSessionSummaries({ summaries: newSummaries });
    }
  }

  public async clearAll(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.highScores = {
      easy: { ...DEFAULT_HIGH_SCORES.easy },
      normal: { ...DEFAULT_HIGH_SCORES.normal },
      hard: { ...DEFAULT_HIGH_SCORES.hard },
    };
    this.islandProgress = { discoveredIslands: {} };
    this.achievements = { unlocked: {} };
    this.activeSession = null;
    this.sessionSummaries = [];
    this.analyticsData = {
      ...DEFAULT_ANALYTICS,
      maxComboDistribution: { ...DEFAULT_ANALYTICS.maxComboDistribution },
      lossSpeedBuckets: { ...DEFAULT_ANALYTICS.lossSpeedBuckets },
      islandHitCounts: {},
      specialAbilitiesUsed: {},
      heatmapGrid: {},
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`${this.storagePrefix}prefs`);
        window.localStorage.removeItem(`${this.storagePrefix}scores`);
        window.localStorage.removeItem(`${this.storagePrefix}islands`);
        window.localStorage.removeItem(`${this.storagePrefix}achievements`);
        window.localStorage.removeItem(`${this.storagePrefix}session`);
      }
    } catch {
      // ignore
    }

    if (this.db) {
      try {
        const tx = this.db.transaction(['keyValueStore', 'sessionSummaries'], 'readwrite');
        tx.objectStore('keyValueStore').clear();
        tx.objectStore('sessionSummaries').clear();
      } catch (e) {
        console.warn('[GameDatabase] clearAll error:', e);
      }
    }
  }
}
