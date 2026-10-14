import { SCHEMA_VERSION } from '../config';
import {
  AchievementsRecord,
  AnalyticsDataRecord,
  FullBackupPayload,
  HighScoresRecord,
  IslandProgressRecord,
  IStorageAdapter,
  SavedGameSession,
  UserPreferences,
} from './contracts';

export const DEFAULT_PREFERENCES: UserPreferences = {
  locale: 'en',
  theme: 'dark-nautical',
  defaultDifficulty: 'normal',
  soundVolume: 0.8,
  ambienceVolume: 0.4,
  musicVolume: 0.6,
  soundMuted: false,
  ambienceMuted: false,
  musicMuted: false,
  hapticsEnabled: true,
  reducedMotion: false,
  highContrast: false,
  graphicsQuality: 'auto',
  tutorialCompleted: false,
  analyticsEnabled: true,
  developerMode: false,
};

export const DEFAULT_HIGH_SCORES: HighScoresRecord = {
  easy: { highScore: 0, longestSurvivalSeconds: 0, highestCombo: 1, dateAchievedIso: '' },
  normal: { highScore: 0, longestSurvivalSeconds: 0, highestCombo: 1, dateAchievedIso: '' },
  hard: { highScore: 0, longestSurvivalSeconds: 0, highestCombo: 1, dateAchievedIso: '' },
};

export const DEFAULT_ISLAND_PROGRESS: IslandProgressRecord = {
  discoveredIslands: {},
};

export const DEFAULT_ACHIEVEMENTS: AchievementsRecord = {
  unlocked: {},
};

export const DEFAULT_ANALYTICS: AnalyticsDataRecord = {
  totalSessions: 0,
  totalSurvivalSeconds: 0,
  totalNorthernCatches: 0,
  totalSouthernMisses: 0,
  saveRate: 0,
  maxComboDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  lossSpeedBuckets: { '<400': 0, '400-600': 0, '600-800': 0, '800-1000': 0, '>1000': 0 },
  islandHitCounts: {},
  specialAbilitiesUsed: {},
  multiballCount: 0,
  weatherEventsCount: 0,
  antiStuckActivations: 0,
  heatmapGrid: {},
  lastUpdatedIso: '',
};

/**
 * Storage adapter implementing IStorageAdapter with in-memory store and optional
 * LocalStorage persistence. Serves as reliable adapter for Phase 00.
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private highScores: HighScoresRecord = { ...DEFAULT_HIGH_SCORES };
  private islandProgress: IslandProgressRecord = { ...DEFAULT_ISLAND_PROGRESS };
  private achievements: AchievementsRecord = { ...DEFAULT_ACHIEVEMENTS };
  private activeSession: SavedGameSession | null = null;
  private readonly storagePrefix = 'crete_pinball_';

  constructor() {
    this.initSync();
  }

  public initSync(): void {
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
      }
    } catch {
      // In-memory fallback if storage is restricted
    }
  }

  public async init(): Promise<void> {
    this.initSync();
  }

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
      // fallback
    }
  }

  public getHighScoresSync(): HighScoresRecord {
    return { ...this.highScores };
  }

  public getActiveSessionSync(): SavedGameSession | null {
    return this.activeSession ? { ...this.activeSession } : null;
  }

  public clearActiveSessionSync(): void {
    this.activeSession = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`${this.storagePrefix}session`);
      }
    } catch {
      // fallback
    }
  }

  public async getPreferences(): Promise<UserPreferences> {
    return { ...this.preferences };
  }

  public async savePreferences(prefs: UserPreferences): Promise<void> {
    this.preferences = { ...prefs };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${this.storagePrefix}prefs`, JSON.stringify(prefs));
      }
    } catch {
      // fallback
    }
  }

  public async getHighScores(): Promise<HighScoresRecord> {
    return { ...this.highScores };
  }

  public async saveHighScores(scores: HighScoresRecord): Promise<void> {
    this.highScores = { ...scores };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`${this.storagePrefix}scores`, JSON.stringify(scores));
      }
    } catch {
      // fallback
    }
  }

  public async getIslandProgress(): Promise<IslandProgressRecord> {
    return { ...this.islandProgress };
  }

  public async saveIslandProgress(progress: IslandProgressRecord): Promise<void> {
    this.islandProgress = { ...progress };
  }

  public async getAchievements(): Promise<AchievementsRecord> {
    return { ...this.achievements };
  }

  public async saveAchievements(achievements: AchievementsRecord): Promise<void> {
    this.achievements = { ...achievements };
  }

  public async getActiveSession(): Promise<SavedGameSession | null> {
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
      // fallback
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
      activeSession: await this.getActiveSession(),
    };
  }

  public async importFullBackup(
    payload: FullBackupPayload,
    mode: 'merge' | 'replace',
  ): Promise<void> {
    if (!payload?.metadata || payload.metadata.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `Incompatible or malformed backup schema version: ${payload?.metadata?.schemaVersion}`,
      );
    }

    if (mode === 'replace') {
      await this.savePreferences(payload.preferences ?? DEFAULT_PREFERENCES);
      await this.saveHighScores(payload.highScores ?? DEFAULT_HIGH_SCORES);
      await this.saveIslandProgress(payload.islandProgress ?? DEFAULT_ISLAND_PROGRESS);
      await this.saveAchievements(payload.achievements ?? DEFAULT_ACHIEVEMENTS);
      await this.saveActiveSession(payload.activeSession);
    } else {
      // Merge mode
      this.preferences = { ...this.preferences, ...payload.preferences };
      this.highScores = {
        easy:
          (payload.highScores?.easy?.highScore ?? 0) > this.highScores.easy.highScore
            ? payload.highScores.easy
            : this.highScores.easy,
        normal:
          (payload.highScores?.normal?.highScore ?? 0) > this.highScores.normal.highScore
            ? payload.highScores.normal
            : this.highScores.normal,
        hard:
          (payload.highScores?.hard?.highScore ?? 0) > this.highScores.hard.highScore
            ? payload.highScores.hard
            : this.highScores.hard,
      };
      this.islandProgress = {
        discoveredIslands: {
          ...this.islandProgress.discoveredIslands,
          ...payload.islandProgress?.discoveredIslands,
        },
      };
      this.achievements = {
        unlocked: {
          ...this.achievements.unlocked,
          ...payload.achievements?.unlocked,
        },
      };
      await this.savePreferences(this.preferences);
      await this.saveHighScores(this.highScores);
    }
  }

  public async clearAll(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.highScores = { ...DEFAULT_HIGH_SCORES };
    this.islandProgress = { ...DEFAULT_ISLAND_PROGRESS };
    this.achievements = { ...DEFAULT_ACHIEVEMENTS };
    this.activeSession = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`${this.storagePrefix}prefs`);
        window.localStorage.removeItem(`${this.storagePrefix}scores`);
      }
    } catch {
      // fallback
    }
  }
}
