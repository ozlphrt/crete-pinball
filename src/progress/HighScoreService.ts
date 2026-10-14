import { GameDifficulty } from '../types';
import {
  DifficultyHighScore,
  HighScoresRecord,
  SessionSummaryItem,
} from '../persistence/contracts';
import { GameDatabase } from '../persistence/GameDatabase';
import { DEFAULT_HIGH_SCORES } from '../persistence/storageAdapter';

export interface HighScoreEvaluation {
  readonly isNewRecord: boolean;
  readonly difficulty: GameDifficulty;
  readonly previousHighScore: number;
  readonly currentHighScore: number;
}

export interface SessionRunData {
  readonly difficulty: GameDifficulty;
  readonly finalScore: number;
  readonly survivalDurationSeconds: number;
  readonly formattedDuration: string;
  readonly totalIslandHits: number;
  readonly distinctIslandsCount: number;
  readonly highestCombo: number;
}

export class HighScoreService {
  private static instance: HighScoreService | null = null;
  private readonly db: GameDatabase;
  private highScores: HighScoresRecord = { ...DEFAULT_HIGH_SCORES };

  public static getInstance(db?: GameDatabase): HighScoreService {
    if (!HighScoreService.instance) {
      HighScoreService.instance = new HighScoreService(db);
    }
    return HighScoreService.instance;
  }

  constructor(db?: GameDatabase) {
    this.db = db ?? GameDatabase.getInstance();
    this.loadHighScores();
  }

  public async loadHighScores(): Promise<void> {
    await this.db.init();
    this.highScores = await this.db.getHighScores();
  }

  public getHighScore(difficulty: GameDifficulty): DifficultyHighScore {
    return this.highScores[difficulty];
  }

  public getAllHighScores(): HighScoresRecord {
    return { ...this.highScores };
  }

  /**
   * Compares the completed run against the persisted best *before* updating.
   * Deterministic tie-breaking rule: higher score; or if equal score, longer survival duration.
   */
  public async evaluateAndRecord(run: SessionRunData): Promise<HighScoreEvaluation> {
    await this.loadHighScores();

    const currentRecord = this.highScores[run.difficulty];
    const previousHighScore = currentRecord.highScore;

    let isNewRecord = false;
    let shouldUpdateRecord = false;

    if (run.finalScore > currentRecord.highScore) {
      isNewRecord = true;
      shouldUpdateRecord = true;
    } else if (
      run.finalScore === currentRecord.highScore &&
      run.finalScore > 0 &&
      run.survivalDurationSeconds > currentRecord.longestSurvivalSeconds
    ) {
      // Tie-breaker: same score, longer survival
      shouldUpdateRecord = true;
    }

    const nowIso = new Date().toISOString();

    if (shouldUpdateRecord) {
      this.highScores = {
        ...this.highScores,
        [run.difficulty]: {
          highScore: Math.max(run.finalScore, currentRecord.highScore),
          longestSurvivalSeconds: Math.max(
            run.survivalDurationSeconds,
            currentRecord.longestSurvivalSeconds,
          ),
          highestCombo: Math.max(run.highestCombo, currentRecord.highestCombo),
          dateAchievedIso: nowIso,
        },
      };

      await this.db.saveHighScores(this.highScores);
    }

    // Add session summary to bounded history
    const summaryItem: SessionSummaryItem = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      difficulty: run.difficulty,
      finalScore: run.finalScore,
      survivalDurationSeconds: run.survivalDurationSeconds,
      formattedDuration: run.formattedDuration,
      totalIslandHits: run.totalIslandHits,
      distinctIslandsCount: run.distinctIslandsCount,
      highestCombo: run.highestCombo,
      completedAtIso: nowIso,
      isNewHighScore: isNewRecord,
    };

    await this.db.addSessionSummary(summaryItem);

    return {
      isNewRecord,
      difficulty: run.difficulty,
      previousHighScore,
      currentHighScore: this.highScores[run.difficulty].highScore,
    };
  }

  public async getRecentSessionSummaries(): Promise<readonly SessionSummaryItem[]> {
    const record = await this.db.getSessionSummaries();
    return record.summaries;
  }
}
