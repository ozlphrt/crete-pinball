import { Point2D, Vector2D } from '../../types';
import { ARENA_CONFIG, PhysicsConfig, PHYSICS_PRESETS } from '../../config';
import { FixedStepClock } from './fixedStepClock';
import { SpatialHashGrid } from './spatialHashGrid';
import { ContinuousCollision, SweptHit } from './continuousCollision';
import { BallBody } from './ballBody';
import { CretePaddle } from '../entities/cretePaddle';
import { PaddleRebound } from './paddleRebound';
import { ArenaBoundary } from './arenaBoundary';
import { AntiStuck, AntiStuckEvent } from './antiStuck';
import { getStaticFeatures } from '../../geography/aegeanData';
import { CollisionSegment } from '../../geography/contracts';
import { SpecialIslandSystem } from '../abilities/specialIslandSystem';

export interface PhysicsContactEvent {
  readonly tick: number;
  readonly ballId: string;
  readonly featureId: string;
  readonly point: Point2D;
  readonly normal: Vector2D;
  readonly incomingSpeed: number;
  readonly outgoingSpeed: number;
  readonly isNorthernPaddleHit: boolean;
  readonly isBoundaryHit: boolean;
  readonly isPowerBounceUsed?: boolean;
}

export interface BallSnapshotData {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly radius: number;
  readonly angularVelocity: number;
  readonly state: 'held' | 'launching' | 'in_play' | 'lost';
}

export interface PhysicsSnapshot {
  readonly tick: number;
  readonly ball: {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
    readonly radius: number;
    readonly angularVelocity: number;
    readonly state: 'held' | 'launching' | 'in_play' | 'lost';
  };
  readonly bonusBalls?: readonly BallSnapshotData[];
  readonly paddle: {
    readonly x: number;
    readonly velocityX: number;
  };
  readonly weatherForce?: Vector2D;
  readonly isPowerBounceArmed?: boolean;
}

export class PhysicsWorld {
  private readonly clock: FixedStepClock;
  private readonly grid: SpatialHashGrid;
  private readonly boundary: ArenaBoundary;
  private readonly antiStuck: AntiStuck;
  private readonly paddle: CretePaddle;
  private config: PhysicsConfig;

  // Active balls: index 0 is primary, bonus balls are added/removed dynamically
  private readonly primaryBall: BallBody;
  private bonusBalls: BallBody[] = [];

  // Phase 04 Advanced Arcade Modifiers
  private weatherForce: Vector2D = { x: 0, y: 0 };
  private timeDilationFactor = 1.0;
  private isPowerBounceArmed = false;
  private specialIslandSystem?: SpecialIslandSystem;

  private simTick = 0;
  private isPaused = false;
  private recentNormals: Vector2D[] = [];
  private contactEvents: PhysicsContactEvent[] = [];
  private sweptInterventionsCount = 0;
  private paddleIntrusionSuppressed = false;

  private onContactCallback?: (ev: PhysicsContactEvent) => void;
  private onBallLostCallback?: (ballId: string) => void;
  private onBonusBallLostCallback?: (ballId: string) => void;
  private onPowerBounceConsumedCallback?: (point: Point2D, speed: number) => void;

  constructor(
    paddle: CretePaddle,
    config: PhysicsConfig = PHYSICS_PRESETS.normal,
    initialBallRadius = ARENA_CONFIG.defaultBallRadius,
  ) {
    this.paddle = paddle;
    this.config = config;
    this.clock = new FixedStepClock(config.stepFrequencyHz);
    this.grid = new SpatialHashGrid(75);
    this.boundary = new ArenaBoundary();
    this.antiStuck = new AntiStuck();
    this.primaryBall = new BallBody('ball-primary', { x: 450, y: 240 }, initialBallRadius);

    this.indexStaticFeatures();
  }

  private indexStaticFeatures(): void {
    const features = getStaticFeatures();
    for (const f of features) {
      if (!f.isCollidable) continue;
      for (const seg of f.collisionSegments) {
        this.grid.insert(seg, f.id, false);
      }
    }
  }

  public setConfig(config: PhysicsConfig): void {
    this.config = config;
  }

  public setGravity(gx: number, gy: number): void {
    this.config = { ...this.config, gravity: { x: gx, y: gy } };
  }

  public setMaxBallSpeed(speed: number): void {
    this.config = { ...this.config, maxBallSpeed: speed };
  }

  public getConfig(): PhysicsConfig {
    return this.config;
  }

  public getBall(): BallBody {
    return this.primaryBall;
  }

  public getBalls(): readonly BallBody[] {
    return [this.primaryBall, ...this.bonusBalls];
  }

  public getActiveBalls(): BallBody[] {
    return [this.primaryBall, ...this.bonusBalls].filter(
      (b) => b.state === 'in_play' || b.state === 'held',
    );
  }

  public addBonusBall(x: number, y: number, vx: number, vy: number, id?: string): BallBody {
    const bonusId = id ?? `ball-bonus-${this.bonusBalls.length + 1}`;
    const ball = new BallBody(bonusId, { x, y }, this.primaryBall.radius);
    ball.drop(vx, vy);
    this.bonusBalls.push(ball);
    return ball;
  }

  public hasActiveBalls(): boolean {
    return [this.primaryBall, ...this.bonusBalls].some(
      (b) => b.state === 'in_play' || b.state === 'held',
    );
  }

  public retireBonusBalls(survivingBallId?: string): void {
    if (this.primaryBall.state === 'lost') {
      // If primary ball was lost earlier during multiball, promote surviving bonus ball into primary
      const survivor =
        (survivingBallId
          ? this.bonusBalls.find(
              (b) => b.id === survivingBallId && (b.state === 'in_play' || b.state === 'held'),
            )
          : null) ??
        this.bonusBalls.find((b) => b.state === 'in_play' || b.state === 'held');

      if (survivor) {
        this.primaryBall.setPosition(survivor.x, survivor.y);
        this.primaryBall.setVelocity(survivor.vx, survivor.vy);
        this.primaryBall.angularVelocity = survivor.angularVelocity;
        this.primaryBall.state = survivor.state;
      }
    }

    for (const b of this.bonusBalls) {
      b.markLost();
    }
    this.bonusBalls = [];
  }

  public getGrid(): SpatialHashGrid {
    return this.grid;
  }

  public getPaddle(): CretePaddle {
    return this.paddle;
  }

  public getSimTick(): number {
    return this.simTick;
  }

  public getContactEvents(): readonly PhysicsContactEvent[] {
    return this.contactEvents;
  }

  public getLastAntiStuckEvent(): AntiStuckEvent | null {
    return this.antiStuck.getLastEvent();
  }

  public getAntiStuckInterventionsCount(): number {
    return this.antiStuck.getInterventionsCount();
  }

  public getSweptInterventionsCount(): number {
    return this.sweptInterventionsCount;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.clock.reset();
    }
  }

  public setWeatherForce(fx: number, fy: number): void {
    this.weatherForce = { x: fx, y: fy };
  }

  public getWeatherForce(): Vector2D {
    return this.weatherForce;
  }

  public getEffectiveGravity(): Vector2D {
    return {
      x: this.config.gravity.x + this.weatherForce.x,
      y: Math.max(80, this.config.gravity.y + this.weatherForce.y),
    };
  }

  public setTimeDilationFactor(factor: number): void {
    this.timeDilationFactor = Math.max(0.1, Math.min(2.0, factor));
  }

  public getTimeDilationFactor(): number {
    return this.timeDilationFactor;
  }

  public setPowerBounceArmed(armed: boolean): void {
    this.isPowerBounceArmed = armed;
  }

  public getIsPowerBounceArmed(): boolean {
    return this.isPowerBounceArmed;
  }

  public setSpecialIslandSystem(sys: SpecialIslandSystem): void {
    this.specialIslandSystem = sys;
  }

  public setOnBonusBallLost(cb?: (ballId: string) => void): void {
    this.onBonusBallLostCallback = cb;
  }

  public setOnPowerBounceConsumed(cb?: (point: Point2D, speed: number) => void): void {
    this.onPowerBounceConsumedCallback = cb;
  }

  /**
   * Main update called once per animation frame with arbitrary render delta.
   * Runs the deterministic 120 Hz fixed steps, scaled by timeDilationFactor.
   */
  public update(renderDeltaMs: number): void {
    if (this.isPaused) return;

    // Scale delta by time dilation for cinematic slow motion while preserving 120 Hz fixed precision
    const scaledDelta = renderDeltaMs * this.timeDilationFactor;

    this.clock.update(scaledDelta, (fixedDtMs: number) => {
      this.stepSimulation(fixedDtMs / 1000);
    });
  }

  /**
   * Single deterministic simulation tick.
   */
  public stepSimulation(dt: number): void {
    this.simTick++;

    // 1. Update dynamic Crete collider segments
    this.grid.clearDynamic();
    const creteSegments = this.paddle.getWorldCollisionSegments();
    for (const seg of creteSegments) {
      this.grid.insert(seg, 'island-crete', true);
    }

    // 2. Step each active ball independently
    const allBalls = [this.primaryBall, ...this.bonusBalls];
    for (const ball of allBalls) {
      if (ball.state === 'in_play' || ball.state === 'held') {
        this.stepBall(ball, dt, creteSegments);
      }
    }

    // Clean up any bonus balls that were marked lost
    this.bonusBalls = this.bonusBalls.filter((b) => b.state !== 'lost');
  }

  private stepBall(ball: BallBody, dt: number, creteSegments: readonly CollisionSegment[]): void {
    // Non-finite position/velocity sanity safeguard
    if (isNaN(ball.x) || isNaN(ball.y) || isNaN(ball.vx) || isNaN(ball.vy)) {
      console.warn(`[PhysicsWorld] Detected NaN state on ball ${ball.id}, resetting to northern safe zone`);
      ball.setPosition(ARENA_CONFIG.worldWidth / 2, 220);
      ball.setVelocity(0, 320);
    }

    // 1. Handle Held state (ball waits stationary at northern spawn point)
    if (ball.state === 'held') {
      this.paddleIntrusionSuppressed = false;
      return;
    }

    // Reset paddle intrusion suppression when ball is in open water north of Crete or flying northward
    if (ball.state === 'in_play' && (ball.y < 1375 || ball.vy < -50)) {
      this.paddleIntrusionSuppressed = false;
    }

    // Dynamic paddle intrusion safeguard
    let hadPaddleOverlap = false;
    if (ball.state === 'in_play') {
      const bounds = this.paddle.getWorldBounds();
      if (
        ball.x >= bounds.minX - ball.radius &&
        ball.x <= bounds.maxX + ball.radius &&
        ball.y >= bounds.minY - ball.radius &&
        ball.y <= bounds.maxY + ball.radius
      ) {
        for (let iter = 0; iter < 3; iter++) {
          let deepestPenetration = 0;
          let bestSeg: CollisionSegment | null = null;

          for (const seg of creteSegments) {
            const d = ContinuousCollision.distPointToSegment(ball.position, seg.p1, seg.p2);
            if (d < ball.radius) {
              const penetration = ball.radius - d;
              if (penetration > deepestPenetration) {
                deepestPenetration = penetration;
                bestSeg = seg;
              }
            }
          }

          if (bestSeg && deepestPenetration > 0) {
            hadPaddleOverlap = true;
            if (ball.vy >= 0) {
              this.paddleIntrusionSuppressed = true;
            }
            const pushDist = deepestPenetration + 0.5;
            ball.setPosition(
              ball.x + bestSeg.normal.x * pushDist,
              ball.y + bestSeg.normal.y * pushDist,
            );
          } else {
            break;
          }
        }

        if (hadPaddleOverlap) {
          const prevVy = ball.vy;
          const prevVx = ball.vx;

          let newVx = prevVx;
          if (Math.abs(this.paddle.velocityX) > 10) {
            const lateralShift =
              Math.sign(this.paddle.velocityX) *
              Math.min(120, Math.abs(this.paddle.velocityX) * 0.15);
            newVx += lateralShift;
          }

          const newVy = prevVy < 0 ? prevVy : Math.max(0, prevVy);
          ball.setVelocity(newVx, newVy);
        }
      }
    }

    if (ball.state === 'lost') {
      this.paddleIntrusionSuppressed = false;
      return;
    }

    // 2. Integrate effective gravity (base + weather) & spin decay
    const effectiveGravity = this.getEffectiveGravity();
    ball.integrate(effectiveGravity, dt, this.config.spinDecayRate, this.config.maxBallSpeed);

    // 3. Swept Collision Multi-Step Resolution (up to 3 bounces per tick in tight channels)
    let remainingFraction = 1.0;
    const maxSubSteps = 3;

    for (let subStep = 0; subStep < maxSubSteps && remainingFraction > 1e-4; subStep++) {
      const stepDt = dt * remainingFraction;
      const p0 = { x: ball.x, y: ball.y };
      const p1 = {
        x: p0.x + ball.vx * stepDt,
        y: p0.y + ball.vy * stepDt,
      };

      const sweptBox = {
        minX: Math.min(p0.x, p1.x) - ball.radius,
        maxX: Math.max(p0.x, p1.x) + ball.radius,
        minY: Math.min(p0.y, p1.y) - ball.radius,
        maxY: Math.max(p0.y, p1.y) + ball.radius,
      };

      const candidates = this.grid.query(sweptBox);
      const hit = ContinuousCollision.sweepCircle(p0, p1, ball.radius, candidates);

      if (hit) {
        this.sweptInterventionsCount++;

        const eps = 0.15;
        ball.setPosition(
          p0.x + hit.t * (p1.x - p0.x) + hit.normal.x * eps,
          p0.y + hit.t * (p1.y - p0.y) + hit.normal.y * eps,
        );

        const incomingSpeed = ball.speed;

        // Check if hitting Crete paddle
        if (hit.featureId === 'island-crete') {
          if (this.paddleIntrusionSuppressed) {
            this.resolveLandCollision(ball, hit);
            if (ball.vy < 0) {
              ball.setVelocity(ball.vx, 0);
            }
            this.recordContact(hit, incomingSpeed, ball.speed, false, false, ball.id);
          } else {
            const isPower = this.isPowerBounceArmed;
            const rebound = PaddleRebound.computeRebound(
              hit,
              ball.velocity,
              this.paddle.x,
              this.paddle.halfWidth,
              this.paddle.velocityX,
              this.config,
              isPower,
            );

            ball.setVelocity(rebound.newVelocity.x, rebound.newVelocity.y);
            ball.angularVelocity += rebound.angularImpulse;

            if (rebound.isNorthernPaddleHit && rebound.isPowerBounceUsed) {
              this.isPowerBounceArmed = false;
              if (this.onPowerBounceConsumedCallback) {
                this.onPowerBounceConsumedCallback(hit.point, ball.speed);
              }
            }

            this.recordContact(
              hit,
              incomingSpeed,
              ball.speed,
              rebound.isNorthernPaddleHit,
              false,
              ball.id,
              rebound.isPowerBounceUsed,
            );
          }
        } else {
          // Standard solid land reflection with friction and spin exchange
          this.resolveLandCollision(ball, hit);

          // Check if hitting a special island
          if (this.specialIslandSystem) {
            const special = this.specialIslandSystem.handleContact(
              hit.featureId,
              hit.point,
              hit.normal,
              incomingSpeed,
            );

            if (special.activated) {
              if (special.impulse) {
                // Explosive bumper impulse
                const newVx = special.impulse.x;
                const newVy = special.impulse.y;
                const spd = Math.hypot(newVx, newVy);
                const capped = Math.min(this.config.maxBallSpeed, spd);
                if (spd > 1e-4) {
                  ball.setVelocity((newVx / spd) * capped, (newVy / spd) * capped);
                }
              } else if (special.speedBoost) {
                // Rhodes speed boost
                const curSpd = ball.speed;
                const boosted = Math.min(this.config.maxBallSpeed, curSpd + special.speedBoost);
                if (curSpd > 1e-4) {
                  ball.setVelocity((ball.vx / curSpd) * boosted, (ball.vy / curSpd) * boosted);
                }
              }
            }
          }

          this.recordContact(hit, incomingSpeed, ball.speed, false, false, ball.id);
        }

        this.recentNormals.push(hit.normal);
        if (this.recentNormals.length > 8) this.recentNormals.shift();

        // Check for rapid bounce chatter / infinite loop trap on contact
        this.antiStuck.recordBounce(ball, this.simTick, hit.point.x, hit.point.y, this.recentNormals);

        remainingFraction *= 1 - hit.t;
      } else {
        ball.setPosition(p1.x, p1.y);
        remainingFraction = 0;
      }
    }

    // 4. Arena boundary reflections
    const boundRefl = this.boundary.resolveReflection(
      ball.position,
      ball.velocity,
      ball.radius,
      this.config.ballRestitution,
    );

    if (boundRefl.reflected) {
      ball.setPosition(boundRefl.newPosition.x, boundRefl.newPosition.y);
      ball.setVelocity(boundRefl.newVelocity.x, boundRefl.newVelocity.y);
    }

    // 5. Southern escape drain loss detection (center.y - radius >= 1580)
    if (this.boundary.isFullyEscapedSouth(ball.position, ball.radius)) {
      ball.markLost();

      // Check if any other balls remain active
      const activeCount = [this.primaryBall, ...this.bonusBalls].filter(
        (b) => (b.state === 'in_play' || b.state === 'held') && b.id !== ball.id,
      ).length;

      if (activeCount > 0) {
        // Bonus exit: does not deduct life!
        if (this.onBonusBallLostCallback) {
          this.onBonusBallLostCallback(ball.id);
        }
      } else {
        // Final ball loss: normal life loss
        if (this.onBallLostCallback) {
          this.onBallLostCallback(ball.id);
        }
      }
      return;
    }

    // 6. Anti-stuck assistance check (for all active balls)
    this.antiStuck.update(ball, this.simTick, this.recentNormals);
  }

  private resolveLandCollision(ball: BallBody, hit: SweptHit): void {
    const vx = ball.vx;
    const vy = ball.vy;
    const nx = hit.normal.x;
    const ny = hit.normal.y;

    const vDotN = vx * nx + vy * ny;
    const vnX = vDotN * nx;
    const vnY = vDotN * ny;

    const vtX = vx - vnX;
    const vtY = vy - vnY;
    const vtSpeed = Math.hypot(vtX, vtY);

    const restitution = this.config.ballRestitution;
    const outVnX = -vnX * restitution;
    const outVnY = -vnY * restitution;

    let outVtX = vtX;
    let outVtY = vtY;

    if (vtSpeed > 1e-4) {
      const tangentX = vtX / vtSpeed;
      const tangentY = vtY / vtSpeed;

      const surfaceSlip = vtSpeed + ball.angularVelocity * ball.radius;
      const frictionImpulse = Math.min(vtSpeed, Math.abs(surfaceSlip) * this.config.landFriction);

      outVtX -= tangentX * frictionImpulse;
      outVtY -= tangentY * frictionImpulse;

      ball.angularVelocity -= (Math.sign(surfaceSlip) * frictionImpulse * 0.5) / ball.radius;
    }

    const finalVx = outVnX + outVtX;
    const finalVy = outVnY + outVtY;
    const finalSpeed = Math.hypot(finalVx, finalVy);
    const minSpeed = this.config.minBallSpeed;

    if (finalSpeed < minSpeed && finalSpeed > 1e-4) {
      ball.setVelocity((finalVx / finalSpeed) * minSpeed, (finalVy / finalSpeed) * minSpeed);
    } else {
      ball.setVelocity(finalVx, finalVy);
    }
  }

  private recordContact(
    hit: SweptHit,
    incomingSpeed: number,
    outgoingSpeed: number,
    isNorthernPaddleHit: boolean,
    isBoundaryHit: boolean,
    ballId = 'ball-primary',
    isPowerBounceUsed = false,
  ): void {
    const ev: PhysicsContactEvent = {
      tick: this.simTick,
      ballId,
      featureId: hit.featureId,
      point: { ...hit.point },
      normal: { ...hit.normal },
      incomingSpeed,
      outgoingSpeed,
      isNorthernPaddleHit,
      isBoundaryHit,
      isPowerBounceUsed,
    };

    this.contactEvents.push(ev);
    if (this.contactEvents.length > 20) {
      this.contactEvents.shift();
    }
    if (this.onContactCallback) {
      this.onContactCallback(ev);
    }
  }

  public setOnContact(callback?: (ev: PhysicsContactEvent) => void): void {
    this.onContactCallback = callback;
  }

  public setOnBallLost(callback?: (ballId: string) => void): void {
    this.onBallLostCallback = callback;
  }

  public createSnapshot(): PhysicsSnapshot {
    return {
      tick: this.simTick,
      ball: {
        x: this.primaryBall.x,
        y: this.primaryBall.y,
        vx: this.primaryBall.vx,
        vy: this.primaryBall.vy,
        radius: this.primaryBall.radius,
        angularVelocity: this.primaryBall.angularVelocity,
        state: this.primaryBall.state,
      },
      bonusBalls: this.bonusBalls.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        radius: b.radius,
        angularVelocity: b.angularVelocity,
        state: b.state,
      })),
      paddle: {
        x: this.paddle.x,
        velocityX: this.paddle.velocityX,
      },
      weatherForce: { ...this.weatherForce },
      isPowerBounceArmed: this.isPowerBounceArmed,
    };
  }

  public restoreSnapshot(snap: PhysicsSnapshot): void {
    this.simTick = snap.tick;
    this.primaryBall.setPosition(snap.ball.x, snap.ball.y);
    this.primaryBall.setVelocity(snap.ball.vx, snap.ball.vy);
    this.primaryBall.angularVelocity = snap.ball.angularVelocity;
    this.primaryBall.state = snap.ball.state;

    this.bonusBalls = [];
    if (snap.bonusBalls) {
      for (const bData of snap.bonusBalls) {
        if (bData.state === 'in_play' || bData.state === 'held') {
          const ball = new BallBody(bData.id, { x: bData.x, y: bData.y }, bData.radius);
          ball.setVelocity(bData.vx, bData.vy);
          ball.angularVelocity = bData.angularVelocity;
          ball.state = bData.state;
          this.bonusBalls.push(ball);
        }
      }
    }

    if (snap.weatherForce) {
      this.weatherForce = { ...snap.weatherForce };
    }
    if (typeof snap.isPowerBounceArmed === 'boolean') {
      this.isPowerBounceArmed = snap.isPowerBounceArmed;
    }

    this.paddle.setTargetX(snap.paddle.x);
    this.paddle.update(0.016);
    this.clock.reset();
  }
}
