import { GameDifficulty, GameState, IslandId, SupportedLocale, VisualThemeId } from '../types';
import {
  GamePlayStateSnapshot,
  LivesState,
  MultiballState,
  PowerBounceState,
  ScoreState,
  WeatherEventState,
} from '../game/systems/contracts';

export type GraphicsQuality = 'auto' | 'high' | 'medium' | 'low';

export interface UserPreferences {
  readonly locale: SupportedLocale;
  readonly theme: VisualThemeId;
  readonly defaultDifficulty: GameDifficulty;
  readonly soundVolume: number; // 0 to 1
  readonly ambienceVolume: number; // 0 to 1
  readonly musicVolume: number; // 0 to 1
  readonly soundMuted: boolean;
  readonly ambienceMuted: boolean;
  readonly musicMuted: boolean;
  readonly hapticsEnabled: boolean;
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
  readonly graphicsQuality: GraphicsQuality;
  readonly tutorialCompleted: boolean;
  readonly analyticsEnabled: boolean;
  readonly developerMode: boolean;
}

export interface DifficultyHighScore {
  readonly highScore: number;
  readonly longestSurvivalSeconds: number;
  readonly highestCombo: number;
  readonly dateAchievedIso: string;
}

export interface HighScoresRecord {
  readonly easy: DifficultyHighScore;
  readonly normal: DifficultyHighScore;
  readonly hard: DifficultyHighScore;
}

export interface IslandProgressItem {
  readonly islandId: IslandId;
  readonly firstHitDateIso: string;
  readonly lastHitDateIso?: string;
  readonly totalHitCount: number;
  readonly totalPointsContributed: number;
}

export interface IslandProgressRecord {
  readonly discoveredIslands: Record<string, IslandProgressItem>;
}

export interface AchievementItem {
  readonly achievementId: string;
  readonly unlockedAtIso: string;
}

export interface AchievementsRecord {
  readonly unlocked: Record<string, AchievementItem>;
}

export interface BallSnapshot {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin?: number;
  readonly ballId: string;
  readonly isBonus?: boolean;
}

export interface PaddleSnapshot {
  readonly x: number;
  readonly vx: number;
  readonly powerBounceCharge: number;
  readonly powerBounceArmed: boolean;
}

export interface FullSimulationSnapshot {
  readonly schemaVersion: number;
  readonly geoDataVersion: number;
  readonly physicsRulesetVersion: number;
  readonly savedAtTimestamp: number;
  readonly difficulty: GameDifficulty;
  readonly gameState: GameState;
  readonly score: ScoreState;
  readonly lives: LivesState;
  readonly weather: WeatherEventState;
  readonly powerBounce: PowerBounceState;
  readonly multiball: MultiballState;
  readonly balls: readonly BallSnapshot[];
  readonly paddle: PaddleSnapshot;
  readonly sessionHitCounts: Record<string, number>;
  readonly currentDropCount: number;
  readonly survivalDurationSeconds: number;
}

export interface SavedGameSession {
  readonly schemaVersion: number;
  readonly geoDataVersion: number;
  readonly physicsRulesetVersion: number;
  readonly savedAtTimestamp: number;
  readonly snapshot: GamePlayStateSnapshot;
  readonly fullSnapshot?: FullSimulationSnapshot;
}

export interface SessionSummaryItem {
  readonly id: string;
  readonly difficulty: GameDifficulty;
  readonly finalScore: number;
  readonly survivalDurationSeconds: number;
  readonly formattedDuration: string;
  readonly totalIslandHits: number;
  readonly distinctIslandsCount: number;
  readonly highestCombo: number;
  readonly completedAtIso: string;
  readonly isNewHighScore: boolean;
}

export interface SessionSummariesRecord {
  readonly summaries: readonly SessionSummaryItem[];
}

export interface AnalyticsDataRecord {
  readonly totalSessions: number;
  readonly totalSurvivalSeconds: number;
  readonly totalNorthernCatches: number;
  readonly totalSouthernMisses: number;
  readonly saveRate: number; // 0 to 1
  readonly maxComboDistribution: Record<number, number>; // 1..5 -> count
  readonly lossSpeedBuckets: Record<string, number>; // '<400', '400-600', '600-800', '800-1000', '>1000'
  readonly islandHitCounts: Record<string, number>; // islandId -> count
  readonly specialAbilitiesUsed: Record<string, number>; // abilityId -> count
  readonly multiballCount: number;
  readonly weatherEventsCount: number;
  readonly antiStuckActivations: number;
  readonly heatmapGrid: Record<string, number>; // 'col_row' -> count
  readonly lastUpdatedIso: string;
}

export interface StorageMetadata {
  readonly schemaVersion: number;
  readonly createdAtIso: string;
  readonly lastModifiedIso: string;
}

export interface FullBackupPayload {
  readonly metadata: StorageMetadata;
  readonly preferences: UserPreferences;
  readonly highScores: HighScoresRecord;
  readonly islandProgress: IslandProgressRecord;
  readonly achievements: AchievementsRecord;
  readonly sessionSummaries?: readonly SessionSummaryItem[];
  readonly activeSession: SavedGameSession | null;
}

export interface ImportReport {
  readonly success: boolean;
  readonly mode: 'merge' | 'replace';
  readonly updatedHighScores: string[];
  readonly newDiscoveriesCount: number;
  readonly newAchievementsCount: number;
  readonly warnings: string[];
}

export interface StorageMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(oldData: unknown): unknown;
}

export interface IStorageAdapter {
  init(): Promise<void>;
  getPreferences(): Promise<UserPreferences>;
  savePreferences(prefs: UserPreferences): Promise<void>;
  getPreferencesSync(): UserPreferences;
  savePreferencesSync(prefs: UserPreferences): void;
  getHighScores(): Promise<HighScoresRecord>;
  saveHighScores(scores: HighScoresRecord): Promise<void>;
  getIslandProgress(): Promise<IslandProgressRecord>;
  saveIslandProgress(progress: IslandProgressRecord): Promise<void>;
  getAchievements(): Promise<AchievementsRecord>;
  saveAchievements(achievements: AchievementsRecord): Promise<void>;
  getActiveSession(): Promise<SavedGameSession | null>;
  saveActiveSession(session: SavedGameSession | null): Promise<void>;
  getSessionSummaries?(): Promise<SessionSummariesRecord>;
  saveSessionSummaries?(summaries: SessionSummariesRecord): Promise<void>;
  getAnalyticsData?(): Promise<AnalyticsDataRecord>;
  saveAnalyticsData?(analytics: AnalyticsDataRecord): Promise<void>;
  exportFullBackup(): Promise<FullBackupPayload>;
  importFullBackup(payload: FullBackupPayload, mode: 'merge' | 'replace'): Promise<void>;
  clearAll(): Promise<void>;
}
