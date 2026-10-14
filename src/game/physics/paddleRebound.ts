import { Vector2D } from '../../types';
import { SweptHit } from './continuousCollision';
import { PhysicsConfig } from '../../config';

export interface PaddleReboundResult {
  readonly isNorthernPaddleHit: boolean;
  readonly newVelocity: Vector2D;
  readonly angularImpulse: number;
  readonly isPowerBounceUsed?: boolean;
}

export class PaddleRebound {
  /**
   * Classifies whether a contact with Crete qualifies for northern hybrid paddle rebound.
   * Requires:
   * 1. Target is Crete
   * 2. Outward contact normal points northward (Ny < -0.25)
   * 3. Incoming ball velocity is traveling generally southward (Vy > 0 or relative approach > 0)
   */
  public static isEligibleNorthernContact(
    hit: SweptHit,
    ballVelocity: Vector2D,
    paddleY: number,
  ): boolean {
    if (hit.featureId !== 'island-crete') return false;

    // Normal must point upward into the northern Aegean
    if (hit.normal.y >= -0.2) return false;

    // Contact point must be on or above the southern baseline region
    if (hit.point.y > paddleY + 30) return false;

    // Incoming ball must be moving toward Crete (downward approach)
    if (ballVelocity.y <= 0) return false;

    return true;
  }

  /**
   * Computes the hybrid paddle rebound velocity and angular impulse.
   */
  public static computeRebound(
    hit: SweptHit,
    ballVelocity: Vector2D,
    paddleX: number,
    paddleHalfWidth: number,
    paddleVelocityX: number,
    config: PhysicsConfig,
    isPowerBounce = false,
  ): PaddleReboundResult {
    const isNorth = this.isEligibleNorthernContact(hit, ballVelocity, hit.point.y);

    if (!isNorth) {
      // Ordinary solid land specular reflection
      const vDotN = ballVelocity.x * hit.normal.x + ballVelocity.y * hit.normal.y;
      const restitution = config.ballRestitution;
      const reflX = ballVelocity.x - (1 + restitution) * vDotN * hit.normal.x;
      const reflY = ballVelocity.y - (1 + restitution) * vDotN * hit.normal.y;

      return {
        isNorthernPaddleHit: false,
        newVelocity: { x: reflX, y: reflY },
        angularImpulse: 0,
        isPowerBounceUsed: false,
      };
    }

    // Hybrid northern rebound
    // 1. Normalized contact offset along Crete width: [-1 (west tip), +1 (east tip)]
    const relX = Math.max(-1, Math.min(1, (hit.point.x - paddleX) / Math.max(10, paddleHalfWidth)));

    // 2. Incoming speed with optional power bounce multiplier
    const incomingSpeed = Math.hypot(ballVelocity.x, ballVelocity.y);
    const effectiveBounceFactor = isPowerBounce
      ? config.creteBounceFactor * 1.35
      : config.creteBounceFactor;
    const boostedSpeed = Math.min(
      config.maxBallSpeed,
      Math.max(config.minBallSpeed, incomingSpeed * effectiveBounceFactor),
    );

    // 3. Angular spread based on hit position: -50 degrees (left) to +50 degrees (right)
    // 0 degrees is straight north (0, -1)
    const maxAngleRad = (52 * Math.PI) / 180;
    const steerAngle = relX * maxAngleRad;

    let dirX = Math.sin(steerAngle);
    let dirY = -Math.cos(steerAngle); // strictly northward (negative Y)

    // Blend slightly with the local coastline normal (70% steer, 30% local coastline normal)
    // This gives the feeling of hitting natural bays while preserving player aiming intent
    dirX = dirX * 0.75 + hit.normal.x * 0.25;
    dirY = dirY * 0.75 + hit.normal.y * 0.25;

    const dirLen = Math.hypot(dirX, dirY);
    dirX /= dirLen;
    dirY /= dirLen;

    // Ensure direction has a strong northward component
    if (dirY > -0.35) {
      dirY = -0.35;
      const newLen = Math.hypot(dirX, dirY);
      dirX /= newLen;
      dirY /= newLen;
    }

    // 4. Momentum transfer from paddle horizontal velocity
    // Bounded paddle impulse cap independent of rapid physical paddle movement
    const maxPaddleTransferSpeed = config.maxPaddleTransferSpeed ?? 380;
    const clampedPaddleVelocityX = Math.max(
      -maxPaddleTransferSpeed,
      Math.min(maxPaddleTransferSpeed, paddleVelocityX),
    );
    const paddleTransferCoeff = 0.35;
    let outVx = dirX * boostedSpeed + clampedPaddleVelocityX * paddleTransferCoeff;
    let outVy = dirY * boostedSpeed;

    // Clamp total outgoing speed
    const outSpeed = Math.hypot(outVx, outVy);
    if (outSpeed > config.maxBallSpeed) {
      outVx = (outVx / outSpeed) * config.maxBallSpeed;
      outVy = (outVy / outSpeed) * config.maxBallSpeed;
    }

    // Angular impulse (spin) proportional to relative impact offset and bounded paddle movement
    const spinFactor = 0.08;
    const angularImpulse = (relX * 15 + clampedPaddleVelocityX * 0.04) * spinFactor;

    return {
      isNorthernPaddleHit: true,
      newVelocity: { x: outVx, y: outVy },
      angularImpulse,
      isPowerBounceUsed: isPowerBounce,
    };
  }
}
