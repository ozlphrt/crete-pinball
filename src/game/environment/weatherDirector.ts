import { Vector2D } from '../../types';
import { GameEventBus, WeatherEventType } from '../events/gameEventBus';
import { SeededRandom } from '../physics/seededRandom';

export interface WeatherConfig {
  readonly intervalSeconds: number; // e.g. 25s between events
  readonly eventDurationSeconds: number; // e.g. 10s duration
  readonly meltemiStrength: number; // +100 u/s² southward
  readonly crosswindStrength: number; // 80 u/s² horizontal
  readonly calmReduction: number; // -70 u/s² southward
  readonly enabled: boolean;
}

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  intervalSeconds: 25,
  eventDurationSeconds: 10,
  meltemiStrength: 100,
  crosswindStrength: 80,
  calmReduction: 70,
  enabled: true,
};

export class WeatherDirector {
  private config: WeatherConfig;
  private readonly eventBus: GameEventBus;
  private rng: SeededRandom;

  private currentType: WeatherEventType = 'none';
  private currentForce: Vector2D = { x: 0, y: 0 };
  private remainingDurationSeconds = 0;
  private timeUntilNextEventSeconds: number;

  constructor(
    config: WeatherConfig = DEFAULT_WEATHER_CONFIG,
    seed = 42,
    eventBus: GameEventBus = GameEventBus.getInstance(),
  ) {
    this.config = { ...config };
    this.eventBus = eventBus;
    this.rng = new SeededRandom(seed);
    this.timeUntilNextEventSeconds = this.config.intervalSeconds;
  }

  public getConfig(): WeatherConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<WeatherConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public setSeed(seed: number): void {
    this.rng = new SeededRandom(seed);
  }

  public get activeType(): WeatherEventType {
    return this.currentType;
  }

  public get activeForce(): Vector2D {
    return this.currentForce;
  }

  public get durationRemaining(): number {
    return this.remainingDurationSeconds;
  }

  public reset(): void {
    this.clearActiveEvent();
    this.timeUntilNextEventSeconds = this.config.intervalSeconds;
  }

  /**
   * Explicitly triggers a weather event (for testing or developer tuning panel).
   */
  public triggerEvent(type: WeatherEventType, direction: 'west' | 'east' = 'east'): void {
    if (!this.config.enabled || type === 'none') {
      this.clearActiveEvent();
      return;
    }

    this.currentType = type;
    this.remainingDurationSeconds = this.config.eventDurationSeconds;

    let desc = '';
    let heading = 180; // default south

    switch (type) {
      case 'meltemi': {
        this.currentForce = { x: 0, y: this.config.meltemiStrength };
        desc = '🌬️ MELTEMI GALE — Strong Southward Winds';
        heading = 180;
        break;
      }
      case 'crosswind': {
        const sign = direction === 'east' ? 1 : -1;
        this.currentForce = { x: sign * this.config.crosswindStrength, y: 0 };
        desc =
          sign > 0 ? '💨 CROSSWIND (EAST) — Drifting Right' : '💨 CROSSWIND (WEST) — Drifting Left';
        heading = sign > 0 ? 90 : 270;
        break;
      }
      case 'calm': {
        this.currentForce = { x: 0, y: -this.config.calmReduction };
        desc = '☀️ CALM SEAS — Gentle Waves & Reduced Gravity';
        heading = 0;
        break;
      }
    }

    this.eventBus.emit('weatherChanged', {
      type: this.currentType,
      intensity: Math.hypot(this.currentForce.x, this.currentForce.y),
      durationRemainingMs: this.remainingDurationSeconds * 1000,
      headingDegrees: heading,
      description: desc,
    });
  }

  public clearActiveEvent(): void {
    if (this.currentType !== 'none') {
      this.currentType = 'none';
      this.currentForce = { x: 0, y: 0 };
      this.remainingDurationSeconds = 0;
      this.eventBus.emit('weatherChanged', {
        type: 'none',
        intensity: 0,
        durationRemainingMs: 0,
        description: '',
      });
    }
  }

  /**
   * Advances simulation time. When paused, this method is not called.
   */
  public update(deltaSeconds: number): void {
    if (!this.config.enabled) {
      if (this.currentType !== 'none') this.clearActiveEvent();
      return;
    }

    if (this.currentType !== 'none') {
      this.remainingDurationSeconds -= deltaSeconds;
      if (this.remainingDurationSeconds <= 0) {
        this.clearActiveEvent();
        this.timeUntilNextEventSeconds = this.config.intervalSeconds;
      }
    } else {
      this.timeUntilNextEventSeconds -= deltaSeconds;
      if (this.timeUntilNextEventSeconds <= 0) {
        // Deterministically select next weather event
        const types: WeatherEventType[] = ['meltemi', 'crosswind', 'calm'];
        const chosen = types[this.rng.nextInt(0, types.length - 1)]!;
        const dir = this.rng.next() > 0.5 ? 'east' : 'west';
        this.triggerEvent(chosen, dir);
      }
    }
  }

  public exportState(): {
    type: WeatherEventType;
    forceX: number;
    forceY: number;
    remainingDurationSeconds: number;
  } {
    return {
      type: this.currentType,
      forceX: this.currentForce.x,
      forceY: this.currentForce.y,
      remainingDurationSeconds: Math.max(0, this.remainingDurationSeconds),
    };
  }

  public restoreState(state: {
    type: WeatherEventType;
    forceX: number;
    forceY: number;
    remainingDurationSeconds: number;
  }): void {
    if (!state || state.type === 'none' || state.remainingDurationSeconds <= 0) {
      this.clearActiveEvent();
      return;
    }

    this.currentType = state.type;
    this.currentForce = { x: state.forceX, y: state.forceY };
    this.remainingDurationSeconds = state.remainingDurationSeconds;

    this.eventBus.emit('weatherChanged', {
      type: this.currentType,
      intensity: Math.hypot(this.currentForce.x, this.currentForce.y),
      durationRemainingMs: this.remainingDurationSeconds * 1000,
      description: `${state.type.toUpperCase()} RESTORED`,
    });
  }
}
