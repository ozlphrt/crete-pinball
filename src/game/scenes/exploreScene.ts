import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';
import { getCreteData, getStaticFeatures, worldToLonLat } from '../../geography/aegeanData';
import { IslandFeature } from '../../geography/contracts';
import { I18nManager } from '../../i18n';
import { IslandProgressService } from '../../progress/IslandProgressService';

export class ExploreScene extends Phaser.Scene {
  private i18n!: I18nManager;
  private progressService!: IslandProgressService;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private markerGraphics!: Phaser.GameObjects.Graphics;
  private infoPanel!: Phaser.GameObjects.Container;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoSubtitle!: Phaser.GameObjects.Text;
  private infoDetails!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Touch pinch-zoom tracking
  private prevPinchDistance = 0;

  private selectedIslandId: string | null = null;

  constructor() {
    super({ key: 'ExploreScene' });
  }

  public init(data: { i18n?: I18nManager }): void {
    this.i18n = data.i18n ?? new I18nManager('en');
    this.progressService = IslandProgressService.getInstance();
  }

  public async create(): Promise<void> {
    await this.progressService.loadProgress();

    const cam = this.cameras.main;
    cam.setBackgroundColor('#030710');
    cam.setBounds(-300, -200, ARENA_CONFIG.worldWidth + 600, ARENA_CONFIG.worldHeight + 400);

    this.mapGraphics = this.add.graphics();
    this.markerGraphics = this.add.graphics().setDepth(10);
    this.drawExplorationMap();

    // UI Overlay Header (Fixed to screen camera)
    this.createHeaderAndControls();

    // Island Info Card
    this.createInfoPanel();

    // Setup Touch and Mouse Interactions
    this.setupInteractions();
  }

  private setupInteractions(): void {
    const cam = this.cameras.main;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't drag if clicking UI header at top
      if (pointer.y < 120) return;

      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // Two-finger touch detected -> start pinch zoom
      if (p1?.isDown && p2?.isDown) {
        this.isDragging = false;
        this.prevPinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        return;
      }

      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;

      const worldPt = cam.getWorldPoint(pointer.x, pointer.y);
      this.handleIslandInspection(worldPt.x, worldPt.y);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // Pinch zoom handling
      if (p1?.isDown && p2?.isDown) {
        const curDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (this.prevPinchDistance > 0) {
          const delta = (curDist - this.prevPinchDistance) * 0.005;
          const newZoom = Phaser.Math.Clamp(cam.zoom + delta, 0.8, 3.8);
          cam.setZoom(newZoom);
        }
        this.prevPinchDistance = curDist;
        return;
      }

      if (this.isDragging) {
        cam.scrollX -= (pointer.x - this.dragStartX) / cam.zoom;
        cam.scrollY -= (pointer.y - this.dragStartY) / cam.zoom;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.prevPinchDistance = 0;
    });

    // Mouse wheel zoom
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: unknown[],
        _deltaX: number,
        deltaY: number,
      ) => {
        const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.0012, 0.8, 3.8);
        cam.setZoom(newZoom);
      },
    );
  }

  private drawExplorationMap(): void {
    const g = this.mapGraphics;
    g.clear();

    const features = getStaticFeatures();
    const crete = getCreteData();
    const allFeatures = [...features, crete];

    for (const f of allFeatures) {
      const isMainland = f.classification.includes('mainland');
      const isSpecial = f.classification === 'special_island';
      const isCrete = f.classification === 'crete';
      const isTrackable = f.isTrackable && !isMainland;
      const isDiscovered = this.progressService.isDiscovered(f.id);

      let fillColor = 0x09111e;
      let strokeColor = 0x27384d;
      let strokeWidth = 1.2;

      if (isMainland) {
        fillColor = 0x08101d;
        strokeColor = 0x213247;
        strokeWidth = 1.5;
      } else if (isCrete) {
        fillColor = 0x142844;
        strokeColor = 0x58a6ff;
        strokeWidth = 2.5;
      } else if (isSpecial) {
        fillColor = isDiscovered ? 0x241d0e : 0x121722;
        strokeColor = isDiscovered ? 0xf0883e : 0x8b6534;
        strokeWidth = 2.2;
      } else if (isTrackable) {
        if (isDiscovered) {
          fillColor = 0x0b253a;
          strokeColor = 0x38bdf8;
          strokeWidth = 1.8;
        } else {
          fillColor = 0x070e1a;
          strokeColor = 0x1e293b;
          strokeWidth = 1.0;
        }
      } else {
        // Decorative islet
        fillColor = 0x050a14;
        strokeColor = 0x162030;
        strokeWidth = 0.8;
      }

      // Draw feature polygons
      for (const poly of f.geometry.polygons) {
        const ring = poly.outerRing;
        if (ring.length < 3) continue;

        g.fillStyle(fillColor, 1);
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

      // Draw labels for non-mainland features
      if (!isMainland) {
        const locale = this.i18n.getLocale();
        const name = f.names[locale] || f.names.en;

        const labelColor = isCrete
          ? '#79c0ff'
          : isSpecial
            ? isDiscovered
              ? '#f0883e'
              : '#9e6a38'
            : isTrackable
              ? isDiscovered
                ? '#58a6ff'
                : '#484f58'
              : '#30363d';

        const fontSize = isCrete ? '16px' : isSpecial ? '12px' : isTrackable ? '10px' : '9px';
        const fontStyle = isCrete || isSpecial || isDiscovered ? 'bold' : 'normal';

        this.add
          .text(f.centroid.x, f.centroid.y, name, {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize,
            fontStyle,
            color: labelColor,
            stroke: '#030710',
            strokeThickness: 3.5,
            align: 'center',
          })
          .setOrigin(0.5);
      }
    }
  }

  private handleIslandInspection(worldX: number, worldY: number): void {
    const features = getStaticFeatures();
    const crete = getCreteData();
    const allFeatures = [crete, ...features];

    let closest: IslandFeature | null = null;
    let closestDist = 55; // detection tolerance in world units

    for (const f of allFeatures) {
      if (f.classification.includes('mainland')) continue;

      const d = Math.hypot(worldX - f.centroid.x, worldY - f.centroid.y);
      if (d < closestDist) {
        closestDist = d;
        closest = f;
      }
    }

    if (closest) {
      this.selectIsland(closest);
    }
  }

  private selectIsland(f: IslandFeature): void {
    this.selectedIslandId = f.id;
    const locale = this.i18n.getLocale();
    const coords = worldToLonLat(f.centroid.x, f.centroid.y);
    const isMainland = f.classification.includes('mainland');
    const isCrete = f.classification === 'crete';
    const isTrackable = f.isTrackable && !isMainland;
    const stats = this.progressService.getIslandStats(f.id);
    const isDiscovered = Boolean(stats);

    // Draw selection marker
    this.markerGraphics.clear();
    this.markerGraphics.lineStyle(2.5, 0xf1e05a, 0.9);
    this.markerGraphics.strokeCircle(f.centroid.x, f.centroid.y, 22);

    const name = f.names[locale] || f.names.en;
    this.infoTitle.setText(name);

    const groupStr = f.group ? f.group.toUpperCase().replace('_', ' ') : 'AEGEAN';
    this.infoSubtitle.setText(
      `${groupStr} • ${coords.lat.toFixed(2)}°N, ${coords.lon.toFixed(2)}°E`,
    );

    let statusLine = '';
    if (isCrete) {
      statusLine = '🛡️ CRETE PADDLE DEFENDER • Southern Horizon';
    } else if (!isTrackable) {
      statusLine = '📍 DECORATIVE ISLET • Non-collidable geography';
    } else if (isDiscovered && stats) {
      const firstDate = stats.firstHitDateIso.slice(0, 10);
      statusLine = `✅ DISCOVERED • Hits: ${stats.totalHitCount} • Points: ${stats.totalPointsContributed.toLocaleString()} • First Visit: ${firstDate}`;
    } else {
      statusLine = '❓ UNDISCOVERED TARGET • Collide with this island during play to discover it!';
    }

    this.infoDetails.setText(statusLine);
    this.infoPanel.setVisible(true);
  }

  private createHeaderAndControls(): void {
    const uiContainer = this.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(200);

    const headerW = ARENA_CONFIG.worldWidth;
    const bg = this.add.rectangle(headerW / 2, 50, headerW, 100, 0x050b14, 0.96);
    bg.setStrokeStyle(1.5, 0x1f6feb);

    const title = this.add
      .text(headerW / 2, 28, '🗺️ AEGEAN GEOGRAPHY ATLAS', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0.5);

    const count = this.progressService.getDiscoveredCount();
    const total = this.progressService.getTotalTrackableCount();
    const pct = this.progressService.getDiscoveredPercentage().toFixed(1);

    this.progressText = this.add
      .text(headerW / 2, 58, `DISCOVERED: ${count} / ${total} (${pct}%)`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f1e05a',
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(headerW / 2, 82, 'Pinch/Scroll to Zoom • Drag to Pan • Tap any Island to Inspect', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#8b949e',
      })
      .setOrigin(0.5);

    // Back to Game button
    const backBtn = this.add
      .rectangle(90, 50, 130, 44, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });

    const backTxt = this.add
      .text(90, 50, '← Back', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#c9d1d9',
      })
      .setOrigin(0.5);

    backBtn.on('pointerover', () => backBtn.setFillStyle(0x21262d));
    backBtn.on('pointerout', () => backBtn.setFillStyle(0x161b22));
    backBtn.on('pointerdown', () => {
      this.scene.start('GamePlaceholderScene', { i18n: this.i18n });
    });

    // Zoom Controls Group (+, -, Reset)
    const zoomGroupX = headerW - 120;
    const btnSize = 38;

    // Zoom In (+)
    const zoomInBtn = this.add
      .rectangle(zoomGroupX - 45, 50, btnSize, btnSize, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const zoomInTxt = this.add
      .text(zoomGroupX - 45, 50, '+', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0.5);
    zoomInBtn.on('pointerdown', () => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom + 0.3, 0.8, 3.8));
    });

    // Zoom Out (-)
    const zoomOutBtn = this.add
      .rectangle(zoomGroupX, 50, btnSize, btnSize, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const zoomOutTxt = this.add
      .text(zoomGroupX, 50, '−', {
        fontFamily: 'monospace',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0.5);
    zoomOutBtn.on('pointerdown', () => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - 0.3, 0.8, 3.8));
    });

    // Reset View (⊙)
    const resetBtn = this.add
      .rectangle(zoomGroupX + 45, 50, btnSize, btnSize, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const resetTxt = this.add
      .text(zoomGroupX + 45, 50, '⊙', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#c9d1d9',
      })
      .setOrigin(0.5);
    resetBtn.on('pointerdown', () => {
      const cam = this.cameras.main;
      cam.setZoom(1);
      cam.centerOn(ARENA_CONFIG.worldWidth / 2, ARENA_CONFIG.worldHeight / 2);
    });

    uiContainer.add([
      bg,
      title,
      this.progressText,
      hint,
      backBtn,
      backTxt,
      zoomInBtn,
      zoomInTxt,
      zoomOutBtn,
      zoomOutTxt,
      resetBtn,
      resetTxt,
    ]);
  }

  private createInfoPanel(): void {
    const cx = ARENA_CONFIG.worldWidth / 2;
    const cy = ARENA_CONFIG.worldHeight - 110;

    this.infoPanel = this.add.container(cx, cy);
    this.infoPanel.setScrollFactor(0);
    this.infoPanel.setDepth(210);
    this.infoPanel.setVisible(false);

    const panelBg = this.add.rectangle(0, 0, 760, 150, 0x050b14, 0.98).setStrokeStyle(2, 0x38bdf8);

    this.infoTitle = this.add
      .text(-340, -45, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0, 0.5);

    this.infoSubtitle = this.add
      .text(-340, -18, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#8b949e',
      })
      .setOrigin(0, 0.5);

    this.infoDetails = this.add
      .text(-340, 22, '', {
        fontFamily: 'system-ui, monospace',
        fontSize: '15px',
        color: '#e6edf3',
        wordWrap: { width: 680 },
      })
      .setOrigin(0, 0.5);

    // Close Button (✕)
    const closeBtn = this.add
      .text(340, -45, '✕', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#8b949e',
      })
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.infoPanel.setVisible(false);
      this.markerGraphics.clear();
      this.selectedIslandId = null;
    });

    this.infoPanel.add([panelBg, this.infoTitle, this.infoSubtitle, this.infoDetails, closeBtn]);
  }

  public getSelectedIslandId(): string | null {
    return this.selectedIslandId;
  }
}
