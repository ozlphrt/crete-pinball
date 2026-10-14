import { Point2D, Vector2D } from '../../types';
import { ARENA_CONFIG } from '../../config';
import { BallBody } from './ballBody';

export interface AntiStuckEvent {
  readonly tick: number;
  readonly position: Point2D;
  readonly impulse: Vector2D;
  readonly reason: string;
}

interface BounceEntry {
  readonly tick: number;
  readonly x: number;
  readonly y: number;
}

export class AntiStuck {
  private readonly historyWindow = 60; // 0.5 second at 120 Hz
  private readonly positionHistory = new Map<string, Point2D[]>();
  private readonly bounceHistory = new Map<string, BounceEntry[]>();
  private readonly consecutiveTrappedTicks = new Map<string, number>();
  private readonly lastInterventionTick = new Map<string, number>();
  private readonly minInterventionIntervalTicks = 45; // 0.375s at 120 Hz (responsive)
  private interventionCount = 0;
  private lastEvent: AntiStuckEvent | null = null;

  /**
   * Center of open Aegean Sea waters for escape targeting
   */
  private readonly openSeaCenter: Point2D = {
    x: ARENA_CONFIG.worldWidth / 2, // 450
    y: 700,
  };

  /**
   * Records a collision bounce. If rapid chatter / loop is detected (e.g. >= 4 bounces within 45px in 45 ticks),
   * immediately triggers an escape extraction into the open Aegean Sea!
   */
  public recordBounce(
    ball: BallBody,
    currentTick: number,
    x: number,
    y: number,
    recentNormals: readonly Vector2D[] = [],
  ): AntiStuckEvent | null {
    if (!ball.inFlight) return null;

    const ballId = ball.id;
    let bounces = this.bounceHistory.get(ballId);
    if (!bounces) {
      bounces = [];
      this.bounceHistory.set(ballId, bounces);
    }

    bounces.push({ tick: currentTick, x, y });

    // Keep only bounces within last 45 ticks (~0.375s)
    const cutoff = currentTick - 45;
    while (bounces.length > 0 && bounces[0]!.tick < cutoff) {
      bounces.shift();
    }

    // Check for rapid bounce cluster
    if (bounces.length >= 4) {
      const anchor = bounces[bounces.length - 1]!;
      let maxDistSq = 0;
      for (const b of bounces) {
        const dsq = (b.x - anchor.x) ** 2 + (b.y - anchor.y) ** 2;
        if (dsq > maxDistSq) maxDistSq = dsq;
      }

      // If 4+ bounces occur within a 45px radius, it is caught in a narrow channel / infinite bounce loop!
      if (maxDistSq < 45 * 45) {
        const lastTick = this.lastInterventionTick.get(ballId) ?? -9999;
        if (currentTick - lastTick >= this.minInterventionIntervalTicks) {
          const count = bounces.length;
          const dtSec = (currentTick - bounces[0]!.tick) / 120;
          bounces.length = 0;
          return this.triggerExtraction(
            ball,
            currentTick,
            recentNormals,
            `Rapid bounce chatter (${count} hits in ${dtSec.toFixed(2)}s)`,
          );
        }
      }
    }

    return null;
  }

  public update(
    ball: BallBody,
    currentTick: number,
    recentNormals: readonly Vector2D[] = [],
  ): AntiStuckEvent | null {
    if (!ball.inFlight) {
      this.positionHistory.delete(ball.id);
      this.bounceHistory.delete(ball.id);
      this.consecutiveTrappedTicks.delete(ball.id);
      return null;
    }

    const ballId = ball.id;
    let history = this.positionHistory.get(ballId);
    if (!history) {
      history = [];
      this.positionHistory.set(ballId, history);
    }

    history.push({ x: ball.x, y: ball.y });
    if (history.length > this.historyWindow) {
      history.shift();
    }

    if (history.length < this.historyWindow) {
      return null;
    }

    // Check spatial bounding radius of position history
    const anchor = history[0]!;
    let maxDistSq = 0;
    for (const p of history) {
      const dx = p.x - anchor.x;
      const dy = p.y - anchor.y;
      const dsq = dx * dx + dy * dy;
      if (dsq > maxDistSq) maxDistSq = dsq;
    }

    const maxDist = Math.sqrt(maxDistSq);
    let trappedCount = this.consecutiveTrappedTicks.get(ballId) ?? 0;

    // If ball has moved less than 35 world units over 0.5s, it is confined/trapped
    if (maxDist < 35) {
      trappedCount++;
    } else {
      trappedCount = Math.max(0, trappedCount - 2);
    }
    this.consecutiveTrappedTicks.set(ballId, trappedCount);

    const lastTick = this.lastInterventionTick.get(ballId) ?? -9999;

    // Trigger intervention if trapped for 25 consecutive ticks (~0.2s)
    if (trappedCount >= 25 && currentTick - lastTick > this.minInterventionIntervalTicks) {
      trappedCount = 0;
      this.consecutiveTrappedTicks.set(ballId, 0);
      return this.triggerExtraction(
        ball,
        currentTick,
        recentNormals,
        `Trajectory confined in radius ${maxDist.toFixed(1)}u over ${this.historyWindow} ticks`,
      );
    }

    return null;
  }

  private triggerExtraction(
    ball: BallBody,
    currentTick: number,
    recentNormals: readonly Vector2D[],
    reason: string,
  ): AntiStuckEvent {
    const ballId = ball.id;
    this.lastInterventionTick.set(ballId, currentTick);
    this.consecutiveTrappedTicks.set(ballId, 0);
    this.positionHistory.delete(ballId);
    this.bounceHistory.delete(ballId);
    this.interventionCount++;

    // 1. Calculate unit vector towards open Aegean Sea
    const toOpenX = this.openSeaCenter.x - ball.x;
    const toOpenY = this.openSeaCenter.y - ball.y;
    const openLen = Math.hypot(toOpenX, toOpenY);
    const openDirX = openLen > 0.001 ? toOpenX / openLen : 0;
    const openDirY = openLen > 0.001 ? toOpenY / openLen : -1;

    // 2. Average recent normals
    let netNormX = 0;
    let netNormY = 0;
    for (const n of recentNormals) {
      netNormX += n.x;
      netNormY += n.y;
    }
    const normLen = Math.hypot(netNormX, netNormY);

    let dirX: number;
    let dirY: number;

    if (normLen > 0.2) {
      // Blend net normal with open sea direction (70% open sea, 30% normal)
      const nx = netNormX / normLen;
      const ny = netNormY / normLen;
      const blendX = openDirX * 0.7 + nx * 0.3;
      const blendY = openDirY * 0.7 + ny * 0.3;
      const blendLen = Math.hypot(blendX, blendY);
      dirX = blendLen > 0.001 ? blendX / blendLen : openDirX;
      dirY = blendLen > 0.001 ? blendY / blendLen : openDirY;
    } else {
      // Normals cancelled out (opposing walls / tight cleft): strictly target open sea
      dirX = openDirX;
      dirY = openDirY;
    }

    // 3. Physical extraction: nudge ball 24 units along escape vector to clear narrow gap
    const extractionDist = 24;
    ball.setPosition(ball.x + dirX * extractionDist, ball.y + dirY * extractionDist);

    // 4. Apply decisive escape velocity towards open sea
    const escapeSpeed = 450; // world units/s
    const impulse: Vector2D = {
      x: dirX * escapeSpeed,
      y: dirY * escapeSpeed,
    };
    ball.setVelocity(impulse.x, impulse.y);

    const event: AntiStuckEvent = {
      tick: currentTick,
      position: { x: ball.x, y: ball.y },
      impulse,
      reason,
    };

    this.lastEvent = event;
    return event;
  }

  public getInterventionsCount(): number {
    return this.interventionCount;
  }

  public getLastEvent(): AntiStuckEvent | null {
    return this.lastEvent;
  }

  public reset(): void {
    this.positionHistory.clear();
    this.bounceHistory.clear();
    this.consecutiveTrappedTicks.clear();
    this.lastInterventionTick.clear();
    this.lastEvent = null;
  }
}
