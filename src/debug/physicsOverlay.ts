import Phaser from 'phaser';
import { PhysicsWorld } from '../game/physics/physicsWorld';

export class PhysicsOverlay {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private isVisibleInternal = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(25);
  }

  public get isVisible(): boolean {
    return this.isVisibleInternal;
  }

  public toggle(): boolean {
    this.isVisibleInternal = !this.isVisibleInternal;
    if (!this.isVisibleInternal) {
      this.graphics.clear();
    }
    return this.isVisibleInternal;
  }

  public setVisible(visible: boolean): void {
    this.isVisibleInternal = visible;
    if (!visible) {
      this.graphics.clear();
    }
  }

  public update(physicsWorld: PhysicsWorld): void {
    if (!this.isVisible) return;

    const g = this.graphics;
    g.clear();

    const ball = physicsWorld.getBall();
    if (ball.state === 'lost') return;

    // 1. Draw Ball Velocity Vector (cyan arrow)
    if (ball.inFlight && ball.speed > 5) {
      const arrowScale = 0.08;
      const endX = ball.x + ball.vx * arrowScale;
      const endY = ball.y + ball.vy * arrowScale;

      g.lineStyle(2, 0x58a6ff, 0.9);
      g.lineBetween(ball.x, ball.y, endX, endY);
      g.fillStyle(0x79c0ff, 1);
      g.fillCircle(endX, endY, 3.5);
    }

    // 2. Draw Recent Contact Points & Impact Normals
    const contacts = physicsWorld.getContactEvents();
    for (const c of contacts) {
      // Contact point: gold dot
      g.fillStyle(0xf0883e, 0.95);
      g.fillCircle(c.point.x, c.point.y, 4);

      // Normal vector tick: green line outward (length 14)
      g.lineStyle(2, 0x7ee787, 0.9);
      g.lineBetween(c.point.x, c.point.y, c.point.x + c.normal.x * 14, c.point.y + c.normal.y * 14);
    }

    // 3. Draw Gravity Vector Indicator (top right corner)
    const gx = 820;
    const gy = 180;
    const grav = physicsWorld.getConfig().gravity;
    g.lineStyle(1.5, 0x8b949e, 0.7);
    g.strokeCircle(gx, gy, 18);
    g.lineStyle(2, 0x58a6ff, 1);
    g.lineBetween(gx, gy, gx, gy + (grav.y / 240) * 16);
    g.fillStyle(0x58a6ff, 1);
    g.fillTriangle(gx - 4, gy + 12, gx + 4, gy + 12, gx, gy + 18);

    // 4. Draw Anti-Stuck Marker if recent
    const antiStuck = physicsWorld.getLastAntiStuckEvent();
    if (antiStuck && physicsWorld.getSimTick() - antiStuck.tick < 180) {
      g.lineStyle(2, 0xf85149, 0.9);
      g.strokeCircle(antiStuck.position.x, antiStuck.position.y, 16);
      g.lineBetween(
        antiStuck.position.x,
        antiStuck.position.y,
        antiStuck.position.x + antiStuck.impulse.x * 0.1,
        antiStuck.position.y + antiStuck.impulse.y * 0.1,
      );
    }
  }

  public destroy(): void {
    this.graphics.destroy();
  }
}
