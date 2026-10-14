import { Point2D, Vector2D, TimestampMs } from '../../types';

export interface BallState {
  readonly id: string;
  readonly position: Point2D;
  readonly velocity: Vector2D;
  readonly radius: number;
  readonly angularVelocity: number;
  readonly isAttachedToPaddle: boolean;
  readonly inFlight: boolean;
  readonly active: boolean;
}

export interface PaddleState {
  readonly positionX: number;
  readonly targetX: number;
  readonly velocityX: number;
  readonly minX: number;
  readonly maxX: number;
  readonly maxSpeed: number;
  readonly y: number;
  readonly isPowerBounceArmed: boolean;
}

export type CollisionTargetType =
  | 'ordinary_island'
  | 'special_island'
  | 'mainland'
  | 'crete_north'
  | 'crete_other'
  | 'boundary_wall'
  | 'escape_exit';

export interface ContactEvent {
  readonly tick: number;
  readonly timestamp: TimestampMs;
  readonly ballId: string;
  readonly targetId: string;
  readonly targetType: CollisionTargetType;
  readonly point: Point2D;
  readonly normal: Vector2D;
  readonly relativeSpeed: number;
  readonly qualifiesForPoints: boolean;
  readonly qualifiesForCombo: boolean;
}

export interface WorldBoundary {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly escapeY: number;
}

export interface AntiStuckState {
  readonly tracking: boolean;
  readonly consecutiveLowProgressTicks: number;
  readonly lastAnchorPoint: Point2D;
  readonly interventionsCount: number;
}
