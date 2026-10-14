import { Point2D } from '../../types';
import { GameEventBus } from '../events/gameEventBus';

export interface PowerBounceConfig {
  readonly chargePerComboHit: number; // e.g. 0.25 (4 combo hits = 100% full charge)
  readonly boostMultiplier: number; // e.g. 1.45 (1.45x velocity boost on northern paddle hit)
  readonly enabled: boolean;
}

export const DEFAULT_POWER_BOUNCE_CONFIG: PowerBounceConfig = {
  chargePerComboHit: 0.25,
  boostMultiplier: 1.45,
  enabled: true,
};

export class CreteEnergySystem {
  private config: PowerBounceConfig;
  private readonly eventBus: GameEventBus;

  private currentCharge = 0; // 0.0 to 1.0
  private armed = false;

  constructor(
    config: PowerBounceConfig = DEFAULT_POWER_BOUNCE_CONFIG,
    eventBus: GameEventBus = GameEventBus.getInstance(),
  ) {
    this.config = { ...config };
    this.eventBus = eventBus;
  }

  public getConfig(): PowerBounceConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<PowerBounceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public get charge(): number {
    return this.currentCharge;
  }

  public get isFull(): boolean {
    return this.currentCharge >= 1.0;
  }

  public get isArmed(): boolean {
    return this.armed;
  }

  public reset(): void {
    this.currentCharge = 0;
    this.armed = false;
    this.eventBus.emit('powerBounceCharged', { chargeLevel: 0 });
    this.eventBus.emit('powerBounceArmed', { armed: false });
  }

  /**
   * Called on a qualified distinct island collision that advances combo.
   */
  public addComboCharge(): void {
    if (!this.config.enabled || this.armed) return;

    if (this.currentCharge < 1.0) {
      this.currentCharge = Math.min(1.0, this.currentCharge + this.config.chargePerComboHit);
      this.eventBus.emit('powerBounceCharged', { chargeLevel: this.currentCharge });
    }
  }

  /**
   * Called when player triggers a double-tap/double-click gesture.
   * Arms the power bounce if charge is 100% full.
   */
  public arm(): boolean {
    if (!this.config.enabled) return false;

    if (this.isFull && !this.armed) {
      this.armed = true;
      this.eventBus.emit('powerBounceArmed', { armed: true });
      return true;
    }
    return false;
  }

  /**
   * Called when a northern paddle rebound occurs.
   * Consumes the armed charge exactly once.
   */
  public consumeArmedCharge(contactPoint: Point2D, boostedSpeed: number): boolean {
    if (this.armed) {
      this.armed = false;
      this.currentCharge = 0;
      this.eventBus.emit('powerBounceArmed', { armed: false });
      this.eventBus.emit('powerBounceCharged', { chargeLevel: 0 });
      this.eventBus.emit('powerBounceFired', {
        point: contactPoint,
        outgoingSpeed: boostedSpeed,
      });
      return true;
    }
    return false;
  }

  /**
   * Resets armed state on ball loss (life loss).
   */
  public onLifeLost(): void {
    this.armed = false;
    this.currentCharge = 0;
    this.eventBus.emit('powerBounceArmed', { armed: false });
    this.eventBus.emit('powerBounceCharged', { chargeLevel: 0 });
  }

  public exportState(): { charge: number; isArmed: boolean } {
    return {
      charge: this.currentCharge,
      isArmed: this.armed,
    };
  }

  public restoreState(state: { charge: number; isArmed: boolean }): void {
    if (!state) return;
    this.currentCharge = Math.max(0, Math.min(1, state.charge));
    this.armed = !!state.isArmed && this.currentCharge >= 1.0;
    this.eventBus.emit('powerBounceCharged', { chargeLevel: this.currentCharge });
    this.eventBus.emit('powerBounceArmed', { armed: this.armed });
  }
}
