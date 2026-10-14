import { GameDifficulty } from '../../types';
import { PhysicsConfig, PHYSICS_PRESETS } from '../../config';

export interface DifficultyCaps {
  readonly minBallSpeed: number;
  readonly maxBallSpeedCap: number;
  readonly initialGravityY: number;
  readonly maxGravityYCap: number;
  readonly speedRampPerMinute: number;
  readonly gravityRampPerMinute: number;
}

export const DIFFICULTY_CAPS: Record<GameDifficulty, DifficultyCaps> = {
  easy: {
    minBallSpeed: 150,
    maxBallSpeedCap: 950,
    initialGravityY: 180,
    maxGravityYCap: 240,
    speedRampPerMinute: 40,
    gravityRampPerMinute: 15,
  },
  normal: {
    minBallSpeed: 200,
    maxBallSpeedCap: 1150,
    initialGravityY: 240,
    maxGravityYCap: 300,
    speedRampPerMinute: 60,
    gravityRampPerMinute: 20,
  },
  hard: {
    minBallSpeed: 250,
    maxBallSpeedCap: 1250,
    initialGravityY: 300,
    maxGravityYCap: 380,
    speedRampPerMinute: 80,
    gravityRampPerMinute: 30,
  },
};

export type DifficultyMode = GameDifficulty;

export class DifficultySystem {
  private currentDifficulty: GameDifficulty = 'normal';

  constructor(initialDifficulty: GameDifficulty = 'normal') {
    this.currentDifficulty = initialDifficulty;
  }

  public get difficulty(): GameDifficulty {
    return this.currentDifficulty;
  }

  public setDifficulty(diff: GameDifficulty): void {
    this.currentDifficulty = diff;
  }

  /**
   * Computes progressive PhysicsConfig based on elapsed active simulation time.
   * Progression is continuous and bounded: speed and gravity gently ramp up,
   * staying strictly within safe collision detection ceilings.
   */
  public computeConfig(activeSeconds: number): PhysicsConfig {
    const basePreset = PHYSICS_PRESETS[this.currentDifficulty];
    const caps = DIFFICULTY_CAPS[this.currentDifficulty];

    const minutes = Math.max(0, activeSeconds / 60);

    // Progressive speed and gravity ramp
    const rampedMaxSpeed = Math.min(
      caps.maxBallSpeedCap,
      basePreset.maxBallSpeed + minutes * caps.speedRampPerMinute,
    );

    const rampedGravityY = Math.min(
      caps.maxGravityYCap,
      caps.initialGravityY + minutes * caps.gravityRampPerMinute,
    );

    return {
      ...basePreset,
      maxBallSpeed: Math.round(rampedMaxSpeed),
      gravity: {
        x: basePreset.gravity.x,
        y: Math.round(rampedGravityY),
      },
    };
  }

  /**
   * Returns the base (initial) config for the current difficulty.
   */
  public getInitialConfig(): PhysicsConfig {
    return PHYSICS_PRESETS[this.currentDifficulty];
  }

  public getInitialBallSpeed(): number {
    return 680;
  }

  public getGravity(activeSeconds = 0): number {
    return this.computeConfig(activeSeconds).gravity.y;
  }

  public getMaxBallSpeed(activeSeconds = 0): number {
    return this.computeConfig(activeSeconds).maxBallSpeed;
  }
}
