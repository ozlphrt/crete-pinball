import Phaser from 'phaser';
import { BallBody } from '../physics/ballBody';

export class BallRenderer {
  private readonly scene: Phaser.Scene;
  private readonly ballGraphics: Phaser.GameObjects.Graphics;
  private readonly rotationByBallId = new Map<string, number>();
  private glowRadius = 24;

  constructor(scene: Phaser.Scene, initialGlowRadius = 24) {
    this.scene = scene;
    this.glowRadius = initialGlowRadius;

    this.ballGraphics = this.scene.add.graphics();
    this.ballGraphics.setDepth(460);
  }

  public getGlowRadius(): number {
    return this.glowRadius;
  }

  public setGlowRadius(glowRadius: number): void {
    this.glowRadius = Math.max(4, glowRadius);
  }

  /**
   * Updates rendering for one or multiple active balls.
   */
  public update(ballOrBalls: BallBody | readonly BallBody[], deltaSeconds: number): void {
    const balls = Array.isArray(ballOrBalls) ? ballOrBalls : [ballOrBalls as BallBody];

    const g = this.ballGraphics;
    g.clear();

    for (const ball of balls) {
      if (ball.state === 'lost') {
        continue;
      }

      this.renderSingleBall(ball, deltaSeconds, g);
    }
  }

  private renderSingleBall(
    ball: BallBody,
    deltaSeconds: number,
    g: Phaser.GameObjects.Graphics,
  ): void {
    const bx = ball.x;
    const by = ball.y;
    const r = ball.radius;

    // 1. Refined Metallic Ball Halo (crisp, compact luminous glow)
    const haloRadius = Math.max(r + 2, Math.min(15, this.glowRadius));
    g.fillStyle(0x0284c7, 0.12);
    g.fillCircle(bx, by, haloRadius * 1.15);

    g.fillStyle(0x38bdf8, 0.20);
    g.fillCircle(bx, by, haloRadius * 0.80);

    g.fillStyle(0x7dd3fc, 0.30);
    g.fillCircle(bx, by, haloRadius * 0.55);

    // 2. Solid Physical Core (exact radius = r) - Luminous metallic blue-white
    g.fillStyle(0xbae6fd, 1);
    g.fillCircle(bx, by, r);

    g.fillStyle(0xf0f9ff, 0.95);
    g.fillCircle(bx, by, r * 0.85);

    // Outer rim stroke
    g.lineStyle(1.8, 0x38bdf8, 1);
    g.strokeCircle(bx, by, r);

    // 3. Brilliant White Center Specular Reflection
    g.fillStyle(0xffffff, 1);
    g.fillCircle(bx - r * 0.3, by - r * 0.3, Math.max(2.5, r * 0.32));

    // 4. Spin Indicator (rotating metallic groove marker inside ball core)
    let curRot = this.rotationByBallId.get(ball.id) ?? 0;
    curRot += ball.angularVelocity * deltaSeconds;
    this.rotationByBallId.set(ball.id, curRot);

    const markerAngle = curRot;
    const markerDist = r * 0.52;
    const mx = bx + Math.cos(markerAngle) * markerDist;
    const my = by + Math.sin(markerAngle) * markerDist;

    g.fillStyle(0x0369a1, 0.85);
    g.fillCircle(mx, my, Math.max(1.8, r * 0.22));
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(mx - 0.5, my - 0.5, Math.max(1.0, r * 0.12));

    // 5. Held State Tap-to-Launch Pulse Indicator
    if (ball.state === 'held') {
      const pulse = 1 + 0.18 * Math.sin(this.scene.time.now * 0.007);
      g.lineStyle(2, 0x38bdf8, 0.85);
      g.strokeCircle(bx, by, r * 1.5 * pulse);
    }
  }

  public destroy(): void {
    this.ballGraphics.destroy();
    this.rotationByBallId.clear();
  }
}
