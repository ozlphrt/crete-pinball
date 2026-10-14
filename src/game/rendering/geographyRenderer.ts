import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';
import { IslandFeature, LinearRing, CollisionSegment } from '../../geography/contracts';
import { getStaticFeatures } from '../../geography/aegeanData';
import { CretePaddle } from '../entities/cretePaddle';
import { I18nManager } from '../../i18n';
import { SupportedLocale } from '../../types';
import {
  TERRAIN_LIGHTING_SHADER_KEY,
  createTerrainLightingBaseShader,
} from './shaders/terrainLightingShader';

export interface GeographyRenderOptions {
  showCollisionSegments?: boolean;
  showBoundingBoxes?: boolean;
  showLabels?: boolean;
}

interface ActiveIslandFlash {
  featureId: string;
  impactPoint: { x: number; y: number };
  maxRadius: number;
  currentRadius: number;
  startTime: number;
  durationMs: number;
  color: number;
  segments: readonly CollisionSegment[];
}

export class GeographyRenderer {
  private readonly scene: Phaser.Scene;
  private readonly i18n: I18nManager;
  private readonly cretePaddle: CretePaddle;

  // Background and Terrain layers
  private bgImage?: Phaser.GameObjects.Image;
  private terrainImage?: Phaser.GameObjects.Image;
  private terrainLightingShader?: Phaser.GameObjects.Shader;
  private waterShimmerGraphics!: Phaser.GameObjects.Graphics;
  private fallbackGraphics!: Phaser.GameObjects.Graphics;
  private coastlineGraphics!: Phaser.GameObjects.Graphics;

  // Dynamic Crete paddle objects
  private cretePaddleSprite?: Phaser.GameObjects.Image;
  private creteDaylightSprite?: Phaser.GameObjects.Image;
  private creteLabel?: Phaser.GameObjects.Text;
  private creteChevronLeft?: Phaser.GameObjects.Text;
  private creteChevronRight?: Phaser.GameObjects.Text;
  private creteFallbackGraphics!: Phaser.GameObjects.Graphics;

  // Coastline impact & special ability glow layer
  private impactGlowLayer!: Phaser.GameObjects.Graphics;
  private activeFlashes: ActiveIslandFlash[] = [];

  // Island labels and markers
  private labelObjects: Phaser.GameObjects.Text[] = [];
  private anchorDots: Phaser.GameObjects.Arc[] = [];
  private activeHitLabels: Phaser.GameObjects.Text[] = [];
  private currentTargetIslandId: string | null = null;

  // Debug layer
  private debugLayer!: Phaser.GameObjects.Graphics;

  private options: GeographyRenderOptions = {
    showCollisionSegments: false,
    showBoundingBoxes: false,
    showLabels: false,
  };

  constructor(scene: Phaser.Scene, cretePaddle: CretePaddle, i18n: I18nManager) {
    this.scene = scene;
    this.cretePaddle = cretePaddle;
    this.i18n = i18n;

    this.createLayers();
    this.renderStaticGeography();
    this.renderCrete();
  }

  private createLayers(): void {
    // 0. Water Shimmer & Ambient Currents
    this.waterShimmerGraphics = this.scene.add.graphics();
    this.waterShimmerGraphics.setDepth(0.5);

    // 1. Fallback Vector Graphics (used if textures are not ready/mocked)
    this.fallbackGraphics = this.scene.add.graphics();
    this.fallbackGraphics.setDepth(1);

    // 3. Visible Glowing Coastline Outline Layer
    this.coastlineGraphics = this.scene.add.graphics();
    this.coastlineGraphics.setDepth(3);

    // 4. Localized coastline dynamic impact glow layer (depth 11 ensures rock arcs are visible above Crete paddle)
    this.impactGlowLayer = this.scene.add.graphics();
    this.impactGlowLayer.setDepth(11);

    // 3. Dynamic Crete fallback graphics
    this.creteFallbackGraphics = this.scene.add.graphics();
    this.creteFallbackGraphics.setDepth(10);

    // 4. Debug layer for CAD overlays (segments, bounding boxes)
    this.debugLayer = this.scene.add.graphics();
    this.debugLayer.setDepth(30);
  }

  public setOptions(options: Partial<GeographyRenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateLabelsVisibility();
    this.renderDebugOverlays();
  }

  public getOptions(): GeographyRenderOptions {
    return { ...this.options };
  }

  public toggleCollisionSegments(): boolean {
    this.options.showCollisionSegments = !this.options.showCollisionSegments;
    this.renderDebugOverlays();
    return !!this.options.showCollisionSegments;
  }

  public toggleBoundingBoxes(): boolean {
    this.options.showBoundingBoxes = !this.options.showBoundingBoxes;
    this.renderDebugOverlays();
    return !!this.options.showBoundingBoxes;
  }

  public toggleLabels(): boolean {
    this.options.showLabels = !this.options.showLabels;
    this.updateLabelsVisibility();
    return !!this.options.showLabels;
  }

  public setTargetIsland(islandId: string | null): void {
    this.currentTargetIslandId = islandId;
    this.updateTargetLabelStyles();
  }

  /**
   * Flash an island's coastline upon ball collision, revealing localized daylight relief
   * and displaying a floating dynamic name banner.
   */
  public flashIslandImpact(
    featureId: string,
    impactPoint?: { x: number; y: number },
    impactSpeed = 300,
    color = 0x38bdf8,
    durationMs = 520,
  ): void {
    let segs: readonly CollisionSegment[] = [];
    let pt: { x: number; y: number };

    if (featureId === 'island-crete') {
      segs = this.cretePaddle.getWorldCollisionSegments();
      pt = impactPoint ?? { x: this.cretePaddle.x, y: this.cretePaddle.y };

      // Make Crete island label on paddle pulse dramatically bigger on collision
      if (this.creteLabel) {
        this.scene.tweens.killTweensOf(this.creteLabel);
        this.creteLabel.setDepth(185);
        this.creteLabel.setColor('#fde047');
        this.scene.tweens.add({
          targets: this.creteLabel,
          scale: 2.0,
          duration: 180,
          yoyo: true,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.creteLabel?.setScale(1.0);
            this.creteLabel?.setColor('#e2e8f0');
            this.creteLabel?.setDepth(12);
          },
        });
      }
    } else {
      const feature = getStaticFeatures().find((f) => f.id === featureId);
      if (!feature) return;

      // Display floating name banner dynamically and noticeably bigger when the island is hit
      if (!feature.classification.includes('mainland')) {
        this.spawnIslandHitLabel(feature);
      }

      segs = feature.collisionSegments ?? [];
      pt = impactPoint ?? feature.centroid;
    }

    if (segs.length === 0 && !impactPoint) return;

    // Radius of localized daylight reveal scales naturally with impact velocity
    // Light a much larger region so the glorious terrain relief, mountain summits, and archipelagos are brilliantly visible
    const radius = Math.min(460, Math.max(260, 240 + (impactSpeed / 500) * 180));

    this.activeFlashes.push({
      featureId,
      impactPoint: pt,
      maxRadius: radius,
      currentRadius: 36,
      startTime: this.scene.time.now,
      durationMs,
      color,
      segments: segs,
    });
  }

  /**
   * Spawns an animated floating island banner that pops up dynamically and noticeably bigger when struck.
   */
  public spawnIslandHitLabel(feature: IslandFeature): void {
    const cx = feature.centroid.x;
    const cy = feature.centroid.y;
    const rawName = this.getLocalizedName(feature, this.i18n.getLocale());
    const isSpecial = feature.classification === 'special_island';
    const isTarget = feature.id === this.currentTargetIslandId;

    const isGenericIslet =
      rawName.toLowerCase().startsWith('aegean islet') || feature.id.startsWith('islet-');
    if (isGenericIslet && !isSpecial && !isTarget) {
      return;
    }

    // Clean up any existing active hit label for this island to avoid overlap stacking
    const existingHitIdx = this.activeHitLabels.findIndex(
      (lbl) => (lbl as unknown as { featureId?: string }).featureId === feature.id,
    );
    if (existingHitIdx !== -1) {
      const oldLbl = this.activeHitLabels[existingHitIdx];
      if (oldLbl) {
        this.scene.tweens.killTweensOf(oldLbl);
        oldLbl.destroy();
      }
      this.activeHitLabels.splice(existingHitIdx, 1);
    }

    // Check if the island has a permanent label currently visible on the map
    const existingLabel = this.labelObjects.find(
      (lbl) => (lbl as unknown as { featureId?: string }).featureId === feature.id,
    );
    const hasVisiblePermanentLabel = existingLabel && existingLabel.visible;

    if (hasVisiblePermanentLabel) {
      existingLabel.setAlpha(0);
    }

    const localizedName = rawName.toUpperCase();
    let textColor = '#f8fafc';
    const strokeColor = '#020617';
    let prefix = '';
    const fontSize = isSpecial || isTarget ? '34px' : '28px';

    if (isTarget) {
      textColor = '#fde047'; // radiant golden yellow for targeted island
      prefix = '🎯 ';
    } else if (isSpecial) {
      textColor = '#38bdf8'; // electric cyan for special ability islands
      prefix = '✨ ';
    }

    // Clamp position within playfield bounds so long island names never clip against screen borders
    const halfWidthEstimate = isSpecial || isTarget ? 130 : 105;
    const clampedCx = Math.max(
      halfWidthEstimate + 12,
      Math.min(ARENA_CONFIG.worldWidth - (halfWidthEstimate + 12), cx),
    );
    const startY = Math.max(170, cy - 10);
    const peakY = Math.max(140, startY - 24);
    const floatEndY = Math.max(115, peakY - 28);

    const label = this.scene.add
      .text(clampedCx, startY, `${prefix}${localizedName}`, {
        fontFamily: 'Outfit, Inter, system-ui, -apple-system, sans-serif',
        fontSize,
        fontStyle: '900',
        color: textColor,
        stroke: strokeColor,
        strokeThickness: 7,
        align: 'center',
        shadow: {
          offsetX: 0,
          offsetY: 3,
          color: '#000000',
          blur: 8,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(185)
      .setScale(0.7)
      .setAlpha(0.2);

    (label as unknown as { featureId?: string }).featureId = feature.id;
    this.activeHitLabels.push(label);

    // Dynamic punch-in animation: expands up to 1.25x scale (peak ~35px to 42.5px font size!)
    this.scene.tweens.add({
      targets: label,
      y: peakY,
      scale: 1.25,
      alpha: 1,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: label,
          y: floatEndY,
          scale: 1.1,
          alpha: 0,
          delay: 650,
          duration: 420,
          ease: 'Power2',
          onComplete: () => {
            if (hasVisiblePermanentLabel && existingLabel) {
              existingLabel.setAlpha(1);
            }
            label.destroy();
            const idx = this.activeHitLabels.indexOf(label);
            if (idx !== -1) this.activeHitLabels.splice(idx, 1);
          },
        });
      },
    });
  }

  /**
   * Flash a radiant warm golden pulse when a special island ability activates.
   */
  public flashSpecialActivation(featureId: string, durationMs = 600): void {
    this.flashIslandImpact(featureId, undefined, 500, 0xf59e0b, durationMs);
  }

  public renderStaticGeography(): void {
    const W = ARENA_CONFIG.worldWidth;
    const H = ARENA_CONFIG.worldHeight;

    // 1. Sea Background Image (Navy gradient, range rings, compass rose, atmospheric mist)
    if (this.scene.textures.exists('aegean_background')) {
      if (!this.bgImage) {
        this.bgImage = this.scene.add.image(W / 2, H / 2, 'aegean_background');
        this.bgImage.setDepth(0);
        this.bgImage.setDisplaySize(W, H);
      }
    }

    // 2. Realistic Mountain Relief Terrain Layer (Greece, Turkey, 75 Aegean Islands)
    if (this.scene.textures.exists('aegean_terrain')) {
      if (!this.terrainImage) {
        this.terrainImage = this.scene.add.image(W / 2, H / 2, 'aegean_terrain');
        this.terrainImage.setDepth(2);
        this.terrainImage.setDisplaySize(W, H);
      }
      this.fallbackGraphics.clear();
    } else {
      // Fallback vector rendering if texture not loaded
      this.renderFallbackVectorGeography();
    }

    // 2.1 Dynamic Terrain Lighting Layer (dynamically illuminated with elevation shadows)
    this.ensureLightingShader();

    // 3. Visible Glowing Coastlines & Shorelines
    this.renderCoastlineOutlines();

    // 4. Render Island Labels and Glowing Anchors
    this.renderIslandLabels();
  }

  private renderCoastlineOutlines(): void {
    const g = this.coastlineGraphics;
    g.clear();

    const features = getStaticFeatures();
    for (const feature of features) {
      if (feature.id === 'island-crete') continue; // Crete is rendered by renderCrete()

      const isMainland = feature.classification.includes('mainland');
      const isVisualOnly = feature.classification === 'islet_visual_only';

      if (isVisualOnly) {
        // Soft subdued boundary for visual-only non-collidable islets
        const ring = feature.geometry.polygons[0]?.outerRing;
        if (ring && ring.length >= 3) {
          g.lineStyle(1.0, 0x1e3a5f, 0.45);
          g.beginPath();
          g.moveTo(ring[0]!.x, ring[0]!.y);
          for (let i = 1; i < ring.length; i++) {
            g.lineTo(ring[i]!.x, ring[i]!.y);
          }
          g.closePath();
          g.strokePath();
        }
      } else if (isMainland) {
        // Mainland: subdued, elegant nautical shoreline definition
        if (feature.collisionSegments.length > 0) {
          g.lineStyle(1.0, 0x0369a1, 0.28);
          g.beginPath();
          for (const seg of feature.collisionSegments) {
            g.moveTo(seg.p1.x, seg.p1.y);
            g.lineTo(seg.p2.x, seg.p2.y);
          }
          g.strokePath();
        }
      } else {
        // Islands (collidable): refined, non-distracting marine boundary
        const ring = feature.geometry.polygons[0]?.outerRing;
        if (ring && ring.length >= 3) {
          // Soft subtle oceanic contact fringe
          g.lineStyle(1.8, 0x0369a1, 0.16);
          g.beginPath();
          g.moveTo(ring[0]!.x, ring[0]!.y);
          for (let i = 1; i < ring.length; i++) {
            g.lineTo(ring[i]!.x, ring[i]!.y);
          }
          g.closePath();
          g.strokePath();

          // Refined, calm core shoreline (less bright, allows DEM terrain to shine)
          g.lineStyle(1.0, 0x38bdf8, 0.35);
          g.beginPath();
          g.moveTo(ring[0]!.x, ring[0]!.y);
          for (let i = 1; i < ring.length; i++) {
            g.lineTo(ring[i]!.x, ring[i]!.y);
          }
          g.closePath();
          g.strokePath();
        }
      }
    }
  }

  private renderFallbackVectorGeography(): void {
    const g = this.fallbackGraphics;
    g.clear();

    const features = getStaticFeatures();
    for (const feature of features) {
      const ring = feature.geometry.polygons[0]?.outerRing;
      if (!ring) continue;

      if (feature.classification.includes('mainland')) {
        this.fillPolygon(g, ring, 0x09111e, 1);
        this.strokeCoastline(g, feature.collisionSegments, 0x38bdf8, 1.5);
      } else {
        const isVisualOnly = feature.classification === 'islet_visual_only';
        const fillColor = isVisualOnly ? 0x080e18 : 0x0d1726;
        const strokeColor = isVisualOnly ? 0x1b2838 : 0x38bdf8;
        const strokeWidth = 1.2;

        this.drawPolygon(g, ring, fillColor, 1, strokeColor, strokeWidth);
      }
    }
  }

  private renderIslandLabels(): void {
    // Clear existing labels and anchor dots
    for (const lbl of this.labelObjects) {
      lbl.destroy();
    }
    for (const dot of this.anchorDots) {
      dot.destroy();
    }
    this.labelObjects = [];
    this.anchorDots = [];

    const features = getStaticFeatures();
    const currentLocale = this.i18n.getLocale();

    for (const feature of features) {
      if (feature.classification.includes('mainland')) continue;

      if (this.isMajorNamedIsland(feature.id)) {
        const localizedName = this.getLocalizedName(feature, currentLocale).toUpperCase();
        const cx = feature.centroid.x;
        const cy = feature.centroid.y;

        // Subtle calm cyan anchor dot at island centroid
        const dot = this.scene.add.circle(cx, cy + 2, 2.0, 0x38bdf8, 0.40);
        dot.setDepth(5);
        (dot as unknown as { featureId?: string }).featureId = feature.id;
        this.anchorDots.push(dot);

        // Island label text matching reference typography:
        // Elegant sans-serif, high contrast, clean shadow
        const label = this.scene.add
          .text(cx, cy - 14, localizedName, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#cbe4ff',
            stroke: '#030712',
            strokeThickness: 4,
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(6);

        (label as unknown as { featureId?: string }).featureId = feature.id;
        this.labelObjects.push(label);
      }
    }

    this.updateTargetLabelStyles();
    this.updateLabelsVisibility();
  }

  private updateTargetLabelStyles(): void {
    for (const label of this.labelObjects) {
      const featId = (label as unknown as { featureId?: string }).featureId;
      const isTarget = featId === this.currentTargetIslandId;

      if (isTarget) {
        label.setColor('#fbbf24');
        label.setFontSize(21);
      } else {
        label.setColor('#cbe4ff');
        label.setFontSize(18);
      }
    }

    for (const dot of this.anchorDots) {
      const featId = (dot as unknown as { featureId?: string }).featureId;
      const isTarget = featId === this.currentTargetIslandId;

      if (isTarget) {
        dot.setFillStyle(0xfbbf24, 0.95);
        dot.setRadius(4);
      } else {
        dot.setFillStyle(0x38bdf8, 0.75);
        dot.setRadius(2.5);
      }
    }
  }

  public refreshLabels(): void {
    this.renderIslandLabels();
  }

  public renderCrete(): void {
    const creteBaselineY = ARENA_CONFIG.creteBaselineY;
    const creteX = this.cretePaddle.x;

    if (this.scene.textures.exists('crete_paddle')) {
      if (!this.cretePaddleSprite) {
        this.cretePaddleSprite = this.scene.add.image(creteX, creteBaselineY, 'crete_paddle');
        this.cretePaddleSprite.setDepth(10);
        this.cretePaddleSprite.setOrigin(0.5, 0.5);
        this.cretePaddleSprite.setScale(0.5); // 2x Retina asset rendered at true 1x physical size

        // Dynamic Daylight Relief Image (revealed when collisions illuminate Crete's mountain summits)
        if (!this.creteDaylightSprite && this.scene.textures.exists('crete_paddle_daylight')) {
          this.creteDaylightSprite = this.scene.add.image(
            creteX,
            creteBaselineY,
            'crete_paddle_daylight',
          );
          this.creteDaylightSprite.setDepth(10.1);
          this.creteDaylightSprite.setOrigin(0.5, 0.5);
          this.creteDaylightSprite.setScale(0.5);
          this.creteDaylightSprite.setAlpha(0);
          this.creteDaylightSprite.setVisible(false);
        }

        // Elegant CRETE typography centered over the island
        this.creteLabel = this.scene.add
          .text(creteX, creteBaselineY + 2, 'CRETE', {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '17px',
            fontStyle: 'bold',
            color: '#e2e8f0',
            stroke: '#020617',
            strokeThickness: 4,
            letterSpacing: 2,
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(12);

        // Understated movement indicators flanking western and eastern boundaries
        this.creteChevronLeft = this.scene.add
          .text(creteX - this.cretePaddle.halfWidth - 14, creteBaselineY, '«', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#38bdf8',
            stroke: '#020617',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(12);

        this.creteChevronRight = this.scene.add
          .text(creteX + this.cretePaddle.halfWidth + 14, creteBaselineY, '»', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#38bdf8',
            stroke: '#020617',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(12);
      } else {
        this.cretePaddleSprite.setPosition(creteX, creteBaselineY);
        this.cretePaddleSprite.setScale(0.5);

        if (!this.creteDaylightSprite && this.scene.textures.exists('crete_paddle_daylight')) {
          this.creteDaylightSprite = this.scene.add.image(
            creteX,
            creteBaselineY,
            'crete_paddle_daylight',
          );
          this.creteDaylightSprite.setDepth(10.1);
          this.creteDaylightSprite.setOrigin(0.5, 0.5);
          this.creteDaylightSprite.setScale(0.5);
          this.creteDaylightSprite.setAlpha(0);
          this.creteDaylightSprite.setVisible(false);
        }

        if (this.creteDaylightSprite) {
          this.creteDaylightSprite.setPosition(creteX, creteBaselineY);
          this.creteDaylightSprite.setScale(0.5);
        }

        this.creteLabel?.setPosition(creteX, creteBaselineY + 2);
        this.creteChevronLeft?.setPosition(
          creteX - this.cretePaddle.halfWidth - 14,
          creteBaselineY,
        );
        this.creteChevronRight?.setPosition(
          creteX + this.cretePaddle.halfWidth + 14,
          creteBaselineY,
        );

        if (this.scene.time) {
          const pulse = 0.70 + 0.30 * Math.sin(this.scene.time.now * 0.005);
          this.creteChevronLeft?.setAlpha(pulse);
          this.creteChevronRight?.setAlpha(pulse);
        }
      }
      this.creteFallbackGraphics.clear();
    } else {
      // Fallback vector drawing if texture not yet loaded
      const g = this.creteFallbackGraphics;
      g.clear();
      const worldRing = this.cretePaddle.getWorldPolygon();
      this.drawPolygon(g, worldRing, 0x132238, 1, 0x58a6ff, 2.5);
    }
  }

  public update(): void {
    // 1. Dynamic Crete paddle tracking
    this.renderCrete();

    // 2. Animate subtle ocean current lines (slow gentle drift)
    this.renderWaterShimmer();

    // 3. Render dynamic coastline flashes (impact & special ability pulses)
    this.renderCoastlineFlashes();

    // 4. Debug Overlays if enabled
    if (this.options.showCollisionSegments || this.options.showBoundingBoxes) {
      this.renderDebugOverlays();
    }
  }

  private renderWaterShimmer(): void {
    // Clear graphics — remove all extraneous wave lines slicing across the sea basin
    this.waterShimmerGraphics.clear();
  }

  private ensureLightingShader(): void {
    if (this.terrainLightingShader) return;
    const isWebGL = this.scene.sys?.game?.renderer?.type === Phaser.WEBGL;
    if (!isWebGL) return;

    if (
      !this.scene.textures.exists('aegean_terrain_daylight') ||
      !this.scene.textures.exists('aegean_terrain_normal')
    ) {
      return;
    }

    const W = ARENA_CONFIG.worldWidth;
    const H = ARENA_CONFIG.worldHeight;

    try {
      const shaderKey = TERRAIN_LIGHTING_SHADER_KEY;
      if (!this.scene.cache.shader.has(shaderKey)) {
        this.scene.cache.shader.add(shaderKey, createTerrainLightingBaseShader(W, H));
      }

      const texData = { repeat: false, wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge' };
      this.terrainLightingShader = this.scene.add.shader(
        shaderKey,
        0,
        0,
        W,
        H,
        ['aegean_terrain_daylight', 'aegean_terrain_normal'],
        texData,
      );
      this.terrainLightingShader.setOrigin(0, 0);
      this.terrainLightingShader.setChannel0('aegean_terrain_daylight', texData);
      this.terrainLightingShader.setChannel1('aegean_terrain_normal', texData);
      this.terrainLightingShader.setDepth(2.1);
      this.terrainLightingShader.setVisible(false);
    } catch (err) {
      console.warn('Dynamic terrain lighting shader initialization fallback:', err);
    }
  }

  private renderCoastlineFlashes(): void {
    this.ensureLightingShader();
    const g = this.impactGlowLayer;
    g.clear();

    if (this.activeFlashes.length === 0) {
      if (this.terrainLightingShader && this.terrainLightingShader.visible) {
        this.terrainLightingShader.setVisible(false);
        this.terrainLightingShader.setUniform('uLightCount.value', 0);
      }
      if (this.creteDaylightSprite && this.creteDaylightSprite.visible) {
        this.creteDaylightSprite.setVisible(false);
        this.creteDaylightSprite.setAlpha(0);
      }
      return;
    }

    const now = this.scene.time.now;

    this.activeFlashes = this.activeFlashes.filter((flash) => {
      const elapsed = now - flash.startTime;
      if (elapsed >= flash.durationMs) return false;

      // Natural expansion with fast initial burst and gentle easing (140ms to peak radius)
      const expansionT = Math.min(1, elapsed / 140);
      const easeRadius = Math.sin((expansionT * Math.PI) / 2);
      flash.currentRadius = 36 + (flash.maxRadius - 36) * easeRadius;

      // Smooth cubic fade-out after initial radiance burst (90ms)
      let alpha = 1.0;
      if (elapsed > 90) {
        const fadeProgress = (elapsed - 90) / (flash.durationMs - 90);
        alpha = Math.pow(Math.max(0, 1 - fadeProgress), 1.5);
      }

      const cx = flash.impactPoint.x;
      const cy = flash.impactPoint.y;

      // Localized electric coastline glow — segments of rock directly struck by ball
      const segs = flash.segments;
      if (segs && segs.length > 0) {
        // Tightly localized electric strike arc at the point of ball impact (within ~32px)
        const threshold = 32;
        for (const seg of segs) {
          const d1 = Math.hypot(seg.p1.x - cx, seg.p1.y - cy);
          const d2 = Math.hypot(seg.p2.x - cx, seg.p2.y - cy);
          const minD = Math.min(d1, d2);
          if (minD <= threshold) {
            const proximity = Math.pow(1 - minD / threshold, 1.3);
            const segAlpha = alpha * proximity;

            // Electric cyan/gold arc along local rock
            g.lineStyle(1.8, flash.color, segAlpha * 0.90);
            g.lineBetween(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);

            g.lineStyle(3.0, 0x38bdf8, segAlpha * 0.20);
            g.lineBetween(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);
          }
        }
      }

      return true;
    });

    if (this.terrainLightingShader) {
      if (this.activeFlashes.length > 0) {
        this.terrainLightingShader.setVisible(true);
        const count = Math.min(4, this.activeFlashes.length);
        this.terrainLightingShader.setUniform('uLightCount.value', count);

        for (let i = 0; i < 4; i++) {
          const flash = this.activeFlashes[i];
          const lightKey = `uLight${i}.value`;
          const colorKey = `uLightColor${i}.value`;

          if (flash) {
            const elapsed = now - flash.startTime;
            let alpha = 1.0;
            if (elapsed > 90) {
              const fadeProgress = (elapsed - 90) / (flash.durationMs - 90);
              alpha = Math.pow(Math.max(0, 1 - fadeProgress), 1.5);
            }

            const r = ((flash.color >> 16) & 0xff) / 255;
            const g = ((flash.color >> 8) & 0xff) / 255;
            const b = (flash.color & 0xff) / 255;

            this.terrainLightingShader.setUniform(lightKey, {
              x: flash.impactPoint.x,
              y: flash.impactPoint.y,
              z: flash.currentRadius,
              w: alpha,
            });
            this.terrainLightingShader.setUniform(colorKey, {
              x: r,
              y: g,
              z: b,
            });
          } else {
            this.terrainLightingShader.setUniform(lightKey, { x: 0, y: 0, z: 0, w: 0 });
            this.terrainLightingShader.setUniform(colorKey, { x: 1, y: 1, z: 1 });
          }
        }
      } else {
        this.terrainLightingShader.setVisible(false);
        this.terrainLightingShader.setUniform('uLightCount.value', 0);
      }
    }

    // Dynamic daylight mountain relief illumination on Crete
    if (this.creteDaylightSprite) {
      let maxCreteAlpha = 0;
      const creteX = this.cretePaddle.x;
      const creteY = ARENA_CONFIG.creteBaselineY;

      for (const flash of this.activeFlashes) {
        const elapsed = now - flash.startTime;
        let flashAlpha = 1.0;
        if (elapsed > 90) {
          const fadeProgress = (elapsed - 90) / (flash.durationMs - 90);
          flashAlpha = Math.pow(Math.max(0, 1 - fadeProgress), 1.5);
        }

        if (flash.featureId === 'island-crete') {
          // Direct collision on Crete: full radiant Mediterranean daylight reveal
          maxCreteAlpha = Math.max(maxCreteAlpha, flashAlpha * 0.98);
        } else {
          // Ambient light spill from nearby collisions (Gavdos, Kythira, Kasos, Santorini)
          const dx = creteX - flash.impactPoint.x;
          const dy = creteY - flash.impactPoint.y;
          const dist = Math.hypot(dx, dy);
          const reach = flash.currentRadius + this.cretePaddle.halfWidth * 0.7;
          if (dist < reach) {
            const proximity = Math.pow(1 - dist / reach, 1.4);
            maxCreteAlpha = Math.max(maxCreteAlpha, flashAlpha * proximity * 0.85);
          }
        }
      }

      if (maxCreteAlpha > 0.01) {
        this.creteDaylightSprite.setVisible(true);
        this.creteDaylightSprite.setAlpha(maxCreteAlpha);
      } else {
        this.creteDaylightSprite.setVisible(false);
        this.creteDaylightSprite.setAlpha(0);
      }
    }
  }

  private drawPolygon(
    g: Phaser.GameObjects.Graphics,
    ring: LinearRing,
    fillColor: number,
    fillAlpha: number,
    strokeColor: number,
    strokeWidth: number,
  ): void {
    if (ring.length < 3) return;

    g.fillStyle(fillColor, fillAlpha);
    g.lineStyle(strokeWidth, strokeColor, 1);

    g.beginPath();
    g.moveTo(ring[0]!.x, ring[0]!.y);
    for (let i = 1; i < ring.length; i++) {
      g.lineTo(ring[i]!.x, ring[i]!.y);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private fillPolygon(
    g: Phaser.GameObjects.Graphics,
    ring: LinearRing,
    fillColor: number,
    fillAlpha: number,
  ): void {
    if (ring.length < 3) return;

    g.fillStyle(fillColor, fillAlpha);
    g.beginPath();
    g.moveTo(ring[0]!.x, ring[0]!.y);
    for (let i = 1; i < ring.length; i++) {
      g.lineTo(ring[i]!.x, ring[i]!.y);
    }
    g.closePath();
    g.fillPath();
  }

  private strokeCoastline(
    g: Phaser.GameObjects.Graphics,
    segments: readonly CollisionSegment[],
    strokeColor: number,
    strokeWidth: number,
  ): void {
    if (segments.length === 0) return;

    g.lineStyle(strokeWidth, strokeColor, 1);
    g.beginPath();
    for (const seg of segments) {
      g.moveTo(seg.p1.x, seg.p1.y);
      g.lineTo(seg.p2.x, seg.p2.y);
    }
    g.strokePath();
  }

  private renderDebugOverlays(): void {
    const g = this.debugLayer;
    g.clear();

    if (!this.options.showCollisionSegments && !this.options.showBoundingBoxes) {
      return;
    }

    const features = getStaticFeatures();

    // 1. Static features debug
    for (const f of features) {
      if (this.options.showBoundingBoxes) {
        g.lineStyle(1, 0x30363d, 0.7);
        g.strokeRect(
          f.boundingBox.minX,
          f.boundingBox.minY,
          f.boundingBox.maxX - f.boundingBox.minX,
          f.boundingBox.maxY - f.boundingBox.minY,
        );
      }

      if (this.options.showCollisionSegments) {
        for (const seg of f.collisionSegments) {
          g.lineStyle(1.5, 0xf85149, 0.9);
          g.lineBetween(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);

          const midX = (seg.p1.x + seg.p2.x) / 2;
          const midY = (seg.p1.y + seg.p2.y) / 2;
          g.lineStyle(1, 0x7ee787, 0.8);
          g.lineBetween(midX, midY, midX + seg.normal.x * 6, midY + seg.normal.y * 6);
        }
      }
    }

    // 2. Crete dynamic debug
    if (this.options.showBoundingBoxes) {
      const creteBounds = this.cretePaddle.getWorldBounds();
      g.lineStyle(1.5, 0x58a6ff, 0.9);
      g.strokeRect(
        creteBounds.minX,
        creteBounds.minY,
        creteBounds.maxX - creteBounds.minX,
        creteBounds.maxY - creteBounds.minY,
      );
    }

    if (this.options.showCollisionSegments) {
      const creteSegs = this.cretePaddle.getWorldCollisionSegments();
      for (const seg of creteSegs) {
        g.lineStyle(2, 0x79c0ff, 1);
        g.lineBetween(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);

        const midX = (seg.p1.x + seg.p2.x) / 2;
        const midY = (seg.p1.y + seg.p2.y) / 2;
        g.lineStyle(1, 0x7ee787, 1);
        g.lineBetween(midX, midY, midX + seg.normal.x * 8, midY + seg.normal.y * 8);
      }
    }
  }

  private updateLabelsVisibility(): void {
    const visible = !!this.options.showLabels;
    for (const lbl of this.labelObjects) {
      lbl.setVisible(visible);
    }
    for (const dot of this.anchorDots) {
      dot.setVisible(visible);
    }
  }

  private isMajorNamedIsland(id: string): boolean {
    const majorIds = [
      'island-rhodes',
      'island-lesbos',
      'island-chios',
      'island-samos',
      'island-lemnos',
      'island-naxos',
      'island-milos',
      'island-santorini',
      'island-mykonos',
      'island-kos',
      'island-karpathos',
      'island-thasos',
      'island-samothrace',
    ];
    return majorIds.includes(id);
  }

  private getLocalizedName(feature: IslandFeature, locale: SupportedLocale): string {
    return feature.names[locale] || feature.names.en;
  }

  public destroy(): void {
    for (const lbl of this.labelObjects) {
      lbl.destroy();
    }
    for (const dot of this.anchorDots) {
      dot.destroy();
    }
    for (const hitLbl of this.activeHitLabels) {
      hitLbl.destroy();
    }
    this.labelObjects = [];
    this.anchorDots = [];
    this.activeHitLabels = [];
    this.bgImage?.destroy();
    this.terrainImage?.destroy();
    this.cretePaddleSprite?.destroy();
    this.creteDaylightSprite?.destroy();
    this.creteLabel?.destroy();
    this.creteChevronLeft?.destroy();
    this.creteChevronRight?.destroy();
    this.waterShimmerGraphics.destroy();
    this.fallbackGraphics.destroy();
    this.coastlineGraphics.destroy();
    this.creteFallbackGraphics.destroy();
    this.impactGlowLayer.destroy();
    this.debugLayer.destroy();
  }
}
