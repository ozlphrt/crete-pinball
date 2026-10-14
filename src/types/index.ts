/**
 * Core type definitions and branded identifiers for Crete Pinball.
 * All units are in logical world coordinates unless explicitly suffixed with Screen.
 */

// Branded types for type-safety across subsystems
export type IslandId = string & { readonly __brand: unique symbol };
export type SessionId = string & { readonly __brand: unique symbol };
export type TimestampMs = number & { readonly __brand: unique symbol };

export const makeIslandId = (id: string): IslandId => id as IslandId;
export const makeSessionId = (id: string): SessionId => id as SessionId;
export const makeTimestampMs = (ms: number): TimestampMs => ms as TimestampMs;

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export interface MutableVector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewportTransform {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly screenWidth: number;
  readonly screenHeight: number;
  readonly dpr: number;
}

export type GameDifficulty = 'easy' | 'normal' | 'hard';

export type GameState =
  | 'boot'
  | 'menu'
  | 'tutorial'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'resumeCountdown'
  | 'lifeLost'
  | 'gameOver'
  | 'exploration'
  | 'settings'
  | 'achievements';

export type SupportedLocale = 'en' | 'tr' | 'el';

export type VisualThemeId = 'dark-nautical' | 'neon-arcade' | 'vintage-chart' | 'satellite';
