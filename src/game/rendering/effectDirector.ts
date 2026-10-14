import Phaser from 'phaser';
import { Point2D } from '../../types';
import { GameEventBus } from '../events/gameEventBus';
import { GraphicsQuality } from '../../persistence/contracts';

interface WaterRipple {
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  color: number;
  alpha: number;
  startAlpha: number;
  startTime: number;
  durationMs: number;
  lineWidth: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  alpha: number;
  size: number;
  birthTime: number;
  lifespanMs: number;
}

interface AmbientAtmosphereMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface LightningBranch {
  p1: Point2D;
  p2: Point2D;
  width: number;
}

interface ActiveLightningStrike {
  startTime: number;
  durationMs: number;
  branches: LightningBranch[];
  color: number;
}

export class EffectDirector {
  private readonly scene: Phaser.Scene;
  private readonly ripplesGraphics: Phaser.GameObjects.Graphics;
  private readonly particlesGraphics: Phaser.GameObjects.Graphics;
  private readonly atmosphereGraphics: Phaser.GameObjects.Graphics;
  private readonly lightningGraphics: Phaser.GameObjects.Graphics;

  private ripples: WaterRipple[] = [];
  private particles: SparkParticle[] = [];
  private atmosphereMotes: AmbientAtmosphereMote[] = [];
  private activeLightning: ActiveLightningStrike[] = [];

  // Floating score text pool / active list
  private activeScoreTexts: Phaser.GameObjects.Text[] = [];

  // Throttling and Quality configuration
  private quality: GraphicsQuality = 'auto';
  private reducedMotion = false;
  private maxRipples = 8;
  private maxParticles = 40;
  private maxScoreTexts = 6;

  // Rate limiting for rapid collisions
  private lastRippleTime = 0;
  private readonly MIN_RIPPLE_INTERVAL_MS = 40;

  // Weather wind influences on atmosphere
  private windVx = 0;
  private windVy = 12; // Gentle normal southward breeze

  private cleanupListeners: Array<() => void> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Depth 3: just above terrain and under balls
    this.ripplesGraphics = scene.add.graphics().setDepth(3);
    // Depth 1: subtle sea dust / atmosphere
    this.atmosphereGraphics = scene.add.graphics().setDepth(1);
    // Depth 13: sparkles and splashes
    this.particlesGraphics = scene.add.graphics().setDepth(13);
    // Depth 26: thunderstorm micro-lightning arcs (above balls and terrain)
    this.lightningGraphics = scene.add.graphics().setDepth(26);

    this.initAtmosphereMotes(ARENA_CONFIG_WIDTH, ARENA_CONFIG_HEIGHT);
  }

  public bindToEventBus(eventBus: GameEventBus): void {
    const unsubIsland = eventBus.on('islandHit', (e) => {
      this.spawnIslandHitEffects(e.impactPoint, e.points, e.isSpecial, e.isTarget, e.impactSpeed);
    });
    const unsubMainland = eventBus.on('mainlandHit', (e) => {
      this.spawnMainlandHitEffects(e.impactPoint, e.impactSpeed);
    });
    const unsubCrete = eventBus.on('creteRebound', (e) => {
      this.spawnCreteReboundEffects(e.impactPoint, e.isCharged, e.impactSpeed);
    });
    const unsubWeather = eventBus.on('weatherChanged', (e) => {
      this.updateWeatherForces(e.type, e.intensity);
    });

    this.cleanupListeners.push(unsubIsland, unsubMainland, unsubCrete, unsubWeather);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    if (quality === 'high') {
      this.maxRipples = 8;
      this.maxParticles = 40;
    } else if (quality === 'medium') {
      this.maxRipples = 5;
      this.maxParticles = 20;
    } else if (quality === 'low') {
      this.maxRipples = 2;
      this.maxParticles = 0;
    } else {
      // Auto defaults to balanced
      this.maxRipples = 6;
      this.maxParticles = 25;
    }
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) {
      this.particles = [];
      this.atmosphereMotes = [];
      this.activeLightning = [];
      this.particlesGraphics.clear();
      this.atmosphereGraphics.clear();
      this.lightningGraphics.clear();
    } else if (this.atmosphereMotes.length === 0) {
      this.initAtmosphereMotes(ARENA_CONFIG_WIDTH, ARENA_CONFIG_HEIGHT);
    }
  }

  private initAtmosphereMotes(width: number, height: number): void {
    if (this.reducedMotion || this.quality === 'low') return;
    this.atmosphereMotes = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      this.atmosphereMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 4,
        vy: 8 + Math.random() * 8,
        size: 1.2 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.2,
      });
    }
  }

  // --- Collision Effect Spawners ---

  public spawnIslandHitEffects(
    point: Point2D,
    points: number,
    isSpecial: boolean,
    isTarget: boolean,
    speed: number,
  ): void {
    const now = performance.now();
    const canSpawnRipple = now - this.lastRippleTime >= this.MIN_RIPPLE_INTERVAL_MS;

    if (canSpawnRipple && this.ripples.length < this.maxRipples) {
      this.lastRippleTime = now;
      const rippleColor = isTarget ? 0xf5bf62 : isSpecial ? 0x55e0c3 : 0x38bdf8;
      this.ripples.push({
        x: point.x,
        y: point.y,
        currentRadius: 4,
        maxRadius: Math.min(32, 14 + (speed / 500) * 16),
        color: rippleColor,
        alpha: 0.75,
        startAlpha: 0.75,
        startTime: this.scene.time.now,
        durationMs: 400,
        lineWidth: isSpecial || isTarget ? 2.0 : 1.5,
      });
    }

    // Floating Score text
    if (points > 0 && this.activeScoreTexts.length < this.maxScoreTexts) {
      this.spawnFloatingScore(point.x, point.y - 12, points, isTarget);
    }

    // Thunderstorm micro-lightning arc crackling locally at the impact point
    this.spawnMicroLightning(point, speed, isTarget ? 0xf5bf62 : isSpecial ? 0x55e0c3 : 0x38bdf8);

    // Subtle impact sparks (suppressed in reduced motion or low quality)
    if (
      !this.reducedMotion &&
      this.quality !== 'low' &&
      this.particles.length < this.maxParticles
    ) {
      const sparkColor = isTarget ? 0xf5bf62 : isSpecial ? 0x55e0c3 : 0x7dd3fc;
      const sparkCount = isTarget || isSpecial ? 6 : 4;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sparkSpeed = 30 + Math.random() * 55;
        this.particles.push({
          x: point.x,
          y: point.y,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
          color: sparkColor,
          alpha: 0.85,
          size: 1.5 + Math.random() * 1.5,
          birthTime: this.scene.time.now,
          lifespanMs: 250 + Math.random() * 120,
        });
      }
    }
  }

  public spawnMainlandHitEffects(point: Point2D, speed: number): void {
    const now = performance.now();
    if (now - this.lastRippleTime < this.MIN_RIPPLE_INTERVAL_MS) return;
    if (this.ripples.length >= this.maxRipples) return;
    this.lastRippleTime = now;

    // Subtle localized micro-lightning discharge along mainland coastline
    this.spawnMicroLightning(point, speed, 0x38bdf8);

    // Mainland impact creates a quiet, subtle deep water ripple
    this.ripples.push({
      x: point.x,
      y: point.y,
      currentRadius: 3,
      maxRadius: Math.min(22, 10 + (speed / 600) * 10),
      color: 0x1f6feb,
      alpha: 0.55,
      startAlpha: 0.55,
      startTime: this.scene.time.now,
      durationMs: 320,
      lineWidth: 1.2,
    });
  }

  public spawnCreteReboundEffects(point: Point2D, isCharged: boolean, speed: number): void {
    // Powerful electric discharge upon Crete rebound
    this.spawnMicroLightning(point, speed, isCharged ? 0xf5bf62 : 0x55e0c3);

    if (this.ripples.length < this.maxRipples) {
      const color = isCharged ? 0xf5bf62 : 0x55e0c3;
      this.ripples.push({
        x: point.x,
        y: point.y,
        currentRadius: 6,
        maxRadius: isCharged ? 48 : Math.min(36, 16 + (speed / 500) * 16),
        color,
        alpha: isCharged ? 0.95 : 0.75,
        startAlpha: isCharged ? 0.95 : 0.75,
        startTime: this.scene.time.now,
        durationMs: isCharged ? 550 : 380,
        lineWidth: isCharged ? 2.5 : 1.8,
      });
    }

    if (isCharged && !this.reducedMotion && this.quality !== 'low') {
      // Golden burst particles on power bounce
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.8;
        const sparkSpeed = 60 + Math.random() * 80;
        this.particles.push({
          x: point.x + (Math.random() - 0.5) * 20,
          y: point.y - 4,
          vx: Math.cos(angle) * sparkSpeed,
          vy: Math.sin(angle) * sparkSpeed,
          color: 0xf5bf62,
          alpha: 0.9,
          size: 2.0 + Math.random() * 1.5,
          birthTime: this.scene.time.now,
          lifespanMs: 380 + Math.random() * 150,
        });
      }

      // Subtle camera shake on charged power bounce if not reduced motion
      this.scene.cameras.main.shake(120, 0.003);
    }
  }

  /**
   * Spawns a multi-branched, jagged thunderstorm micro-lightning discharge at the collision contact point.
   */
  public spawnMicroLightning(point: Point2D, speed: number, color = 0x38bdf8): void {
    if (this.reducedMotion || this.quality === 'low') return;

    const branches: LightningBranch[] = [];
    const arcCount = 2 + Math.floor(Math.random() * 2); // 2 to 3 branches

    for (let b = 0; b < arcCount; b++) {
      const angle = (b * Math.PI * 2) / arcCount + (Math.random() - 0.5) * 0.8;
      const arcLen = 20 + Math.random() * 20 + Math.min(18, (speed / 500) * 12);

      const targetX = point.x + Math.cos(angle) * arcLen;
      const targetY = point.y + Math.sin(angle) * arcLen;

      // Primary jagged lightning branch with recursive midpoint displacement
      this.generateJaggedLightning(point, { x: targetX, y: targetY }, 3, 6.5, branches);

      // 50% chance of a secondary fork branching off along the rock
      if (Math.random() > 0.45 && branches.length > 2) {
        const forkIdx = Math.floor(branches.length / 2);
        const forkStart = branches[forkIdx]!.p2;
        const forkAngle = angle + (Math.random() > 0.5 ? 0.7 : -0.7);
        const forkLen = arcLen * 0.55;
        this.generateJaggedLightning(
          forkStart,
          {
            x: forkStart.x + Math.cos(forkAngle) * forkLen,
            y: forkStart.y + Math.sin(forkAngle) * forkLen,
          },
          2,
          4.0,
          branches,
          1.0,
        );
      }
    }

    this.activeLightning.push({
      startTime: this.scene.time.now,
      durationMs: 220,
      branches,
      color,
    });
  }

  private generateJaggedLightning(
    p1: Point2D,
    p2: Point2D,
    iterations: number,
    jitter: number,
    out: LightningBranch[],
    width = 1.4,
  ): void {
    let pts: Point2D[] = [p1, p2];

    for (let it = 0; it < iterations; it++) {
      const newPts: Point2D[] = [];
      const curJitter = jitter / Math.pow(1.6, it);

      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        newPts.push(a);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const perpX = -dy / len;
        const perpY = dx / len;
        const offset = (Math.random() - 0.5) * 2 * curJitter;

        newPts.push({
          x: (a.x + b.x) * 0.5 + perpX * offset,
          y: (a.y + b.y) * 0.5 + perpY * offset,
        });
      }
      newPts.push(pts[pts.length - 1]!);
      pts = newPts;
    }

    for (let i = 0; i < pts.length - 1; i++) {
      out.push({ p1: pts[i]!, p2: pts[i + 1]!, width });
    }
  }

  private spawnFloatingScore(x: number, y: number, points: number, isTarget: boolean): void {
    const textColor = isTarget ? '#F5BF62' : '#55E0C3';
    const textStr = `+${points}`;

    const label = this.scene.add
      .text(x, y, textStr, {
        fontFamily: 'Outfit, Inter, system-ui, sans-serif',
        fontSize: isTarget ? '19px' : '16px',
        fontStyle: '800',
        color: textColor,
        stroke: '#030712',
        strokeThickness: 3.5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setScale(0.85);

    this.activeScoreTexts.push(label);

    this.scene.tweens.add({
      targets: label,
      y: y - 28,
      scale: 1.05,
      alpha: 1,
      duration: 140,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          y: y - 48,
          alpha: 0,
          duration: 320,
          ease: 'Power1',
          onComplete: () => {
            label.destroy();
            const idx = this.activeScoreTexts.indexOf(label);
            if (idx !== -1) this.activeScoreTexts.splice(idx, 1);
          },
        });
      },
    });
  }

  private updateWeatherForces(type: string, _intensity: number): void {
    if (type === 'meltemi') {
      this.windVx = 0;
      this.windVy = 35; // Strong southward drift
    } else if (type === 'crosswind') {
      this.windVx = 25; // Lateral breeze
      this.windVy = 10;
    } else if (type === 'calm') {
      this.windVx = 0;
      this.windVy = 3; // Glassy calm
    } else {
      this.windVx = 0;
      this.windVy = 12; // Normal gentle swell
    }
  }

  // --- Animation Render Loop ---

  public update(time: number, delta: number): void {
    const dt = delta / 1000;

    // 1. Update and draw water ripples
    const gRipples = this.ripplesGraphics;
    gRipples.clear();

    if (this.ripples.length > 0) {
      this.ripples = this.ripples.filter((r) => {
        const elapsed = time - r.startTime;
        if (elapsed >= r.durationMs) return false;

        const progress = elapsed / r.durationMs;
        const currentRadius =
          r.currentRadius + (r.maxRadius - r.currentRadius) * Math.sqrt(progress);
        const currentAlpha = r.startAlpha * (1 - progress);

        gRipples.lineStyle(r.lineWidth, r.color, currentAlpha);
        gRipples.strokeCircle(r.x, r.y, currentRadius);

        // Subtle outer echo wave
        if (progress > 0.25) {
          const echoProg = (progress - 0.25) / 0.75;
          const echoRadius = currentRadius * (0.5 + 0.3 * echoProg);
          gRipples.lineStyle(r.lineWidth * 0.8, r.color, currentAlpha * 0.45);
          gRipples.strokeCircle(r.x, r.y, echoRadius);
        }

        return true;
      });
    }

    // 2. Update and draw impact spark particles
    const gParticles = this.particlesGraphics;
    gParticles.clear();

    if (!this.reducedMotion && this.particles.length > 0) {
      this.particles = this.particles.filter((p) => {
        const elapsed = time - p.birthTime;
        if (elapsed >= p.lifespanMs) return false;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 45 * dt; // Gentle downward gravity on sparks

        const progress = elapsed / p.lifespanMs;
        const alpha = p.alpha * (1 - progress);

        gParticles.fillStyle(p.color, alpha);
        gParticles.fillCircle(p.x, p.y, p.size * (1 - progress * 0.5));

        return true;
      });
    }

    // 3. Subtle sea atmosphere motes
    const gAtmo = this.atmosphereGraphics;
    gAtmo.clear();

    if (!this.reducedMotion && this.quality !== 'low' && this.atmosphereMotes.length > 0) {
      const W = ARENA_CONFIG_WIDTH;
      const H = ARENA_CONFIG_HEIGHT;

      for (const m of this.atmosphereMotes) {
        m.x += (m.vx + this.windVx) * dt;
        m.y += (m.vy + this.windVy) * dt;

        // Wrap around arena bounds seamlessly
        if (m.y > H) {
          m.y = 0;
          m.x = Math.random() * W;
        } else if (m.y < 0) {
          m.y = H;
        }
        if (m.x > W) m.x = 0;
        else if (m.x < 0) m.x = W;

        gAtmo.fillStyle(0x43c9f0, m.alpha);
        gAtmo.fillCircle(m.x, m.y, m.size);
      }
    }

    // 4. Update and draw thunderstorm micro-lightning arcs
    this.renderLightning(time);
  }

  private renderLightning(time: number): void {
    const gLightning = this.lightningGraphics;
    gLightning.clear();

    if (this.activeLightning.length === 0) return;

    this.activeLightning = this.activeLightning.filter((bolt) => {
      const elapsed = time - bolt.startTime;
      if (elapsed >= bolt.durationMs) return false;

      // Multi-phase micro-flicker: strike (0-35ms) -> dip (35-70ms) -> restrike (70-110ms) -> smooth fade
      let alpha = 1.0;
      if (elapsed < 35) {
        alpha = 1.0;
      } else if (elapsed < 70) {
        alpha = 0.45;
      } else if (elapsed < 110) {
        alpha = 0.95;
      } else {
        const decayT = (elapsed - 110) / (bolt.durationMs - 110);
        alpha = Math.pow(1 - decayT, 1.5) * 0.95;
      }

      // Outer electric halo
      for (const b of bolt.branches) {
        gLightning.lineStyle(b.width * 2.8, bolt.color, alpha * 0.65);
        gLightning.lineBetween(b.p1.x, b.p1.y, b.p2.x, b.p2.y);
      }

      // Inner white-hot electric core
      for (const b of bolt.branches) {
        gLightning.lineStyle(b.width, 0xffffff, alpha * 0.95);
        gLightning.lineBetween(b.p1.x, b.p1.y, b.p2.x, b.p2.y);
      }

      return true;
    });
  }

  public destroy(): void {
    this.cleanupListeners.forEach((cleanup) => cleanup());
    this.cleanupListeners = [];
    this.ripplesGraphics.destroy();
    this.particlesGraphics.destroy();
    this.atmosphereGraphics.destroy();
    this.lightningGraphics.destroy();
    for (const t of this.activeScoreTexts) {
      t.destroy();
    }
    this.activeScoreTexts = [];
    this.ripples = [];
    this.particles = [];
    this.atmosphereMotes = [];
    this.activeLightning = [];
  }
}

const ARENA_CONFIG_WIDTH = 900;
const ARENA_CONFIG_HEIGHT = 1600;
