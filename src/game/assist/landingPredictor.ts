import { Point2D, Vector2D } from '../../types';
import { ARENA_CONFIG } from '../../config';
import { SpatialHashGrid } from '../physics/spatialHashGrid';
import { ContinuousCollision } from '../physics/continuousCollision';

export interface TrajectoryPrediction {
  readonly isReliable: boolean;
  readonly predictedLandingX: number | null;
  readonly trajectoryPoints: readonly Point2D[];
}

export interface LandingPredictorConfig {
  readonly minVyToPredict: number; // e.g. 80 u/s southward
  readonly minBallY: number; // e.g. 400
  readonly maxPredictionTimeSeconds: number; // e.g. 1.4s
  readonly stepDt: number; // e.g. 0.025s (40 steps per sec)
  readonly creteBaselineY: number; // 1460
  readonly enabled: boolean;
}

export const DEFAULT_PREDICTOR_CONFIG: LandingPredictorConfig = {
  minVyToPredict: 80,
  minBallY: 350,
  maxPredictionTimeSeconds: 1.4,
  stepDt: 0.025,
  creteBaselineY: ARENA_CONFIG.creteBaselineY, // 1460
  enabled: true,
};

export class LandingPredictor {
  private config: LandingPredictorConfig;

  constructor(config: LandingPredictorConfig = DEFAULT_PREDICTOR_CONFIG) {
    this.config = { ...config };
  }

  public getConfig(): LandingPredictorConfig {
    return this.config;
  }

  public updateConfig(updates: Partial<LandingPredictorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Projects the ball trajectory toward Crete baseline.
   * If an intervening static island is hit, the trajectory is deemed uncertain/blocked and landing prediction is suppressed.
   */
  public predict(
    ballPos: Point2D,
    ballVel: Vector2D,
    ballRadius: number,
    effectiveGravity: Vector2D,
    grid: SpatialHashGrid,
  ): TrajectoryPrediction {
    if (!this.config.enabled) {
      return { isReliable: false, predictedLandingX: null, trajectoryPoints: [] };
    }

    // Only predict if moving southward towards Crete and below northern drop line
    if (ballVel.y < this.config.minVyToPredict || ballPos.y < this.config.minBallY) {
      return { isReliable: false, predictedLandingX: null, trajectoryPoints: [] };
    }

    const points: Point2D[] = [{ ...ballPos }];
    let currentX = ballPos.x;
    let currentY = ballPos.y;
    let vx = ballVel.x;
    let vy = ballVel.y;

    const maxSteps = Math.ceil(this.config.maxPredictionTimeSeconds / this.config.stepDt);
    const dt = this.config.stepDt;

    for (let step = 0; step < maxSteps; step++) {
      // Integrate gravity & wind
      vx += effectiveGravity.x * dt;
      vy += effectiveGravity.y * dt;

      const nextX = currentX + vx * dt;
      const nextY = currentY + vy * dt;

      // Query static island obstacles along segment
      const box = {
        minX: Math.min(currentX, nextX) - ballRadius,
        maxX: Math.max(currentX, nextX) + ballRadius,
        minY: Math.min(currentY, nextY) - ballRadius,
        maxY: Math.max(currentY, nextY) + ballRadius,
      };

      const candidates = grid.query(box).filter((seg) => seg.featureId !== 'island-crete');
      const hit = ContinuousCollision.sweepCircle(
        { x: currentX, y: currentY },
        { x: nextX, y: nextY },
        ballRadius,
        candidates,
      );

      if (hit) {
        // Trajectory is intercepted by an intervening island!
        // Suppress landing marker on Crete to avoid misleading the player
        points.push({
          x: currentX + hit.t * (nextX - currentX),
          y: currentY + hit.t * (nextY - currentY),
        });
        return {
          isReliable: false,
          predictedLandingX: null,
          trajectoryPoints: points,
        };
      }

      // Check arena boundaries
      if (nextX - ballRadius < 0 || nextX + ballRadius > ARENA_CONFIG.worldWidth) {
        // Trajectory will bounce off sidewall; mark uncertain for now to avoid false accuracy
        points.push({ x: nextX, y: nextY });
        return {
          isReliable: false,
          predictedLandingX: null,
          trajectoryPoints: points,
        };
      }

      // Check reaching Crete baseline
      if (nextY >= this.config.creteBaselineY) {
        // Interpolate exact X at baseline
        const fraction =
          vy !== 0
            ? Math.max(0, Math.min(1, (this.config.creteBaselineY - currentY) / (nextY - currentY)))
            : 1;
        const landingX = currentX + fraction * (nextX - currentX);

        points.push({ x: landingX, y: this.config.creteBaselineY });

        // Ensure landing position is within arena boundaries
        if (landingX >= 0 && landingX <= ARENA_CONFIG.worldWidth) {
          return {
            isReliable: true,
            predictedLandingX: landingX,
            trajectoryPoints: points,
          };
        }
        return {
          isReliable: false,
          predictedLandingX: null,
          trajectoryPoints: points,
        };
      }

      points.push({ x: nextX, y: nextY });
      currentX = nextX;
      currentY = nextY;
    }

    return {
      isReliable: false,
      predictedLandingX: null,
      trajectoryPoints: points,
    };
  }
}
