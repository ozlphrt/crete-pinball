import { Point2D, Vector2D } from '../../types';
import { ARENA_CONFIG } from '../../config';

export type BallLifecycleState = 'held' | 'launching' | 'in_play' | 'lost';

export class BallBody {
  public readonly id: string;
  public position: Point2D;
  public velocity: Vector2D;
  public radius: number;
  public angularVelocity = 0; // rad/s
  public state: BallLifecycleState = 'held';

  constructor(
    id = 'ball-primary',
    initialPos: Point2D = { x: ARENA_CONFIG.worldWidth / 2, y: 1410 },
    radius: number = ARENA_CONFIG.defaultBallRadius,
  ) {
    this.id = id;
    this.position = { ...initialPos };
    this.velocity = { x: 0, y: 0 };
    this.radius = radius;
  }

  public setRadius(radius: number): void {
    this.radius = Math.max(ARENA_CONFIG.minBallRadius, radius);
  }

  public get x(): number {
    return this.position.x;
  }

  public get y(): number {
    return this.position.y;
  }

  public get vx(): number {
    return this.velocity.x;
  }

  public get vy(): number {
    return this.velocity.y;
  }

  public get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.y);
  }

  public get isAttachedToPaddle(): boolean {
    return this.state === 'held';
  }

  public get inFlight(): boolean {
    return this.state === 'in_play' || this.state === 'launching';
  }

  /**
   * Spawns the ball at a northern Aegean open-water coordinate, ready for countdown/drop.
   */
  public spawnAt(x: number, y: number, vx = 0, vy = 0): void {
    this.state = 'held';
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.angularVelocity = 0;
  }

  /**
   * Drops/releases the ball southward into active play.
   */
  public drop(vx: number, vy: number): void {
    this.state = 'in_play';
    this.velocity = { x: vx, y: vy };
    this.angularVelocity = vx / 100;
  }

  /**
   * Legacy method for paddle attachment.
   */
  public attachToPaddle(paddleX: number, paddleY: number): void {
    this.state = 'held';
    this.velocity = { x: 0, y: 0 };
    this.angularVelocity = 0;
    this.position = {
      x: paddleX,
      y: paddleY - 86 - this.radius - 4,
    };
  }

  /**
   * Launches the ball upward into the Aegean Sea.
   */
  public launch(initialSpeed = 650, launchAngleSpread = 0): void {
    if (this.state !== 'held') return;

    this.state = 'in_play';
    // Angle: 0 is straight north (0, -1)
    const angleRad = Math.max(-0.6, Math.min(0.6, launchAngleSpread));
    const vx = Math.sin(angleRad) * initialSpeed;
    const vy = -Math.cos(angleRad) * initialSpeed;

    this.velocity = { x: vx, y: vy };
    this.angularVelocity = angleRad * 5;
  }

  /**
   * Integrates acceleration, damping, and spin decay over a fixed step dt.
   */
  public integrate(gravity: Vector2D, dt: number, spinDecayRate = 0.985, maxSpeed = 1100): void {
    if (this.state !== 'in_play') return;

    // Apply gentle southward gravity
    let newVx = this.velocity.x + gravity.x * dt;
    let newVy = this.velocity.y + gravity.y * dt;

    // Spin decay (gradual angular damping)
    this.angularVelocity *= Math.pow(spinDecayRate, dt * 60);

    // Speed clamping (max speed cap)
    const currentSpeed = Math.hypot(newVx, newVy);
    if (currentSpeed > maxSpeed) {
      newVx = (newVx / currentSpeed) * maxSpeed;
      newVy = (newVy / currentSpeed) * maxSpeed;
    }

    this.velocity = { x: newVx, y: newVy };
  }

  /**
   * Directly sets position.
   */
  public setPosition(x: number, y: number): void {
    this.position = { x, y };
  }

  /**
   * Directly sets velocity.
   */
  public setVelocity(vx: number, vy: number): void {
    this.velocity = { x: vx, y: vy };
  }

  /**
   * Applies a velocity impulse.
   */
  public applyImpulse(impulse: Vector2D): void {
    this.velocity = {
      x: this.velocity.x + impulse.x,
      y: this.velocity.y + impulse.y,
    };
  }

  /**
   * Marks the ball as lost through the southern exit.
   */
  public markLost(): void {
    this.state = 'lost';
    this.velocity = { x: 0, y: 0 };
    this.angularVelocity = 0;
  }
}
