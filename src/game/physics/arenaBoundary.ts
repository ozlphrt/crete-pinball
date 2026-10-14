import { Point2D, Vector2D } from '../../types';
import { ARENA_CONFIG } from '../../config';

export interface BoundaryReflectionResult {
  readonly reflected: boolean;
  readonly newPosition: Point2D;
  readonly newVelocity: Vector2D;
  readonly boundarySide: 'north' | 'west' | 'east' | null;
}

export class ArenaBoundary {
  private readonly minX = 0;
  private readonly maxX = ARENA_CONFIG.worldWidth;
  private readonly minY = 165; // top HUD boundary
  private readonly escapeY = ARENA_CONFIG.escapeBoundaryY; // 1580

  /**
   * Tests and resolves reflections against the open-water north, west, and east arena boundaries.
   */
  public resolveReflection(
    pos: Point2D,
    vel: Vector2D,
    radius: number,
    restitution = 0.95,
  ): BoundaryReflectionResult {
    let px = pos.x;
    let py = pos.y;
    let vx = vel.x;
    let vy = vel.y;
    let reflected = false;
    let boundarySide: 'north' | 'west' | 'east' | null = null;

    // West boundary (X = 0)
    if (px - radius < this.minX && vx < 0) {
      px = this.minX + radius;
      vx = -vx * restitution;
      reflected = true;
      boundarySide = 'west';
    }

    // East boundary (X = 900)
    if (px + radius > this.maxX && vx > 0) {
      px = this.maxX - radius;
      vx = -vx * restitution;
      reflected = true;
      boundarySide = 'east';
    }

    // North boundary (Y = 120)
    if (py - radius < this.minY && vy < 0) {
      py = this.minY + radius;
      vy = -vy * restitution;
      reflected = true;
      boundarySide = 'north';
    }

    return {
      reflected,
      newPosition: { x: px, y: py },
      newVelocity: { x: vx, y: vy },
      boundarySide,
    };
  }

  /**
   * Checks whether the ball has fully crossed the southern escape drain line (Y = 1580).
   * Exact condition: entire solid core is beyond the boundary (center.y - radius >= 1580).
   */
  public isFullyEscapedSouth(pos: Point2D, radius: number): boolean {
    return pos.y - radius >= this.escapeY;
  }

  public getEscapeBoundaryY(): number {
    return this.escapeY;
  }
}
