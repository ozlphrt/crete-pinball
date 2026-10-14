import { GameDifficulty, GameState, IslandId, TimestampMs } from '../../types';

export interface ScoreState {
  readonly currentScore: number;
  readonly comboMultiplier: number;
  readonly consecutiveDistinctIslands: number;
  readonly lastHitIslandId: IslandId | null;
  readonly lastHitTimestamp: TimestampMs | null;
}

export interface LivesState {
  readonly currentLives: number;
  readonly maxLives: number;
  readonly extraLivesEarned: number;
}

export interface WeatherEventState {
  readonly isActive: boolean;
  readonly type: 'meltemi' | 'crosswind' | 'calm' | 'none';
  readonly intensity: number;
  readonly durationRemainingMs: number;
}

export interface PowerBounceState {
  readonly chargeLevel: number; // 0 to 1
  readonly isArmed: boolean;
}

export interface MultiballState {
  readonly isActive: boolean;
  readonly activeBallIds: readonly string[];
}

export interface GamePlayStateSnapshot {
  readonly state: GameState;
  readonly difficulty: GameDifficulty;
  readonly score: ScoreState;
  readonly lives: LivesState;
  readonly weather: WeatherEventState;
  readonly powerBounce: PowerBounceState;
  readonly multiball: MultiballState;
  readonly simulatedTimeMs: number;
}
