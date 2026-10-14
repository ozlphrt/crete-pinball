import { BoundingBox } from '../../types';
import { CollisionSegment, LinearRing } from '../../geography/contracts';
import { CretePaddleData, getCreteData } from '../../geography/aegeanData';
import { ARENA_CONFIG } from '../../config';

export class CretePaddle {
  private readonly data: CretePaddleData;
  private readonly dynamicMinX: number;
  private readonly dynamicMaxX: number;
  private posX: number;
  private targetPaddleX: number;
  private currentVelocityX = 0;

  constructor(initialX = ARENA_CONFIG.worldWidth / 2, arenaWidth = ARENA_CONFIG.worldWidth) {
    this.data = getCreteData();

    // Dynamically calculate mathematically exact limits from Crete's actual geometry (outerRing)
    // so that Crete's entire silhouette remains strictly inside [0, arenaWidth].
    let minLocalX = Infinity;
    let maxLocalX = -Infinity;
    for (const pt of this.data.localGeometry.outerRing) {
      if (pt.x < minLocalX) minLocalX = pt.x;
      if (pt.x > maxLocalX) maxLocalX = pt.x;
    }

    // World X for any point is (pt.x + posX).
    // For min world X >= 0: posX >= -minLocalX.
    // For max world X <= arenaWidth: posX <= arenaWidth - maxLocalX.
    this.dynamicMinX = -minLocalX;
    this.dynamicMaxX = arenaWidth - maxLocalX;

    this.posX = Math.max(this.dynamicMinX, Math.min(this.dynamicMaxX, initialX));
    this.targetPaddleX = this.posX;
  }

  public get x(): number {
    return this.posX;
  }

  public get y(): number {
    return this.data.baselineY;
  }

  public get targetX(): number {
    return this.targetPaddleX;
  }

  public get velocityX(): number {
    return this.currentVelocityX;
  }

  public get minX(): number {
    return this.dynamicMinX;
  }

  public get maxX(): number {
    return this.dynamicMaxX;
  }

  public get halfWidth(): number {
    return this.data.halfWidth;
  }

  public get halfHeight(): number {
    return this.data.halfHeight;
  }

  /**
   * Sets target horizontal position. Target is clamped to allowable travel range.
   */
  public setTargetX(targetX: number): void {
    this.targetPaddleX = Math.max(this.dynamicMinX, Math.min(this.dynamicMaxX, targetX));
  }

  /**
   * Shifts target X left by a delta (for keyboard arrow keys).
   */
  public moveLeft(deltaX = 25): void {
    this.setTargetX(this.targetPaddleX - deltaX);
  }

  /**
   * Shifts target X right by a delta (for keyboard arrow keys).
   */
  public moveRight(deltaX = 25): void {
    this.setTargetX(this.targetPaddleX + deltaX);
  }

  /**
   * Updates horizontal position: directly follows target position without smoothing,
   * acceleration limits, or inertia, strictly clamped to allowable travel range.
   */
  public update(deltaSeconds: number): void {
    const clampedTarget = Math.max(
      this.dynamicMinX,
      Math.min(this.dynamicMaxX, this.targetPaddleX),
    );
    const prevX = this.posX;
    this.posX = clampedTarget;
    this.currentVelocityX = deltaSeconds > 0 ? (this.posX - prevX) / deltaSeconds : 0;
  }

  /**
   * Returns current world polygon coordinates for visual rendering.
   */
  public getWorldPolygon(): LinearRing {
    const cx = this.posX;
    const cy = this.data.baselineY;
    return this.data.localGeometry.outerRing.map((pt) => ({
      x: Math.round((pt.x + cx) * 100) / 100,
      y: Math.round((pt.y + cy) * 100) / 100,
    }));
  }

  /**
   * Returns current world collision segments with outward water-facing normals.
   */
  public getWorldCollisionSegments(): CollisionSegment[] {
    const cx = this.posX;
    const cy = this.data.baselineY;
    return this.data.localCollisionSegments.map((seg) => ({
      id: `crete-${seg.id}`,
      p1: {
        x: Math.round((seg.p1.x + cx) * 100) / 100,
        y: Math.round((seg.p1.y + cy) * 100) / 100,
      },
      p2: {
        x: Math.round((seg.p2.x + cx) * 100) / 100,
        y: Math.round((seg.p2.y + cy) * 100) / 100,
      },
      normal: seg.normal,
      length: seg.length,
    }));
  }

  /**
   * Computes exact bounding box of Crete at its current position.
   */
  public getWorldBounds(): BoundingBox {
    const ring = this.getWorldPolygon();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of ring) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Returns the island feature metadata.
   */
  public getData(): CretePaddleData {
    return this.data;
  }

  /**
   * Invariant verification: verifies that Crete's tips remain strictly within [0, worldWidth].
   */
  public isWithinArenaBounds(worldWidth = ARENA_CONFIG.worldWidth): boolean {
    const bounds = this.getWorldBounds();
    return bounds.minX >= 0 && bounds.maxX <= worldWidth;
  }
}
