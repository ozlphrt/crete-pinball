import { describe, it, expect } from 'vitest';
import { PHYSICS_PRESETS, validatePhysicsConfig } from '../../src/config';

describe('validatePhysicsConfig', () => {
  it('accepts approved Easy, Normal, and Hard presets', () => {
    expect(validatePhysicsConfig(PHYSICS_PRESETS.easy)).toBe(true);
    expect(validatePhysicsConfig(PHYSICS_PRESETS.normal)).toBe(true);
    expect(validatePhysicsConfig(PHYSICS_PRESETS.hard)).toBe(true);
  });

  it('rejects invalid or non-object values', () => {
    expect(() => validatePhysicsConfig(null)).toThrow('PhysicsConfig must be a non-null object');
    expect(() => validatePhysicsConfig(undefined)).toThrow(
      'PhysicsConfig must be a non-null object',
    );
    expect(() => validatePhysicsConfig('string')).toThrow(
      'PhysicsConfig must be a non-null object',
    );
  });

  it('rejects configs with invalid ball radius below minimum', () => {
    const invalidConfig = {
      ...PHYSICS_PRESETS.normal,
      ballRadius: 3, // Minimum is 6
    };
    expect(() => validatePhysicsConfig(invalidConfig)).toThrow('ballRadius must be >= 6');
  });

  it('rejects configs with NaN or invalid values', () => {
    const nanRadiusConfig = {
      ...PHYSICS_PRESETS.normal,
      ballRadius: NaN,
    };
    expect(() => validatePhysicsConfig(nanRadiusConfig)).toThrow();

    const nanGravityConfig = {
      ...PHYSICS_PRESETS.normal,
      gravity: { x: NaN, y: 100 },
    };
    expect(() => validatePhysicsConfig(nanGravityConfig)).toThrow(
      'PhysicsConfig.gravity must be a valid 2D vector',
    );
  });

  it('rejects minBallSpeed > maxBallSpeed', () => {
    const invalidSpeedConfig = {
      ...PHYSICS_PRESETS.normal,
      minBallSpeed: 1500,
      maxBallSpeed: 1000,
    };
    expect(() => validatePhysicsConfig(invalidSpeedConfig)).toThrow(
      'minBallSpeed must be >= 0 and <= maxBallSpeed',
    );
  });
});
