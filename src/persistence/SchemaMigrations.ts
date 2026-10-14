import { SCHEMA_VERSION } from '../config';
import {
  AchievementsRecord,
  FullBackupPayload,
  HighScoresRecord,
  IslandProgressRecord,
  UserPreferences,
} from './contracts';

export interface MigrationResult {
  readonly success: boolean;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly data: FullBackupPayload;
  readonly notes: string[];
}

/**
 * Migration registry and executor for versioned persistence schemas.
 */
export class SchemaMigrations {
  public static readonly CURRENT_VERSION = SCHEMA_VERSION;

  /**
   * Evaluates and applies schema upgrades if data comes from an older schema.
   */
  public static migrateBackupPayload(raw: unknown): MigrationResult {
    const notes: string[] = [];

    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid backup payload: expected an object');
    }

    const payload = raw as Partial<FullBackupPayload>;
    const rawVersion = payload.metadata?.schemaVersion ?? 1;

    let currentPayload = { ...payload } as FullBackupPayload;

    // Currently version 1 is baseline. Future schema migrations (e.g. 1 -> 2)
    // are applied sequentially here.
    if (rawVersion < SchemaMigrations.CURRENT_VERSION) {
      notes.push(`Migrated schema from v${rawVersion} to v${SchemaMigrations.CURRENT_VERSION}`);
    }

    // Ensure all required top-level records exist with defaults if missing
    currentPayload = SchemaMigrations.sanitizePayload(currentPayload, notes);

    return {
      success: true,
      fromVersion: rawVersion,
      toVersion: SchemaMigrations.CURRENT_VERSION,
      data: currentPayload,
      notes,
    };
  }

  /**
   * Sanitizes and fills any missing fields with backward-compatible defaults.
   */
  public static sanitizePayload(
    payload: Partial<FullBackupPayload>,
    _notes: string[] = [],
  ): FullBackupPayload {
    const nowIso = new Date().toISOString();

    const metadata = {
      schemaVersion: SchemaMigrations.CURRENT_VERSION,
      createdAtIso: payload.metadata?.createdAtIso || nowIso,
      lastModifiedIso: nowIso,
    };

    const preferences: UserPreferences = {
      locale: payload.preferences?.locale ?? 'en',
      theme: payload.preferences?.theme ?? 'dark-nautical',
      defaultDifficulty: payload.preferences?.defaultDifficulty ?? 'normal',
      soundVolume: payload.preferences?.soundVolume ?? 0.8,
      ambienceVolume: payload.preferences?.ambienceVolume === 0.4 ? 0.05 : (payload.preferences?.ambienceVolume ?? 0.05),
      musicVolume: payload.preferences?.musicVolume ?? 0.6,
      soundMuted: payload.preferences?.soundMuted ?? false,
      ambienceMuted: payload.preferences?.ambienceMuted ?? false,
      musicMuted: payload.preferences?.musicMuted ?? false,
      hapticsEnabled: payload.preferences?.hapticsEnabled ?? true,
      reducedMotion: payload.preferences?.reducedMotion ?? false,
      highContrast: payload.preferences?.highContrast ?? false,
      graphicsQuality: payload.preferences?.graphicsQuality ?? 'auto',
      tutorialCompleted: payload.preferences?.tutorialCompleted ?? false,
      analyticsEnabled: payload.preferences?.analyticsEnabled ?? true,
      developerMode: payload.preferences?.developerMode ?? false,
    };

    const highScores: HighScoresRecord = {
      easy: payload.highScores?.easy ?? {
        highScore: 0,
        longestSurvivalSeconds: 0,
        highestCombo: 1,
        dateAchievedIso: '',
      },
      normal: payload.highScores?.normal ?? {
        highScore: 0,
        longestSurvivalSeconds: 0,
        highestCombo: 1,
        dateAchievedIso: '',
      },
      hard: payload.highScores?.hard ?? {
        highScore: 0,
        longestSurvivalSeconds: 0,
        highestCombo: 1,
        dateAchievedIso: '',
      },
    };

    const islandProgress: IslandProgressRecord = {
      discoveredIslands: payload.islandProgress?.discoveredIslands ?? {},
    };

    const achievements: AchievementsRecord = {
      unlocked: payload.achievements?.unlocked ?? {},
    };

    const activeSession = payload.activeSession ?? null;
    const sessionSummaries = (payload as { sessionSummaries?: unknown[] }).sessionSummaries ?? [];

    return {
      metadata,
      preferences,
      highScores,
      islandProgress,
      achievements,
      activeSession,
      sessionSummaries: Array.isArray(sessionSummaries) ? sessionSummaries : [],
    } as FullBackupPayload;
  }
}
