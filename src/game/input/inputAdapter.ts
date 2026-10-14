import { WorldPoint, ScreenPoint } from '../../types';
import { CoordinateTransformer } from '../world/coordinateTransformer';
import { ARENA_CONFIG } from '../../config';

export interface InputIntent {
  readonly targetPaddleWorldX: number | null;
  readonly isTouchActive: boolean;
  readonly launchTriggered: boolean;
  readonly powerBounceTriggered: boolean;
  readonly pauseToggleTriggered: boolean;
}

export interface InputDiagnostics {
  readonly lastScreenPoint: ScreenPoint | null;
  readonly lastWorldPoint: WorldPoint | null;
  readonly isLowerControlZone: boolean;
  readonly activePointersCount: number;
}

export class InputAdapter {
  private readonly transformer: CoordinateTransformer;
  private targetPaddleX: number | null = null;
  private isPointerDown = false;
  private lastScreenPos: ScreenPoint | null = null;
  private lastWorldPos: WorldPoint | null = null;
  private isLowerControlZone = false;
  private launchRequested = false;
  private powerBounceRequested = false;
  private pauseRequested = false;

  // Double tap detection
  private lastTapTimestamp = 0;
  private readonly doubleTapThresholdMs = 300;

  constructor(transformer: CoordinateTransformer) {
    this.transformer = transformer;
  }

  public handlePointerDown(screenX: number, screenY: number): void {
    this.isPointerDown = true;
    this.lastScreenPos = { x: screenX, y: screenY };
    const worldPoint = this.transformer.screenToWorld(this.lastScreenPos);
    this.lastWorldPos = worldPoint;

    // Full-screen control: player can touch anywhere on screen to steer Crete
    this.isLowerControlZone = true;

    const now = Date.now();
    if (now - this.lastTapTimestamp < this.doubleTapThresholdMs) {
      this.powerBounceRequested = true;
      this.lastTapTimestamp = 0;
    } else {
      this.launchRequested = true;
      this.lastTapTimestamp = now;
    }

    // Direct tracking: immediately position Crete horizontally to follow touch
    this.targetPaddleX = Math.max(0, Math.min(ARENA_CONFIG.worldWidth, worldPoint.x));
  }

  public handlePointerMove(screenX: number, screenY: number): void {
    this.lastScreenPos = { x: screenX, y: screenY };
    const worldPoint = this.transformer.screenToWorld(this.lastScreenPos);
    this.lastWorldPos = worldPoint;

    if (this.isPointerDown) {
      // Full-screen dragging: dragging left or right anywhere on screen steers Crete
      this.targetPaddleX = Math.max(0, Math.min(ARENA_CONFIG.worldWidth, worldPoint.x));
    }
  }

  public handlePointerUp(): void {
    this.isPointerDown = false;
    this.isLowerControlZone = false;
  }

  public handleKeyboardLeft(deltaWorldX = 25): void {
    const current = this.targetPaddleX ?? ARENA_CONFIG.worldWidth / 2;
    this.targetPaddleX = Math.max(0, current - deltaWorldX);
  }

  public handleKeyboardRight(deltaWorldX = 25): void {
    const current = this.targetPaddleX ?? ARENA_CONFIG.worldWidth / 2;
    this.targetPaddleX = Math.min(ARENA_CONFIG.worldWidth, current + deltaWorldX);
  }

  public handlePauseKey(): void {
    this.pauseRequested = true;
  }

  public pollIntent(): InputIntent {
    const intent: InputIntent = {
      targetPaddleWorldX: this.targetPaddleX,
      isTouchActive: this.isPointerDown,
      launchTriggered: this.launchRequested,
      powerBounceTriggered: this.powerBounceRequested,
      pauseToggleTriggered: this.pauseRequested,
    };

    // Reset single-frame triggers
    this.launchRequested = false;
    this.powerBounceRequested = false;
    this.pauseRequested = false;

    return intent;
  }

  public getDiagnostics(): InputDiagnostics {
    return {
      lastScreenPoint: this.lastScreenPos,
      lastWorldPoint: this.lastWorldPos,
      isLowerControlZone: this.isLowerControlZone,
      activePointersCount: this.isPointerDown ? 1 : 0,
    };
  }
}
