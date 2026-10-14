import { Point2D, Vector2D } from '../../types';
import { BallBody } from './ballBody';

export interface AntiStuckEvent {
  readonly tick: number;
  readonly position: Point2D;
  readonly impulse: Vector2D;
  readonly reason: string;
}

export class AntiStuck {
  private readonly historyWindow = 120; // 1 second at 120 Hz
  private readonly positionHistory: Point2D[] = [];
  private consecutiveTrappedTicks = 0;
  private lastInterventionTick = -9999;
  private readonly minInterventionIntervalTicks = 360; // 3 seconds at 120 Hz
  private interventionCount = 0;
  private lastEvent: AntiStuckEvent | null = null;

  public update(
    ball: BallBody,
    currentTick: number,
    recentNormals: readonly Vector2D[] = [],
  ): AntiStuckEvent | null {
    if (!ball.inFlight) {
      this.positionHistory.length = 0;
      this.consecutiveTrappedTicks = 0;
      return null;
    }

    this.positionHistory.push({ x: ball.x, y: ball.y });
    if (this.positionHistory.length > this.historyWindow) {
      this.positionHistory.shift();
    }

    if (this.positionHistory.length < this.historyWindow) {
      return null;
    }

    // Check spatial bounding radius of position history
    const anchor = this.positionHistory[0]!;
    let maxDistSq = 0;
    for (const p of this.positionHistory) {
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      const dsq = dx * dx + dy * dy;
      if (dsq > maxDistSq) maxDistSq = dsq;
    }

    const maxDist = Math.sqrt(maxDistSq);

    // If ball has moved less than 16 world units over the entire window, it is confined/trapped
    if (maxDist < 16) {
      this.consecutiveTrappedTicks++;
    } else {
      this.consecutiveTrappedTicks = Math.max(0, this.consecutiveTrappedTicks - 2);
    }

    // Must be trapped for a full window plus verification margin, and respect cooldown
    if (
      this.consecutiveTrappedTicks >= 30 &&
      currentTick - this.lastInterventionTick > this.minInterventionIntervalTicks
    ) {
      this.lastInterventionTick = currentTick;
      this.consecutiveTrappedTicks = 0;
      this.interventionCount++;

      // Compute escape direction towards open water:
      // Average recent contact normals if available, or gentle upward impulse into the open Aegean
      let dirX = 0;
      let dirY = -1; // Default toward open northern sea

      if (recentNormals.length > 0) {
        let sumX = 0;
        let sumY = 0;
        for (const n of recentNormals) {
          sumX += n.x;
          sumY += n.y;
        }
        const len = Math.hypot(sumX, sumY);
        if (len > 0.1) {
          dirX = sumX / len;
          dirY = sumY / len;
        }
      }

      const impulseMagnitude = 220; // world units/s
      const impulse: Vector2D = {
        x: dirX * impulseMagnitude,
        y: dirY * impulseMagnitude,
      };

      ball.applyImpulse(impulse);

      const event: AntiStuckEvent = {
        tick: currentTick,
        position: { x: ball.x, y: ball.y },
        impulse,
        reason: `Trajectory trapped in radius ${maxDist.toFixed(1)}u over ${this.historyWindow} ticks`,
      };

      this.lastEvent = event;
      return event;
    }

    return null;
  }

  public getInterventionsCount(): number {
    return this.interventionCount;
  }

  public getLastEvent(): AntiStuckEvent | null {
    return this.lastEvent;
  }

  public reset(): void {
    this.positionHistory.length = 0;
    this.consecutiveTrappedTicks = 0;
    this.lastInterventionTick = -9999;
  }
}
