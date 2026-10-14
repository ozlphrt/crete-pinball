import { GameDifficulty, Vector2D } from '../types';

export const SCHEMA_VERSION = 1;
export const GEO_DATA_VERSION = 1;
export const PHYSICS_RULESET_VERSION = 1;

/**
 * Logical portrait arena dimensions.
 * Fixed aspect ratio of 9:16.
 */
export const ARENA_CONFIG = {
  worldWidth: 900,
  worldHeight: 1600,
  aspectRatio: 9 / 16,
  escapeBoundaryY: 1580,
  creteBaselineY: 1460,
  creteTravelMinX: 205.03,
  creteTravelMaxX: 673.01,
  minBallRadius: 6,
  defaultBallRadius: 10,
  defaultBallGlowRadius: 24,
  maxBallSpeed: 1200,
  nominalStepFrequencyHz: 120,
} as const;

export interface PhysicsConfig {
  readonly version: number;
  readonly stepFrequencyHz: number;
  readonly gravity: Vector2D;
  readonly minBallSpeed: number;
  readonly maxBallSpeed: number;
  readonly ballRadius: number;
  readonly ballGlowRadius?: number;
  readonly ballRestitution: number;
  readonly landFriction: number;
  readonly spinDecayRate: number;
  readonly creteMaxSpeed: number;
  readonly creteBounceFactor: number;
  readonly antiStuckThresholdMs: number;
  readonly antiStuckImpulseMagnitude: number;
  readonly maxPaddleTransferSpeed?: number;
}

export const PHYSICS_PRESETS: Record<GameDifficulty, PhysicsConfig> = {
  easy: {
    version: PHYSICS_RULESET_VERSION,
    stepFrequencyHz: 120,
    gravity: { x: 0, y: 180 },
    minBallSpeed: 150,
    maxBallSpeed: 800,
    ballRadius: 12,
    ballGlowRadius: 26,
    ballRestitution: 0.95,
    landFriction: 0.05,
    spinDecayRate: 0.98,
    creteMaxSpeed: 1000,
    creteBounceFactor: 1.15,
    antiStuckThresholdMs: 2500,
    antiStuckImpulseMagnitude: 200,
    maxPaddleTransferSpeed: 380,
  },
  normal: {
    version: PHYSICS_RULESET_VERSION,
    stepFrequencyHz: 120,
    gravity: { x: 0, y: 240 },
    minBallSpeed: 200,
    maxBallSpeed: 1050,
    ballRadius: 10,
    ballGlowRadius: 24,
    ballRestitution: 0.96,
    landFriction: 0.04,
    spinDecayRate: 0.985,
    creteMaxSpeed: 1100,
    creteBounceFactor: 1.2,
    antiStuckThresholdMs: 2000,
    antiStuckImpulseMagnitude: 220,
    maxPaddleTransferSpeed: 380,
  },
  hard: {
    version: PHYSICS_RULESET_VERSION,
    stepFrequencyHz: 120,
    gravity: { x: 0, y: 300 },
    minBallSpeed: 250,
    maxBallSpeed: 1250,
    ballRadius: 9,
    ballGlowRadius: 22,
    ballRestitution: 0.98,
    landFriction: 0.03,
    spinDecayRate: 0.99,
    creteMaxSpeed: 1200,
    creteBounceFactor: 1.25,
    antiStuckThresholdMs: 1800,
    antiStuckImpulseMagnitude: 240,
    maxPaddleTransferSpeed: 380,
  },
};

/**
 * Validates a PhysicsConfig object. Throws descriptive Error if invalid.
 */
export function validatePhysicsConfig(config: unknown): config is PhysicsConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('PhysicsConfig must be a non-null object');
  }

  const c = config as Record<string, unknown>;

  if (typeof c['version'] !== 'number' || Number.isNaN(c['version']) || c['version'] <= 0) {
    throw new Error('PhysicsConfig.version must be a positive integer');
  }

  if (
    typeof c['stepFrequencyHz'] !== 'number' ||
    Number.isNaN(c['stepFrequencyHz']) ||
    c['stepFrequencyHz'] < 30 ||
    c['stepFrequencyHz'] > 240
  ) {
    throw new Error('PhysicsConfig.stepFrequencyHz must be between 30 and 240 Hz');
  }

  const grav = c['gravity'] as Record<string, unknown> | undefined;
  if (
    !grav ||
    typeof grav['x'] !== 'number' ||
    Number.isNaN(grav['x']) ||
    typeof grav['y'] !== 'number' ||
    Number.isNaN(grav['y'])
  ) {
    throw new Error('PhysicsConfig.gravity must be a valid 2D vector with finite numbers');
  }

  if (
    typeof c['ballRadius'] !== 'number' ||
    Number.isNaN(c['ballRadius']) ||
    c['ballRadius'] < ARENA_CONFIG.minBallRadius
  ) {
    throw new Error(
      `PhysicsConfig.ballRadius must be >= ${ARENA_CONFIG.minBallRadius}, got ${String(c['ballRadius'])}`,
    );
  }

  if (
    typeof c['maxBallSpeed'] !== 'number' ||
    Number.isNaN(c['maxBallSpeed']) ||
    c['maxBallSpeed'] <= 0
  ) {
    throw new Error('PhysicsConfig.maxBallSpeed must be a positive number');
  }

  if (
    typeof c['minBallSpeed'] !== 'number' ||
    Number.isNaN(c['minBallSpeed']) ||
    c['minBallSpeed'] < 0 ||
    c['minBallSpeed'] > (c['maxBallSpeed'] as number)
  ) {
    throw new Error('PhysicsConfig.minBallSpeed must be >= 0 and <= maxBallSpeed');
  }

  if (
    typeof c['ballRestitution'] !== 'number' ||
    Number.isNaN(c['ballRestitution']) ||
    c['ballRestitution'] < 0 ||
    c['ballRestitution'] > 1.5
  ) {
    throw new Error('PhysicsConfig.ballRestitution must be between 0 and 1.5');
  }

  if (
    typeof c['creteMaxSpeed'] !== 'number' ||
    Number.isNaN(c['creteMaxSpeed']) ||
    c['creteMaxSpeed'] <= 0
  ) {
    throw new Error('PhysicsConfig.creteMaxSpeed must be a positive number');
  }

  return true;
}
