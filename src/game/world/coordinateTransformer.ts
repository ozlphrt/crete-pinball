import { ScreenPoint, ViewportTransform, WorldPoint } from '../../types';
import { ARENA_CONFIG } from '../../config';

export interface ViewportDimensions {
  readonly width: number;
  readonly height: number;
  readonly dpr?: number;
}

/**
 * CoordinateTransformer handles pure mathematical conversions between:
 * - Logical World Coordinates: [0, worldWidth] x [0, worldHeight] (fixed 900 x 1600 portrait arena)
 * - Screen Pixel Coordinates: [0, screenWidth] x [0, screenHeight]
 *
 * It enforces uniform aspect-ratio scaling (never non-uniform scaling) and
 * centered pillarbox/letterbox offsets.
 *
 * Future Pipeline:
 * [Geographic Lon/Lat (WGS84)]
 *       ↓ (Phase 01: Preprocessing projection e.g., Mercator / Conformal Conic)
 * [Fixed Map/World Coordinates (900x1600)]
 *       ↓ (CoordinateTransformer: uniform scale & centering)
 * [Screen Display Pixels]
 */
export class CoordinateTransformer {
  private readonly worldWidth: number;
  private readonly worldHeight: number;
  private currentTransform: ViewportTransform;

  constructor(
    worldWidth = ARENA_CONFIG.worldWidth,
    worldHeight = ARENA_CONFIG.worldHeight,
    initialViewport?: ViewportDimensions,
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.currentTransform = this.computeTransform(
      initialViewport ?? { width: worldWidth, height: worldHeight, dpr: 1 },
    );
  }

  public updateViewport(viewport: ViewportDimensions): ViewportTransform {
    this.currentTransform = this.computeTransform(viewport);
    return this.currentTransform;
  }

  public getTransform(): ViewportTransform {
    return this.currentTransform;
  }

  private computeTransform(viewport: ViewportDimensions): ViewportTransform {
    const screenWidth = Math.max(1, viewport.width);
    const screenHeight = Math.max(1, viewport.height);
    const dpr = Math.max(1, viewport.dpr ?? 1);

    // Uniform scale factor: never scale X and Y independently
    const scale = Math.min(screenWidth / this.worldWidth, screenHeight / this.worldHeight);

    // Center arena within available screen (pillarbox / letterbox)
    const arenaDisplayWidth = this.worldWidth * scale;
    const arenaDisplayHeight = this.worldHeight * scale;

    const offsetX = (screenWidth - arenaDisplayWidth) / 2;
    const offsetY = (screenHeight - arenaDisplayHeight) / 2;

    return {
      scale,
      offsetX,
      offsetY,
      worldWidth: this.worldWidth,
      worldHeight: this.worldHeight,
      screenWidth,
      screenHeight,
      dpr,
    };
  }

  /**
   * Converts world coordinates [0..worldWidth, 0..worldHeight] to screen pixels.
   */
  public worldToScreen(worldPoint: WorldPoint): ScreenPoint {
    const { scale, offsetX, offsetY } = this.currentTransform;
    return {
      x: worldPoint.x * scale + offsetX,
      y: worldPoint.y * scale + offsetY,
    };
  }

  /**
   * Converts screen pixels to world coordinates.
   * If screen point is in the letterbox/pillarbox padding, world coordinate will reflect
   * the extrapolated or clamped logical position.
   */
  public screenToWorld(screenPoint: ScreenPoint): WorldPoint {
    const { scale, offsetX, offsetY } = this.currentTransform;
    return {
      x: (screenPoint.x - offsetX) / scale,
      y: (screenPoint.y - offsetY) / scale,
    };
  }

  /**
   * Clamps world point to strictly within arena bounds.
   */
  public clampToWorldBounds(point: WorldPoint): WorldPoint {
    return {
      x: Math.max(0, Math.min(this.worldWidth, point.x)),
      y: Math.max(0, Math.min(this.worldHeight, point.y)),
    };
  }

  /**
   * Checks whether a screen point lies inside the active arena viewport (not in letterbox margin).
   */
  public isInsideArenaScreen(screenPoint: ScreenPoint): boolean {
    const { offsetX, offsetY, worldWidth, worldHeight, scale } = this.currentTransform;
    const arenaRight = offsetX + worldWidth * scale;
    const arenaBottom = offsetY + worldHeight * scale;

    return (
      screenPoint.x >= offsetX &&
      screenPoint.x <= arenaRight &&
      screenPoint.y >= offsetY &&
      screenPoint.y <= arenaBottom
    );
  }
}
