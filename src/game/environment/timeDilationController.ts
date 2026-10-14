import { GameEventBus } from '../events/gameEventBus';

export type SlowMotionState = 'ready' | 'active' | 'cooldown';

export interface TimeDilationConfig {
  readonly dilationFactor: number; // e.g. 0.6 (60% normal speed)
  readonly durationSeconds: number; // e.g. 1.2s
  readonly cooldownSeconds: number; // e.g. 12s
  readonly criticalZoneMinY: number; // 1300
  readonly criticalZoneMaxY: number; // 1420
  readonly minTriggerSpeedVy: number; // 400 u/s southward
  readonly enabled: boolean;
}

export const DEFAULT_TIME_DILATION_CONFIG: TimeDilationConfig = {
  dilationFactor: 0.6,
  durationSeconds: 1.2,
  cooldownSeconds: 12.0,
  criticalZoneMinY: 1300,
  criticalZoneMaxY: 1420,
  minTriggerSpeedVy: 400,
  enabled: true,
};

export class TimeDilationController {
  private config: TimeDilationConfig;
  private readonly eventBus: GameEventBus;

  private state: SlowMotionState = 'ready';
  private remainingSeconds = 0;
  private reducedMotion = false;

  constructor(
    config: TimeDilationConfig = DEFAULT_TIME_DILATION_CONFIG,
    eventBus: GameEventBus = GameEventBus.getInstance(),
  ) {
    this.config = { ...config };
    this.eventBus = eventBus;
  }

  public getConfig(): TimeDilationConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<TimeDilationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (this.reducedMotion && this.state === 'active') {
      this.cancelSlowMotion();
    }
  }

  public get currentState(): SlowMotionState {
    return this.state;
  }

  public get timeScale(): number {
    if (!this.config.enabled || this.reducedMotion || this.state !== 'active') {
      return 1.0;
    }
    return this.config.dilationFactor;
  }

  public reset(): void {
    this.state = 'ready';
    this.remainingSeconds = 0;
    this.eventBus.emit('slowMotionChanged', {
      active: false,
      factor: 1.0,
      durationRemainingMs: 0,
    });
  }

  /**
   * Checks if a descending ball enters the critical danger zone and triggers slow motion.
   */
  public checkCriticalApproach(ballY: number, ballVy: number): boolean {
    if (!this.config.enabled || this.reducedMotion || this.state !== 'ready') {
      return false;
    }

    if (
      ballY >= this.config.criticalZoneMinY &&
      ballY <= this.config.criticalZoneMaxY &&
      ballVy >= this.config.minTriggerSpeedVy
    ) {
      return this.triggerSlowMotion();
    }

    return false;
  }

  public triggerSlowMotion(): boolean {
    if (!this.config.enabled || this.reducedMotion || this.state !== 'ready') {
      return false;
    }

    this.state = 'active';
    this.remainingSeconds = this.config.durationSeconds;

    this.eventBus.emit('slowMotionChanged', {
      active: true,
      factor: this.config.dilationFactor,
      durationRemainingMs: this.remainingSeconds * 1000,
    });

    return true;
  }

  public cancelSlowMotion(): void {
    if (this.state === 'active') {
      this.state = 'cooldown';
      this.remainingSeconds = this.config.cooldownSeconds;

      this.eventBus.emit('slowMotionChanged', {
        active: false,
        factor: 1.0,
        durationRemainingMs: 0,
      });
    }
  }

  /**
   * Advances simulation time. When paused, this method is not called.
   */
  public update(deltaSeconds: number): void {
    if (this.state === 'active') {
      this.remainingSeconds -= deltaSeconds;
      if (this.remainingSeconds <= 0) {
        this.state = 'cooldown';
        this.remainingSeconds = this.config.cooldownSeconds;
        this.eventBus.emit('slowMotionChanged', {
          active: false,
          factor: 1.0,
          durationRemainingMs: 0,
        });
      }
    } else if (this.state === 'cooldown') {
      this.remainingSeconds -= deltaSeconds;
      if (this.remainingSeconds <= 0) {
        this.state = 'ready';
        this.remainingSeconds = 0;
      }
    }
  }

  public exportState(): {
    state: SlowMotionState;
    remainingSeconds: number;
  } {
    return {
      state: this.state,
      remainingSeconds: Math.max(0, this.remainingSeconds),
    };
  }

  public restoreState(state: { state: SlowMotionState; remainingSeconds: number }): void {
    if (!state) return;
    this.state = state.state;
    this.remainingSeconds = Math.max(0, state.remainingSeconds);
  }
}
