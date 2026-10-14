import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';
import { BallBody } from '../physics/ballBody';
import { CretePaddle } from '../entities/cretePaddle';

export interface CameraZoomControllerConfig {
  readonly enabledByDefault?: boolean;
  readonly maxZoom?: number;
  readonly minZoom?: number;
  readonly marginX?: number;
  readonly marginY?: number;
  readonly posLambda?: number;
  readonly zoomLambda?: number;
}

/**
 * CameraZoomController manages dynamic, seasickness-free camera zoom & tracking.
 *
 * Design constraints:
 * - Zooms in a bit (default max 1.30x) to reveal topography and island details.
 * - Always keeps ALL active balls inside the viewport with generous safety margins.
 * - Zero seasickness: utilizes heavily damped exponential low-pass filtering (posLambda: 2.8, zoomLambda: 2.2)
 *   so the camera glides gently without tracking high-frequency speed vibrations or sudden bounces.
 * - Default is strictly OFF unless toggled via the magnifier button.
 */
export class CameraZoomController {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly cretePaddle: CretePaddle;
  private isEnabled = false;

  private readonly maxZoom: number;
  private readonly minZoom: number;
  private readonly marginX: number;
  private readonly marginY: number;
  private readonly posLambda: number;
  private readonly zoomLambda: number;

  private currentCenterX: number;
  private currentCenterY: number;
  private currentZoom = 1.0;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    cretePaddle: CretePaddle,
    config: CameraZoomControllerConfig = {},
  ) {
    this.camera = camera;
    this.cretePaddle = cretePaddle;
    this.isEnabled = config.enabledByDefault ?? false;
    this.maxZoom = config.maxZoom ?? 1.30;
    this.minZoom = config.minZoom ?? 1.0;
    this.marginX = config.marginX ?? 120;
    this.marginY = config.marginY ?? 140;
    this.posLambda = config.posLambda ?? 2.8;
    this.zoomLambda = config.zoomLambda ?? 2.2;

    this.currentCenterX = ARENA_CONFIG.worldWidth / 2;
    this.currentCenterY = ARENA_CONFIG.worldHeight / 2;
  }

  public isZoomEnabled(): boolean {
    return this.isEnabled;
  }

  public setZoomEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }

  public getZoom(): number {
    return this.currentZoom;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.currentCenterX, y: this.currentCenterY };
  }

  public update(deltaSeconds: number, activeBalls: readonly BallBody[]): void {
    const W = ARENA_CONFIG.worldWidth;
    const H = ARENA_CONFIG.worldHeight;
    const dt = Math.max(0.001, Math.min(0.05, deltaSeconds));

    if (!this.isEnabled) {
      // Smoothly return to default full view (1.0x centered)
      const targetCenterX = W / 2;
      const targetCenterY = H / 2;
      const targetZoom = 1.0;

      const pLerp = 1 - Math.exp(-this.posLambda * dt);
      const zLerp = 1 - Math.exp(-this.zoomLambda * dt);

      this.currentCenterX += (targetCenterX - this.currentCenterX) * pLerp;
      this.currentCenterY += (targetCenterY - this.currentCenterY) * pLerp;
      this.currentZoom += (targetZoom - this.currentZoom) * zLerp;

      // Settle precisely when close
      if (
        Math.abs(this.currentZoom - 1.0) < 0.001 &&
        Math.abs(this.currentCenterX - targetCenterX) < 0.1 &&
        Math.abs(this.currentCenterY - targetCenterY) < 0.1
      ) {
        this.currentZoom = 1.0;
        this.currentCenterX = targetCenterX;
        this.currentCenterY = targetCenterY;
        this.camera.centerOn(targetCenterX, targetCenterY);
        this.camera.setZoom(1.0);
        return;
      }

      this.camera.centerOn(this.currentCenterX, this.currentCenterY);
      this.camera.setZoom(this.currentZoom);
      return;
    }

    // Dynamic zoom active
    if (activeBalls.length === 0) {
      // Default to slightly elevated overview if waiting for launch
      const targetCenterX = W / 2;
      const targetCenterY = H * 0.48;
      const targetZoom = 1.15;

      const pLerp = 1 - Math.exp(-this.posLambda * dt);
      const zLerp = 1 - Math.exp(-this.zoomLambda * dt);

      this.currentCenterX += (targetCenterX - this.currentCenterX) * pLerp;
      this.currentCenterY += (targetCenterY - this.currentCenterY) * pLerp;
      this.currentZoom += (targetZoom - this.currentZoom) * zLerp;

      this.camera.centerOn(this.currentCenterX, this.currentCenterY);
      this.camera.setZoom(this.currentZoom);
      return;
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const ball of activeBalls) {
      const r = ball.radius || 12;
      if (ball.x - r < minX) minX = ball.x - r;
      if (ball.x + r > maxX) maxX = ball.x + r;
      if (ball.y - r < minY) minY = ball.y - r;
      if (ball.y + r > maxY) maxY = ball.y + r;
    }

    // Calculate maximum zoom that strictly keeps ALL balls within viewport with margins
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const maxSafeZoomX = W / (spanX + this.marginX * 2);
    const maxSafeZoomY = H / (spanY + this.marginY * 2);
    const safeZoom = Math.min(maxSafeZoomX, maxSafeZoomY);

    const targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, safeZoom));

    // Target center coordinates
    let centerBallsX = (minX + maxX) / 2;
    let centerBallsY = (minY + maxY) / 2;

    // When the ball drops into southern waters, bias center towards Crete to keep paddle framed
    const lowestY = maxY;
    if (lowestY > 1050) {
      const creteInfluence = Math.min(1.0, (lowestY - 1050) / 320);
      centerBallsX =
        centerBallsX * (1 - creteInfluence * 0.4) + this.cretePaddle.x * (creteInfluence * 0.4);
      centerBallsY =
        centerBallsY * (1 - creteInfluence * 0.45) +
        ((centerBallsY + ARENA_CONFIG.creteBaselineY) / 2) * (creteInfluence * 0.45);
    }

    // Clamp target center so visible camera frame never views outside arena boundaries
    const halfVisibleW = W / (2 * targetZoom);
    const halfVisibleH = H / (2 * targetZoom);

    const clampedCenterX = Math.max(halfVisibleW, Math.min(W - halfVisibleW, centerBallsX));
    const clampedCenterY = Math.max(halfVisibleH, Math.min(H - halfVisibleH, centerBallsY));

    // Gentle exponential smoothing avoids seasickness
    const pLerp = 1 - Math.exp(-this.posLambda * dt);
    const zLerp = 1 - Math.exp(-this.zoomLambda * dt);

    this.currentCenterX += (clampedCenterX - this.currentCenterX) * pLerp;
    this.currentCenterY += (clampedCenterY - this.currentCenterY) * pLerp;
    this.currentZoom += (targetZoom - this.currentZoom) * zLerp;

    this.camera.centerOn(this.currentCenterX, this.currentCenterY);
    this.camera.setZoom(this.currentZoom);
  }
}
