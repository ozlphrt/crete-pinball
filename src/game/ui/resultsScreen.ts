import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';
import { getCreteData, getStaticFeatures } from '../../geography/aegeanData';
import { I18nManager } from '../../i18n';
import { ShareService } from '../../results/ShareService';
import { RunSummary } from '../systems/runController';

export class ResultsScreen {
  private container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private i18n: I18nManager;

  private onPlayAgainCallback?: () => void;
  private onExploreCallback?: () => void;
  private onAchievementsCallback?: () => void;

  constructor(scene: Phaser.Scene, i18n?: I18nManager) {
    this.scene = scene;
    this.i18n = i18n ?? new I18nManager('en');
    this.container = scene.add.container(0, 0).setDepth(500);
    this.container.setVisible(false);
  }

  public setI18n(i18n: I18nManager): void {
    this.i18n = i18n;
  }

  public show(summary: RunSummary, sessionHitCounts: Record<string, number> = {}): void {
    this.container.removeAll(true);

    const cx = ARENA_CONFIG.worldWidth / 2;
    const cy = ARENA_CONFIG.worldHeight / 2 - 20;

    // Dark nautical backdrop overlay
    const backdrop = this.scene.add
      .rectangle(
        cx,
        ARENA_CONFIG.worldHeight / 2,
        ARENA_CONFIG.worldWidth,
        ARENA_CONFIG.worldHeight,
        0x040812,
        0.92,
      )
      .setInteractive(); // blocks input behind modal
    this.container.add(backdrop);

    // Card panel
    const cardWidth = 720;
    const cardHeight = 1120;
    const cardBg = this.scene.add
      .rectangle(cx, cy, cardWidth, cardHeight, 0x0d1117, 0.98)
      .setStrokeStyle(2.5, 0x1f6feb);
    this.container.add(cardBg);

    // Title: GAME OVER
    const titleText = this.scene.add
      .text(cx, cy - 510, this.i18n.t('results.gameOver') || 'GAME OVER', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#f85149',
      })
      .setOrigin(0.5);
    this.container.add(titleText);

    // New Best badge (if achieved)
    if (summary.isNewHighScore) {
      const bestBadge = this.scene.add
        .text(cx, cy - 465, `★ ${this.i18n.t('results.newRecord') || 'NEW PERSONAL RECORD!'} ★`, {
          fontFamily: 'monospace',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#f1e05a',
        })
        .setOrigin(0.5);
      this.container.add(bestBadge);
    }

    // Final Score
    const scoreVal = this.scene.add
      .text(cx, cy - 405, summary.finalScore.toLocaleString(), {
        fontFamily: 'system-ui, -apple-system, monospace',
        fontSize: '68px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const scoreLabel = this.scene.add
      .text(cx, cy - 355, this.i18n.t('hud.score') || 'FINAL SCORE', {
        fontFamily: 'monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#8b949e',
      })
      .setOrigin(0.5);
    this.container.add([scoreVal, scoreLabel]);

    // Visited-Islands Mini-Map Container
    const mapY = cy - 130;
    const mapContainer = this.createVisitedIslandsMap(cx, mapY, sessionHitCounts);
    this.container.add(mapContainer);

    // Stats Grid
    const statStartY = cy + 115;
    const statLineHeight = 36;

    const stats: [string, string][] = [
      ['DIFFICULTY', summary.difficulty.toUpperCase()],
      [this.i18n.t('results.survivalTime') || 'SURVIVAL TIME', summary.formattedDuration],
      [
        this.i18n.t('results.islandHits') || 'ISLAND HITS',
        `${summary.totalIslandHits} (${summary.distinctIslandsCount} ${this.i18n.t('results.distinct') || 'distinct'})`,
      ],
      [this.i18n.t('results.maxCombo') || 'MAX COMBO', `×${summary.highestCombo}`],
      ['PERSONAL BEST', Math.max(summary.finalScore, summary.previousHighScore).toLocaleString()],
    ];

    stats.forEach(([label, val], idx) => {
      const y = statStartY + idx * statLineHeight;
      const lbl = this.scene.add
        .text(cx - 280, y, label, {
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#8b949e',
        })
        .setOrigin(0, 0.5);

      const v = this.scene.add
        .text(cx + 280, y, val, {
          fontFamily: 'monospace',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#e6edf3',
        })
        .setOrigin(1, 0.5);

      this.container.add([lbl, v]);
    });

    // Share Status Toast
    const shareStatus = this.scene.add
      .text(cx, cy + 315, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#3fb950',
      })
      .setOrigin(0.5);
    this.container.add(shareStatus);

    // Button: PLAY AGAIN (Primary Action)
    const btnPlayAgainY = cy + 365;
    const playAgainBg = this.scene.add
      .rectangle(cx, btnPlayAgainY, 440, 62, 0x1f6feb)
      .setStrokeStyle(1.5, 0x388bfd)
      .setInteractive({ useHandCursor: true });

    const playAgainText = this.scene.add
      .text(cx, btnPlayAgainY, `🔄 ${this.i18n.t('results.playAgain') || 'PLAY AGAIN'}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    playAgainBg.on('pointerover', () => playAgainBg.setFillStyle(0x388bfd));
    playAgainBg.on('pointerout', () => playAgainBg.setFillStyle(0x1f6feb));
    playAgainBg.on('pointerdown', () => {
      this.hide();
      if (this.onPlayAgainCallback) {
        this.onPlayAgainCallback();
      }
    });
    this.container.add([playAgainBg, playAgainText]);

    // Secondary Action Buttons Row (Explore Atlas, Achievements, Share Result)
    const btnRowY = cy + 445;
    const btnW = 205;
    const btnH = 50;

    // 1. Explore Atlas
    const exploreBg = this.scene.add
      .rectangle(cx - 225, btnRowY, btnW, btnH, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const exploreTxt = this.scene.add
      .text(cx - 225, btnRowY, '🗺️ Atlas', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#c9d1d9',
      })
      .setOrigin(0.5);
    exploreBg.on('pointerover', () => exploreBg.setFillStyle(0x21262d));
    exploreBg.on('pointerout', () => exploreBg.setFillStyle(0x161b22));
    exploreBg.on('pointerdown', () => {
      this.hide();
      if (this.onExploreCallback) {
        this.onExploreCallback();
      }
    });

    // 2. Achievements
    const achBg = this.scene.add
      .rectangle(cx, btnRowY, btnW, btnH, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const achTxt = this.scene.add
      .text(cx, btnRowY, '🏆 Badges', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#c9d1d9',
      })
      .setOrigin(0.5);
    achBg.on('pointerover', () => achBg.setFillStyle(0x21262d));
    achBg.on('pointerout', () => achBg.setFillStyle(0x161b22));
    achBg.on('pointerdown', () => {
      if (this.onAchievementsCallback) {
        this.onAchievementsCallback();
      }
    });

    // 3. Share Result
    const shareBg = this.scene.add
      .rectangle(cx + 225, btnRowY, btnW, btnH, 0x161b22)
      .setStrokeStyle(1.5, 0x30363d)
      .setInteractive({ useHandCursor: true });
    const shareTxt = this.scene.add
      .text(cx + 225, btnRowY, '📤 Share', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0.5);
    shareBg.on('pointerover', () => shareBg.setFillStyle(0x21262d));
    shareBg.on('pointerout', () => shareBg.setFillStyle(0x161b22));
    shareBg.on('pointerdown', async () => {
      shareTxt.setText('⏳ Generating...');
      const outcome = await ShareService.shareOrDownloadResult({
        run: {
          ...summary,
          survivalDurationSeconds: summary.survivalSeconds,
        },
        isNewRecord: summary.isNewHighScore,
        sessionHitCounts,
        locale: this.i18n.getLocale(),
      });
      shareTxt.setText('📤 Share');
      if (outcome.shared) {
        shareStatus.setText('✓ Result Shared Successfully!');
      } else if (outcome.downloaded) {
        shareStatus.setText('✓ Score Card Downloaded!');
      }
      setTimeout(() => shareStatus.setText(''), 4000);
    });

    this.container.add([exploreBg, exploreTxt, achBg, achTxt, shareBg, shareTxt]);

    this.container.setVisible(true);
  }

  private createVisitedIslandsMap(
    cx: number,
    cy: number,
    sessionHitCounts: Record<string, number>,
  ): Phaser.GameObjects.Container {
    const mapContainer = this.scene.add.container(0, 0);

    const mapW = 580;
    const mapH = 340;

    // Map frame
    const mapBg = this.scene.add
      .rectangle(cx, cy, mapW, mapH, 0x060c18, 0.95)
      .setStrokeStyle(1.5, 0x1f6feb)
      .setInteractive();
    mapContainer.add(mapBg);

    const header = this.scene.add
      .text(cx, cy - mapH / 2 + 16, 'VISITED ISLANDS THIS RUN (TAP TO INSPECT)', {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#79c0ff',
      })
      .setOrigin(0.5);
    mapContainer.add(header);

    const inspectionLabel = this.scene.add
      .text(cx, cy + mapH / 2 - 16, 'Tap any highlighted island to inspect hits', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8b949e',
      })
      .setOrigin(0.5);
    mapContainer.add(inspectionLabel);

    // Draw Vector Map
    const g = this.scene.add.graphics();
    mapContainer.add(g);

    const mapX0 = cx - mapW / 2;
    const mapY0 = cy - mapH / 2 + 25;
    const drawH = mapH - 50;

    const scaleX = mapW / ARENA_CONFIG.worldWidth;
    const scaleY = drawH / ARENA_CONFIG.worldHeight;

    const toMapX = (wx: number): number => mapX0 + wx * scaleX;
    const toMapY = (wy: number): number => mapY0 + wy * scaleY;

    const staticFeatures = getStaticFeatures();
    const crete = getCreteData();

    // Draw Mainlands
    for (const f of staticFeatures) {
      if (!f.classification.includes('mainland')) continue;
      g.fillStyle(0x0f172a, 1);
      g.lineStyle(1, 0x27384d, 1);

      for (const poly of f.geometry.polygons) {
        const ring = poly.outerRing;
        if (ring.length < 3) continue;
        g.beginPath();
        g.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
        for (let i = 1; i < ring.length; i++) {
          g.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }

    // Draw Islands
    for (const f of staticFeatures) {
      if (f.classification.includes('mainland')) continue;

      const hits = sessionHitCounts[f.id] ?? 0;
      const isVisited = hits > 0;

      if (isVisited) {
        g.fillStyle(0x3a2e12, 1);
        g.lineStyle(2, 0xf1e05a, 1);
      } else {
        g.fillStyle(0x0a1424, 1);
        g.lineStyle(0.8, 0x1e293b, 1);
      }

      for (const poly of f.geometry.polygons) {
        const ring = poly.outerRing;
        if (ring.length < 3) continue;
        g.beginPath();
        g.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
        for (let i = 1; i < ring.length; i++) {
          g.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
      }
    }

    // Draw Crete
    g.fillStyle(0x142844, 1);
    g.lineStyle(1.8, 0x38bdf8, 1);
    for (const poly of crete.geometry.polygons) {
      const ring = poly.outerRing;
      if (ring.length < 3) continue;
      g.beginPath();
      g.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
      for (let i = 1; i < ring.length; i++) {
        g.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
      }
      g.closePath();
      g.fillPath();
      g.strokePath();
    }

    // Interactive Tap on Visited Island Map
    mapBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Find closest island within mini-map coordinate space
      let closest: (typeof staticFeatures)[0] | null = null;
      let closestDist = 28; // pixels in mini-map space

      for (const f of staticFeatures) {
        if (f.classification.includes('mainland')) continue;
        const fx = toMapX(f.centroid.x);
        const fy = toMapY(f.centroid.y);
        const d = Math.hypot(pointer.x - fx, pointer.y - fy);
        if (d < closestDist) {
          closestDist = d;
          closest = f;
        }
      }

      if (closest) {
        const locale = this.i18n.getLocale();
        const name = closest.names[locale] || closest.names.en;
        const hits = sessionHitCounts[closest.id] ?? 0;
        if (hits > 0) {
          inspectionLabel.setText(`📍 ${name}: ${hits} hits (${hits * 100} pts this run)`);
          inspectionLabel.setColor('#f1e05a');
        } else {
          inspectionLabel.setText(`📍 ${name}: Unvisited this run`);
          inspectionLabel.setColor('#8b949e');
        }
      }
    });

    return mapContainer;
  }

  public hide(): void {
    this.container.setVisible(false);
  }

  public onPlayAgain(callback: () => void): void {
    this.onPlayAgainCallback = callback;
  }

  public onExplore(callback: () => void): void {
    this.onExploreCallback = callback;
  }

  public onAchievements(callback: () => void): void {
    this.onAchievementsCallback = callback;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
