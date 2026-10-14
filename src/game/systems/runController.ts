import { GameDifficulty, GameState, makeIslandId, makeTimestampMs } from '../../types';
import { GameStateManager } from './gameStateManager';
import { ScoringSystem, QualifiedScoreEvent } from './scoringSystem';
import { ComboSystem } from './comboSystem';
import { LivesSystem } from './livesSystem';
import { BonusTargetSystem, BonusTarget } from './bonusTargetSystem';
import { DifficultySystem } from './difficultySystem';
import { SessionClock } from './sessionClock';
import { LocalStorageAdapter } from '../../persistence/storageAdapter';
import { PhysicsContactEvent } from '../physics/physicsWorld';
import { SpecialIslandSystem } from '../abilities/specialIslandSystem';
import { CreteEnergySystem } from '../abilities/creteEnergySystem';
import { MultiballSystem } from '../abilities/multiballSystem';
import { WeatherDirector } from '../environment/weatherDirector';
import { TimeDilationController } from '../environment/timeDilationController';
import { LandingPredictor } from '../assist/landingPredictor';
import { GamePlayStateSnapshot } from './contracts';

export interface RunSummary {
  readonly runId: string;
  readonly difficulty: GameDifficulty;
  readonly finalScore: number;
  readonly survivalSeconds: number;
  readonly formattedDuration: string;
  readonly totalIslandHits: number;
  readonly distinctIslandsCount: number;
  readonly highestCombo: number;
  readonly isNewHighScore: boolean;
  readonly previousHighScore: number;
}

export type ScoreEventListener = (event: QualifiedScoreEvent) => void;
export type LifeLostListener = (remainingLives: number) => void;
export type GameOverListener = (summary: RunSummary) => void;

export class RunController {
  private readonly stateManager: GameStateManager;
  private readonly comboSystem: ComboSystem;
  private readonly targetSystem: BonusTargetSystem;
  private readonly livesSystem: LivesSystem;
  private readonly scoringSystem: ScoringSystem;
  private readonly difficultySystem: DifficultySystem;
  private readonly sessionClock: SessionClock;
  private readonly storage: LocalStorageAdapter;

  // Phase 04 Advanced Arcade Systems
  private readonly specialIslandSystem: SpecialIslandSystem;
  private readonly creteEnergySystem: CreteEnergySystem;
  private readonly multiballSystem: MultiballSystem;
  private readonly weatherDirector: WeatherDirector;
  private readonly timeDilationController: TimeDilationController;
  private readonly landingPredictor: LandingPredictor;

  private currentRunId = '';
  private currentDifficultyHighScore = 0;
  private isNewBest = false;
  private resumeCountdownSeconds = 0;
  private resumeTimerId: ReturnType<typeof setInterval> | null = null;
  private autoSaveTimer = 0;

  private scoreListeners: ScoreEventListener[] = [];
  private lifeLostListeners: LifeLostListener[] = [];
  private gameOverListeners: GameOverListener[] = [];

  constructor(
    storage: LocalStorageAdapter,
    initialDifficulty: GameDifficulty = 'normal',
    stateManager = new GameStateManager('ready'),
    specialIslandSystem = new SpecialIslandSystem(),
    creteEnergySystem = new CreteEnergySystem(),
    multiballSystem = new MultiballSystem(),
    weatherDirector = new WeatherDirector(),
    timeDilationController = new TimeDilationController(),
    landingPredictor = new LandingPredictor(),
  ) {
    this.storage = storage;
    this.stateManager = stateManager;
    this.comboSystem = new ComboSystem();
    this.targetSystem = new BonusTargetSystem();
    this.livesSystem = new LivesSystem();
    this.scoringSystem = new ScoringSystem(this.comboSystem, this.targetSystem, this.livesSystem);
    this.difficultySystem = new DifficultySystem(initialDifficulty);
    this.sessionClock = new SessionClock();

    this.specialIslandSystem = specialIslandSystem;
    this.creteEnergySystem = creteEnergySystem;
    this.multiballSystem = multiballSystem;
    this.weatherDirector = weatherDirector;
    this.timeDilationController = timeDilationController;
    this.landingPredictor = landingPredictor;

    this.currentRunId = `run-${Date.now()}`;
  }

  public get state(): GameState {
    return this.stateManager.getState();
  }

  public get getStateManager(): GameStateManager {
    return this.stateManager;
  }

  public get score(): number {
    return this.scoringSystem.score;
  }

  public get lives(): number {
    return this.livesSystem.currentLives;
  }

  public get comboMultiplier(): number {
    return this.comboSystem.currentMultiplier;
  }

  public get highestCombo(): number {
    return this.comboSystem.highestMultiplier;
  }

  public get currentTarget(): BonusTarget {
    return this.targetSystem.currentTarget;
  }

  public get difficulty(): GameDifficulty {
    return this.difficultySystem.difficulty;
  }

  public getDifficultySystem(): DifficultySystem {
    return this.difficultySystem;
  }

  public getSpecialIslandSystem(): SpecialIslandSystem {
    return this.specialIslandSystem;
  }

  public getCreteEnergySystem(): CreteEnergySystem {
    return this.creteEnergySystem;
  }

  public getLivesSystem(): LivesSystem {
    return this.livesSystem;
  }

  public getMultiballSystem(): MultiballSystem {
    return this.multiballSystem;
  }

  public getWeatherDirector(): WeatherDirector {
    return this.weatherDirector;
  }

  public getTimeDilationController(): TimeDilationController {
    return this.timeDilationController;
  }

  public getLandingPredictor(): LandingPredictor {
    return this.landingPredictor;
  }

  public get formattedDuration(): string {
    return this.sessionClock.formattedDuration;
  }

  public get activeSeconds(): number {
    return this.sessionClock.elapsedSeconds;
  }

  public get totalHits(): number {
    return this.scoringSystem.islandHits;
  }

  public get distinctIslandsCount(): number {
    return this.scoringSystem.distinctIslandsCount;
  }

  public get highScoreForCurrentDifficulty(): number {
    return this.currentDifficultyHighScore;
  }

  public get isNewRecord(): boolean {
    return this.isNewBest;
  }

  public get countdown(): number {
    return this.resumeCountdownSeconds;
  }

  /**
   * Initializes or re-initializes a fresh run for the specified difficulty.
   */
  public startRun(difficulty: GameDifficulty = 'normal'): void {
    this.cancelResumeTimer();
    this.difficultySystem.setDifficulty(difficulty);
    this.currentRunId = `run-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.isNewBest = false;

    // Load existing high scores from storage
    const scores = this.storage.getHighScoresSync();
    this.currentDifficultyHighScore = scores[difficulty]?.highScore ?? 0;

    // Reset systems
    this.scoringSystem.reset();
    this.comboSystem.resetAll();
    this.livesSystem.reset();
    this.targetSystem.reset();
    this.sessionClock.reset();
    this.specialIslandSystem.reset();
    this.creteEnergySystem.reset();
    this.multiballSystem.reset();
    this.weatherDirector.reset();
    this.timeDilationController.reset();

    // Transition to ready
    if (this.stateManager.getState() !== 'ready') {
      if (this.stateManager.canTransitionTo('ready')) {
        this.stateManager.transitionTo('ready');
      } else {
        this.stateManager.forceState('ready');
      }
    }
  }

  /**
   * Launches the ball: transitions from 'ready' to 'playing'.
   */
  public launchBall(): boolean {
    if (this.stateManager.getState() === 'ready') {
      return this.stateManager.transitionTo('playing');
    }
    return false;
  }

  /**
   * Pauses an active run: transitions from 'playing' to 'paused'.
   */
  public pause(): boolean {
    if (this.stateManager.getState() === 'playing') {
      this.cancelResumeTimer();
      const transitioned = this.stateManager.transitionTo('paused');
      if (transitioned) {
        this.saveActiveSession();
      }
      return transitioned;
    }
    return false;
  }

  /**
   * Resumes a paused run with a 3-second countdown.
   */
  public resume(onCountdownTick?: (secsLeft: number) => void, onCompleted?: () => void): boolean {
    if (this.stateManager.getState() === 'paused') {
      this.stateManager.transitionTo('resumeCountdown');
      this.resumeCountdownSeconds = 3;
      if (onCountdownTick) onCountdownTick(3);

      this.resumeTimerId = setInterval(() => {
        this.resumeCountdownSeconds--;
        if (this.resumeCountdownSeconds > 0) {
          if (onCountdownTick) onCountdownTick(this.resumeCountdownSeconds);
        } else {
          this.cancelResumeTimer();
          if (this.stateManager.getState() === 'resumeCountdown') {
            this.stateManager.transitionTo('playing');
            if (onCompleted) onCompleted();
          }
        }
      }, 1000);

      return true;
    }
    return false;
  }

  private cancelResumeTimer(): void {
    if (this.resumeTimerId !== null) {
      clearInterval(this.resumeTimerId);
      this.resumeTimerId = null;
    }
  }

  /**
   * Processes a contact event from physics simulation.
   */
  public handleContact(
    event: PhysicsContactEvent,
    currentTick: number,
  ): QualifiedScoreEvent | null {
    if (this.stateManager.getState() !== 'playing') {
      return null;
    }

    // Check if power bounce was used on northern paddle contact
    if (event.isNorthernPaddleHit && event.isPowerBounceUsed) {
      this.creteEnergySystem.consumeArmedCharge(event.point, event.outgoingSpeed);
    }

    // Check special ability modifiers
    const scoreMultiplierModifier = this.specialIslandSystem.getActiveScoreMultiplier();
    let specialBonus = 0;
    let specialAbilityName: string | undefined;

    const specialStatus = this.specialIslandSystem.getStatus(event.featureId);
    if (
      specialStatus &&
      specialStatus.state === 'active' &&
      specialStatus.config.ability === 'bonus_points'
    ) {
      specialBonus = specialStatus.config.parameter;
      specialAbilityName = 'bonus_points';
    }

    const scoredEvent = this.scoringSystem.processContact(
      event,
      currentTick,
      scoreMultiplierModifier,
      specialBonus,
      specialAbilityName,
    );

    if (scoredEvent) {
      // Advance Crete power bounce charge on distinct island hit
      if (!scoredEvent.isRepeatHit) {
        this.creteEnergySystem.addComboCharge();
        // Check if combo triggers multiball
        this.multiballSystem.checkComboTrigger(scoredEvent.multiplier);
      }

      for (const listener of this.scoreListeners) {
        listener(scoredEvent);
      }
    }

    return scoredEvent;
  }

  /**
   * Called when ball fully escapes southern drain boundary.
   */
  public handleBallLost(ballId = 'ball-primary'): {
    remainingLives: number;
    isGameOver: boolean;
    isBonusExit: boolean;
  } {
    if (this.stateManager.getState() !== 'playing') {
      return {
        remainingLives: this.livesSystem.currentLives,
        isGameOver: false,
        isBonusExit: false,
      };
    }

    // Multiball exit handling: bonus balls do not deduct lives!
    const exitOutcome = this.multiballSystem.handleBallExit(ballId);
    if (exitOutcome.isBonusExit) {
      return {
        remainingLives: this.livesSystem.currentLives,
        isGameOver: false,
        isBonusExit: true,
      };
    }

    // Last active ball exited: normal life loss
    this.comboSystem.resetCombo();
    this.creteEnergySystem.onLifeLost();

    // Deduct exactly one life
    const { remainingLives, isGameOver } = this.livesSystem.loseLife();

    for (const listener of this.lifeLostListeners) {
      listener(remainingLives);
    }

    if (isGameOver) {
      this.handleGameOver();
    } else {
      this.stateManager.transitionTo('lifeLost');
      this.saveActiveSession();
    }

    return { remainingLives, isGameOver, isBonusExit: false };
  }

  /**
   * Signals that replacement ball has been repositioned and is ready for launch.
   */
  public handleBallRepositioned(): void {
    if (this.stateManager.getState() === 'lifeLost') {
      this.stateManager.transitionTo('ready');
      this.saveActiveSession();
    }
  }

  /**
   * Restores active session from a validated local save snapshot.
   */
  public restoreActiveSession(
    saved: import('../../persistence/contracts').SavedGameSession,
  ): boolean {
    if (!saved || saved.schemaVersion !== 1 || !saved.snapshot) {
      return false;
    }

    try {
      const snap = saved.snapshot;
      this.cancelResumeTimer();

      const diff = snap.difficulty;
      if (diff !== 'easy' && diff !== 'normal' && diff !== 'hard') {
        return false;
      }
      this.difficultySystem.setDifficulty(diff);

      const scores = this.storage.getHighScoresSync();
      this.currentDifficultyHighScore = scores[diff]?.highScore ?? 0;

      // Restore systems
      this.scoringSystem.restoreState({
        totalScore: Math.max(0, snap.score.currentScore),
        totalIslandHits: Math.max(0, snap.score.consecutiveDistinctIslands),
        distinctIslands: snap.score.lastHitIslandId ? [snap.score.lastHitIslandId] : [],
      });

      this.comboSystem.restoreState({
        multiplier: Math.min(5, Math.max(1, snap.score.comboMultiplier)),
        consecutiveDistinctCount: Math.max(0, snap.score.consecutiveDistinctIslands),
        highestMultiplierReached: Math.min(5, Math.max(1, snap.score.comboMultiplier)),
        lastDistinctIslandId: snap.score.lastHitIslandId,
        lastHitIslandId: snap.score.lastHitIslandId,
      });

      this.livesSystem.restoreState({
        lives: Math.max(0, snap.lives.currentLives),
        extraLivesEarned: Math.max(0, snap.lives.extraLivesEarned),
        awardedMilestones: [],
      });

      this.sessionClock.restore(Math.max(0, snap.simulatedTimeMs / 1000));

      // Restore Phase 04 systems
      if (snap.powerBounce) {
        this.creteEnergySystem.restoreState({
          charge: snap.powerBounce.chargeLevel,
          isArmed: snap.powerBounce.isArmed,
        });
      }

      if (snap.weather) {
        this.weatherDirector.restoreState({
          type: snap.weather.type,
          forceX: 0,
          forceY: snap.weather.intensity,
          remainingDurationSeconds: snap.weather.durationRemainingMs / 1000,
        });
      }

      if (snap.multiball) {
        this.multiballSystem.restoreState({
          isActive: snap.multiball.isActive,
          remainingMs: 0,
          activeBallIds: [...snap.multiball.activeBallIds],
        });
      }

      // Force state cleanly to 'paused' so the player can safely resume with the 3-second countdown
      this.stateManager.forceState('paused');

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Handles game over transition, high score update, and results capture.
   */
  private async handleGameOver(): Promise<void> {
    this.cancelResumeTimer();
    this.stateManager.transitionTo('gameOver');

    const finalScore = this.scoringSystem.score;
    const diff = this.difficultySystem.difficulty;
    this.isNewBest = finalScore > this.currentDifficultyHighScore;

    if (this.isNewBest) {
      this.currentDifficultyHighScore = finalScore;
      const scores = await this.storage.getHighScores();
      await this.storage.saveHighScores({
        ...scores,
        [diff]: {
          highScore: finalScore,
          longestSurvivalSeconds: Math.max(
            scores[diff]?.longestSurvivalSeconds ?? 0,
            this.sessionClock.elapsedSeconds,
          ),
          highestCombo: Math.max(
            scores[diff]?.highestCombo ?? 1,
            this.comboSystem.highestMultiplier,
          ),
          dateAchievedIso: new Date().toISOString(),
        },
      });
    }

    const summary = this.createSummary();
    for (const listener of this.gameOverListeners) {
      listener(summary);
    }

    // Clear active session snapshot on Game Over
    await this.storage.saveActiveSession(null);
  }

  public createSummary(): RunSummary {
    return {
      runId: this.currentRunId,
      difficulty: this.difficultySystem.difficulty,
      finalScore: this.scoringSystem.score,
      survivalSeconds: this.sessionClock.elapsedSeconds,
      formattedDuration: this.sessionClock.formattedDuration,
      totalIslandHits: this.scoringSystem.islandHits,
      distinctIslandsCount: this.scoringSystem.distinctIslandsCount,
      highestCombo: this.comboSystem.highestMultiplier,
      isNewHighScore: this.isNewBest,
      previousHighScore: this.currentDifficultyHighScore,
    };
  }

  /**
   * Active simulation update loop: advances active simulation time and triggers periodic auto-save.
   */
  public update(deltaSeconds: number): void {
    if (this.stateManager.getState() === 'playing') {
      this.sessionClock.advance(deltaSeconds);
      this.specialIslandSystem.update(deltaSeconds);
      this.multiballSystem.update(deltaSeconds);
      this.weatherDirector.update(deltaSeconds);
      this.timeDilationController.update(deltaSeconds);

      this.autoSaveTimer += deltaSeconds;
      if (this.autoSaveTimer >= 10) {
        this.autoSaveTimer = 0;
        this.saveActiveSession();
      }
    }
  }

  public onScore(listener: ScoreEventListener): () => void {
    this.scoreListeners.push(listener);
    return () => {
      this.scoreListeners = this.scoreListeners.filter((l) => l !== listener);
    };
  }

  public onLifeLost(listener: LifeLostListener): () => void {
    this.lifeLostListeners.push(listener);
    return () => {
      this.lifeLostListeners = this.lifeLostListeners.filter((l) => l !== listener);
    };
  }

  public onGameOver(listener: GameOverListener): () => void {
    this.gameOverListeners.push(listener);
    return () => {
      this.gameOverListeners = this.gameOverListeners.filter((l) => l !== listener);
    };
  }

  private async saveActiveSession(): Promise<void> {
    try {
      const weatherState = this.weatherDirector.exportState();
      const powerState = this.creteEnergySystem.exportState();
      const multiState = this.multiballSystem.exportState();

      await this.storage.saveActiveSession({
        schemaVersion: 1,
        geoDataVersion: 1,
        physicsRulesetVersion: 1,
        savedAtTimestamp: makeTimestampMs(Date.now()),
        snapshot: {
          state: this.stateManager.getState(),
          difficulty: this.difficultySystem.difficulty,
          score: {
            currentScore: this.scoringSystem.score,
            comboMultiplier: this.comboSystem.currentMultiplier,
            consecutiveDistinctIslands: this.comboSystem.consecutiveDistinctIslands,
            lastHitIslandId: this.comboSystem.lastHitId
              ? makeIslandId(this.comboSystem.lastHitId)
              : null,
            lastHitTimestamp: makeTimestampMs(Date.now()),
          },
          lives: {
            currentLives: this.livesSystem.currentLives,
            maxLives: this.livesSystem.maxLives,
            extraLivesEarned: this.livesSystem.extraLivesEarned,
          },
          weather: {
            isActive: weatherState.type !== 'none',
            type: weatherState.type,
            intensity: Math.hypot(weatherState.forceX, weatherState.forceY),
            durationRemainingMs: weatherState.remainingDurationSeconds * 1000,
          },
          powerBounce: {
            chargeLevel: powerState.charge,
            isArmed: powerState.isArmed,
          },
          multiball: {
            isActive: multiState.isActive,
            activeBallIds: multiState.activeBallIds,
          },
          simulatedTimeMs: this.sessionClock.elapsedMilliseconds,
        },
      });
    } catch {
      // safe fallback if storage fails
    }
  }

  public getPlayStateSnapshot(): GamePlayStateSnapshot {
    const weather = this.weatherDirector.exportState();
    return {
      state: this.stateManager.getState(),
      difficulty: this.difficulty,
      score: {
        currentScore: this.score,
        comboMultiplier: this.comboMultiplier,
        consecutiveDistinctIslands: this.distinctIslandsCount,
        lastHitIslandId: null,
        lastHitTimestamp: null,
      },
      lives: {
        currentLives: this.lives,
        maxLives: 3,
        extraLivesEarned: this.livesSystem.extraLivesEarned,
      },
      weather: {
        isActive: weather.type !== 'none' && weather.type !== 'calm',
        type: weather.type,
        intensity: Math.hypot(weather.forceX, weather.forceY),
        durationRemainingMs: weather.remainingDurationSeconds * 1000,
      },
      powerBounce: {
        chargeLevel: this.creteEnergySystem.charge,
        isArmed: this.creteEnergySystem.isArmed,
      },
      multiball: {
        isActive: this.multiballSystem.isActive,
        activeBallIds: ['ball-primary'],
      },
      simulatedTimeMs: this.activeSeconds * 1000,
    };
  }

  public destroy(): void {
    this.cancelResumeTimer();
    this.scoreListeners = [];
    this.lifeLostListeners = [];
    this.gameOverListeners = [];
  }
}
