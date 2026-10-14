import { Point2D } from '../../types';

export type SpecialAbilityType =
  'explosive_bumper' | 'speed_boost' | 'score_multiplier' | 'bonus_points';

export type WeatherEventType = 'meltemi' | 'crosswind' | 'calm' | 'none';

export interface SpecialIslandActivatedEvent {
  readonly islandId: string;
  readonly islandName: string;
  readonly ability: SpecialAbilityType;
  readonly point: Point2D;
  readonly parameter: number;
}

export interface PowerBounceFiredEvent {
  readonly point: Point2D;
  readonly outgoingSpeed: number;
}

export interface MultiballEvent {
  readonly activeBallCount: number;
  readonly durationRemainingMs: number;
}

export interface WeatherChangeEvent {
  readonly type: WeatherEventType;
  readonly intensity: number;
  readonly durationRemainingMs: number;
  readonly headingDegrees?: number; // e.g. 180 for south (meltemi), 90 for east, 270 for west
  readonly description: string;
}

export interface SlowMotionEvent {
  readonly active: boolean;
  readonly factor: number;
  readonly durationRemainingMs: number;
}

export interface IslandHitEvent {
  readonly islandId: string;
  readonly islandName: string;
  readonly isSpecial: boolean;
  readonly isTarget: boolean;
  readonly points: number;
  readonly combo: number;
  readonly impactPoint: Point2D;
  readonly impactSpeed: number;
}

export interface MainlandHitEvent {
  readonly mainlandId: string;
  readonly impactPoint: Point2D;
  readonly impactSpeed: number;
}

export interface CreteReboundEvent {
  readonly impactPoint: Point2D;
  readonly impactSpeed: number;
  readonly isCharged: boolean;
}

export type GameEventMap = {
  specialIslandActivated: SpecialIslandActivatedEvent;
  specialIslandCooldownStarted: { islandId: string; cooldownMs: number };
  specialIslandCooldownEnded: { islandId: string };
  powerBounceCharged: { chargeLevel: number };
  powerBounceArmed: { armed: boolean };
  powerBounceFired: PowerBounceFiredEvent;
  multiballStarted: MultiballEvent;
  multiballEnded: { survivingBallId: string };
  weatherChanged: WeatherChangeEvent;
  slowMotionChanged: SlowMotionEvent;
  islandHit: IslandHitEvent;
  mainlandHit: MainlandHitEvent;
  creteRebound: CreteReboundEvent;
  comboIncreased: { combo: number; points: number };
  bonusTargetHit: { islandId: string; bonusPoints: number };
  ballLost: { remainingLives: number };
  extraBallEarned: { totalLives: number };
  gameOver: { finalScore: number; survivalSeconds: number };
  achievementUnlocked: {
    achievementId: string;
    title: string;
    description: string;
    icon: string;
  };
};

export type GameEventListener<K extends keyof GameEventMap> = (payload: GameEventMap[K]) => void;

export class GameEventBus {
  private static instance: GameEventBus | null = null;
  private listeners: { [K in keyof GameEventMap]?: GameEventListener<K>[] } = {};

  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  public on<K extends keyof GameEventMap>(event: K, listener: GameEventListener<K>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    (this.listeners[event] as GameEventListener<K>[]).push(listener);

    return () => this.off(event, listener);
  }

  public off<K extends keyof GameEventMap>(event: K, listener: GameEventListener<K>): void {
    const list = this.listeners[event];
    if (!list) return;
    const idx = (list as GameEventListener<K>[]).indexOf(listener);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const listener of [...list]) {
      listener(payload);
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}
