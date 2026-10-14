import { Point2D, Vector2D } from '../../types';
import { GameEventBus, SpecialAbilityType } from '../events/gameEventBus';
import { SpecialIslandConfig, SpecialIslandRegistry } from './specialIslandRegistry';

export type IslandAbilityState = 'ready' | 'active' | 'cooldown';

export interface IslandRuntimeStatus {
  readonly islandId: string;
  readonly state: IslandAbilityState;
  readonly remainingMs: number;
  readonly config: SpecialIslandConfig;
}

export interface AbilityActivationResult {
  readonly activated: boolean;
  readonly ability?: SpecialAbilityType;
  readonly islandId: string;
  readonly islandName: string;
  readonly bonusPointsAwarded: number;
  readonly scoreMultiplierActive: number;
  readonly impulse?: Vector2D;
  readonly speedBoost?: number;
}

export class SpecialIslandSystem {
  private readonly registry: SpecialIslandRegistry;
  private readonly eventBus: GameEventBus;
  private statuses: Map<
    string,
    {
      state: IslandAbilityState;
      remainingMs: number;
    }
  > = new Map();

  // Active timed modifiers
  private activeScoreMultiplier = 1;
  private activeScoreMultiplierRemainingMs = 0;
  private activeSpeedBoostRemainingMs = 0;
  private activeSpeedBoostValue = 0;

  constructor(
    registry: SpecialIslandRegistry = new SpecialIslandRegistry(),
    eventBus: GameEventBus = GameEventBus.getInstance(),
  ) {
    this.registry = registry;
    this.eventBus = eventBus;
    this.reset();
  }

  public getRegistry(): SpecialIslandRegistry {
    return this.registry;
  }

  public reset(): void {
    this.statuses.clear();
    for (const cfg of this.registry.getAll()) {
      this.statuses.set(cfg.islandId, {
        state: 'ready',
        remainingMs: 0,
      });
    }
    this.activeScoreMultiplier = 1;
    this.activeScoreMultiplierRemainingMs = 0;
    this.activeSpeedBoostRemainingMs = 0;
    this.activeSpeedBoostValue = 0;
  }

  public getStatus(islandId: string): IslandRuntimeStatus | undefined {
    const cfg = this.registry.get(islandId);
    if (!cfg) return undefined;
    const st = this.statuses.get(islandId) ?? { state: 'ready', remainingMs: 0 };
    return {
      islandId,
      state: st.state,
      remainingMs: st.remainingMs,
      config: cfg,
    };
  }

  public getAllStatuses(): IslandRuntimeStatus[] {
    return this.registry.getAll().map((cfg) => {
      const st = this.statuses.get(cfg.islandId) ?? { state: 'ready', remainingMs: 0 };
      return {
        islandId: cfg.islandId,
        state: st.state,
        remainingMs: st.remainingMs,
        config: cfg,
      };
    });
  }

  /**
   * Returns the current active score multiplier from special abilities (e.g. Mykonos).
   * Note: This acts as a modifier on qualified scoring without raising the base combo cap of x5.
   */
  public getActiveScoreMultiplier(): number {
    return this.activeScoreMultiplier;
  }

  /**
   * Returns current active speed boost value (Rhodes).
   */
  public getActiveSpeedBoost(): number {
    return this.activeSpeedBoostValue;
  }

  /**
   * Advances simulation time. When paused, this method is simply not called.
   */
  public update(deltaSeconds: number): void {
    const deltaMs = deltaSeconds * 1000;

    // Advance timed global modifiers
    if (this.activeScoreMultiplierRemainingMs > 0) {
      this.activeScoreMultiplierRemainingMs -= deltaMs;
      if (this.activeScoreMultiplierRemainingMs <= 0) {
        this.activeScoreMultiplier = 1;
        this.activeScoreMultiplierRemainingMs = 0;
      }
    }

    if (this.activeSpeedBoostRemainingMs > 0) {
      this.activeSpeedBoostRemainingMs -= deltaMs;
      if (this.activeSpeedBoostRemainingMs <= 0) {
        this.activeSpeedBoostValue = 0;
        this.activeSpeedBoostRemainingMs = 0;
      }
    }

    // Advance per-island state machines
    for (const [islandId, st] of this.statuses.entries()) {
      const cfg = this.registry.get(islandId);
      if (!cfg) continue;

      if (st.state === 'active') {
        st.remainingMs -= deltaMs;
        if (st.remainingMs <= 0) {
          // Transition from active to cooldown
          st.state = 'cooldown';
          st.remainingMs = cfg.cooldownMs;
          this.eventBus.emit('specialIslandCooldownStarted', {
            islandId,
            cooldownMs: cfg.cooldownMs,
          });
        }
      } else if (st.state === 'cooldown') {
        st.remainingMs -= deltaMs;
        if (st.remainingMs <= 0) {
          // Transition back to ready
          st.state = 'ready';
          st.remainingMs = 0;
          this.eventBus.emit('specialIslandCooldownEnded', { islandId });
        }
      }
    }
  }

  /**
   * Evaluates a contact with an island feature.
   * If the island has an enabled special ability in the READY state, triggers it once.
   */
  public handleContact(
    islandId: string,
    contactPoint: Point2D,
    contactNormal: Vector2D,
    incomingSpeed: number,
  ): AbilityActivationResult {
    const cfg = this.registry.get(islandId);
    if (!cfg || !cfg.enabled) {
      return {
        activated: false,
        islandId,
        islandName: '',
        bonusPointsAwarded: 0,
        scoreMultiplierActive: this.activeScoreMultiplier,
      };
    }

    const st = this.statuses.get(islandId) ?? { state: 'ready', remainingMs: 0 };
    if (st.state !== 'ready') {
      return {
        activated: false,
        ability: cfg.ability,
        islandId,
        islandName: cfg.name,
        bonusPointsAwarded: 0,
        scoreMultiplierActive: this.activeScoreMultiplier,
      };
    }

    // Ability triggers!
    let bonusPoints = 0;
    let impulse: Vector2D | undefined;
    let speedBoost: number | undefined;

    switch (cfg.ability) {
      case 'explosive_bumper': {
        // Outward impulse along collision normal with velocity boost
        const boostFactor = cfg.parameter; // e.g. 1.35
        const outgoingSpeed = incomingSpeed * boostFactor;
        impulse = {
          x: contactNormal.x * outgoingSpeed,
          y: contactNormal.y * outgoingSpeed,
        };
        break;
      }
      case 'speed_boost': {
        // Temporary speed boost
        speedBoost = cfg.parameter; // +250 u/s
        this.activeSpeedBoostValue = speedBoost;
        this.activeSpeedBoostRemainingMs = cfg.durationMs;
        break;
      }
      case 'score_multiplier': {
        // Temporary score multiplier (e.g. 2x)
        this.activeScoreMultiplier = cfg.parameter;
        this.activeScoreMultiplierRemainingMs = cfg.durationMs;
        break;
      }
      case 'bonus_points': {
        // Immediate bonus points
        bonusPoints = cfg.parameter; // +1000 pts
        break;
      }
    }

    // State transition
    if (cfg.durationMs > 0) {
      st.state = 'active';
      st.remainingMs = cfg.durationMs;
    } else {
      st.state = 'cooldown';
      st.remainingMs = cfg.cooldownMs;
      this.eventBus.emit('specialIslandCooldownStarted', {
        islandId,
        cooldownMs: cfg.cooldownMs,
      });
    }

    // Emit event
    this.eventBus.emit('specialIslandActivated', {
      islandId,
      islandName: cfg.name,
      ability: cfg.ability,
      point: contactPoint,
      parameter: cfg.parameter,
    });

    return {
      activated: true,
      ability: cfg.ability,
      islandId,
      islandName: cfg.name,
      bonusPointsAwarded: bonusPoints,
      scoreMultiplierActive: this.activeScoreMultiplier,
      impulse,
      speedBoost,
    };
  }

  public exportState(): Record<string, { state: IslandAbilityState; remainingMs: number }> {
    const res: Record<string, { state: IslandAbilityState; remainingMs: number }> = {};
    for (const [id, s] of this.statuses.entries()) {
      res[id] = { state: s.state, remainingMs: s.remainingMs };
    }
    return res;
  }

  public restoreState(
    saved: Record<string, { state: IslandAbilityState; remainingMs: number }>,
  ): void {
    if (!saved) return;
    for (const [id, s] of Object.entries(saved)) {
      if (this.registry.get(id)) {
        this.statuses.set(id, {
          state: s.state,
          remainingMs: Math.max(0, s.remainingMs),
        });
      }
    }
  }
}
