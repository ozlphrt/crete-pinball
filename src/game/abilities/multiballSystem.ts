import { GameEventBus } from '../events/gameEventBus';

export interface MultiballConfig {
  readonly triggerComboMultiplier: number; // e.g. 4 (reaching x4 combo triggers multiball)
  readonly durationMs: number; // e.g. 25000 ms (25s)
  readonly maxSimultaneousBalls: number; // strictly 3
  readonly enabled: boolean;
}

export const DEFAULT_MULTIBALL_CONFIG: MultiballConfig = {
  triggerComboMultiplier: 4,
  durationMs: 25000,
  maxSimultaneousBalls: 3,
  enabled: true,
};

export class MultiballSystem {
  private config: MultiballConfig;
  private readonly eventBus: GameEventBus;

  private active = false;
  private remainingDurationMs = 0;
  private activeBallIds: string[] = ['ball-primary'];

  // Callback to request physics world to spawn or retire balls
  private onSpawnBonusBallsCallback?: () => void;
  private onRetireBonusBallsCallback?: (survivingBallId?: string) => void;

  constructor(
    config: MultiballConfig = DEFAULT_MULTIBALL_CONFIG,
    eventBus: GameEventBus = GameEventBus.getInstance(),
  ) {
    this.config = { ...config };
    this.eventBus = eventBus;
  }

  public getConfig(): MultiballConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<MultiballConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public get isActive(): boolean {
    return this.active;
  }

  public get durationRemaining(): number {
    return this.remainingDurationMs;
  }

  public get activeBalls(): readonly string[] {
    return this.activeBallIds;
  }

  public onSpawnBonusBalls(cb: () => void): void {
    this.onSpawnBonusBallsCallback = cb;
  }

  public onRetireBonusBalls(cb: (survivingBallId?: string) => void): void {
    this.onRetireBonusBallsCallback = cb;
  }

  public reset(): void {
    this.active = false;
    this.remainingDurationMs = 0;
    this.activeBallIds = ['ball-primary'];
  }

  /**
   * Evaluates whether a combo multiplier change triggers multiball.
   */
  public checkComboTrigger(comboMultiplier: number): boolean {
    if (!this.config.enabled || this.active) return false;

    if (comboMultiplier >= this.config.triggerComboMultiplier) {
      return this.triggerMultiball();
    }
    return false;
  }

  /**
   * Explicitly triggers multiball (e.g. from developer panel or combo achievement).
   */
  public triggerMultiball(): boolean {
    if (this.active) return false; // Prevent stacking

    this.active = true;
    this.remainingDurationMs = this.config.durationMs;
    this.activeBallIds = ['ball-primary', 'ball-bonus-1', 'ball-bonus-2'];

    if (this.onSpawnBonusBallsCallback) {
      this.onSpawnBonusBallsCallback();
    }

    this.eventBus.emit('multiballStarted', {
      activeBallCount: 3,
      durationRemainingMs: this.remainingDurationMs,
    });

    return true;
  }

  /**
   * Advances simulation time for multiball countdown.
   */
  public update(deltaSeconds: number): void {
    if (!this.active) return;

    this.remainingDurationMs -= deltaSeconds * 1000;
    if (this.remainingDurationMs <= 0) {
      this.endMultiballByTimeout();
    }
  }

  /**
   * Called when any ball exits the south boundary.
   * Returns:
   * - isBonusExit: true if other balls still survive (NO life loss)
   * - isFinalDrain: true if no other balls survive (normal life loss)
   */
  public handleBallExit(ballId: string): { isBonusExit: boolean; isFinalDrain: boolean } {
    const idx = this.activeBallIds.indexOf(ballId);
    if (idx !== -1) {
      this.activeBallIds.splice(idx, 1);
    } else if (this.activeBallIds.length > 0) {
      // Robustness: pop one if specific ID not found (e.g. ball-primary was already lost)
      this.activeBallIds.pop();
    }

    if (this.active) {
      if (this.activeBallIds.length > 1) {
        // Still multiple balls active: bonus ball exit, no life lost
        return { isBonusExit: true, isFinalDrain: false };
      } else if (this.activeBallIds.length === 1) {
        // Exactly 1 ball remains: multiball naturally ends, surviving ball continues single-ball play
        this.active = false;
        this.remainingDurationMs = 0;
        this.eventBus.emit('multiballEnded', {
          survivingBallId: this.activeBallIds[0]!,
        });
        return { isBonusExit: true, isFinalDrain: false };
      } else {
        // Last ball exited: normal life loss
        this.active = false;
        this.remainingDurationMs = 0;
        this.activeBallIds = ['ball-primary'];
        return { isBonusExit: false, isFinalDrain: true };
      }
    }

    // Normal single ball mode
    this.activeBallIds = ['ball-primary'];
    return { isBonusExit: false, isFinalDrain: true };
  }

  /**
   * Called when multiball timer expires with multiple balls active.
   * Deterministically keeps one ball and safely retires bonus balls without life loss.
   */
  private endMultiballByTimeout(): void {
    if (!this.active) return;

    this.active = false;
    this.remainingDurationMs = 0;

    // Deterministically preserve ball-primary or first surviving ball
    const surviving = this.activeBallIds.includes('ball-primary')
      ? 'ball-primary'
      : (this.activeBallIds[0] ?? 'ball-primary');

    this.activeBallIds = [surviving];

    if (this.onRetireBonusBallsCallback) {
      this.onRetireBonusBallsCallback(surviving);
    }

    this.eventBus.emit('multiballEnded', {
      survivingBallId: surviving,
    });
  }

  public exportState(): {
    isActive: boolean;
    remainingMs: number;
    activeBallIds: string[];
  } {
    return {
      isActive: this.active,
      remainingMs: Math.max(0, this.remainingDurationMs),
      activeBallIds: [...this.activeBallIds],
    };
  }

  public restoreState(state: {
    isActive: boolean;
    remainingMs: number;
    activeBallIds: string[];
  }): void {
    if (!state) return;
    this.active = !!state.isActive;
    this.remainingDurationMs = Math.max(0, state.remainingMs);
    this.activeBallIds =
      Array.isArray(state.activeBallIds) && state.activeBallIds.length > 0
        ? [...state.activeBallIds]
        : ['ball-primary'];
  }
}
