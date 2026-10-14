import { ARENA_CONFIG } from '../config';
import { getCreteData, getStaticFeatures } from '../geography/aegeanData';
import { I18nManager } from '../i18n';
import { SessionRunData } from '../progress/HighScoreService';

export interface ResultCardOptions {
  readonly run: SessionRunData;
  readonly isNewRecord: boolean;
  readonly sessionHitCounts: Record<string, number>;
  readonly locale?: 'en' | 'tr' | 'el';
}

export class ResultsCardRenderer {
  public static readonly CARD_WIDTH = 540;
  public static readonly CARD_HEIGHT = 960;

  /**
   * Generates a canvas and renders the styled share card.
   */
  public static async renderCard(options: ResultCardOptions): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = ResultsCardRenderer.CARD_WIDTH;
    canvas.height = ResultsCardRenderer.CARD_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }

    const { run, isNewRecord, sessionHitCounts, locale = 'en' } = options;
    const i18n = new I18nManager(locale);

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#040812');
    bgGrad.addColorStop(0.5, '#07101e');
    bgGrad.addColorStop(1, '#050b14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative subtle border
    ctx.strokeStyle = '#1f6feb';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

    // 2. Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('CRETE PINBALL', canvas.width / 2, 60);

    ctx.fillStyle = '#8b949e';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('AEGEAN ARCHIPELAGO', canvas.width / 2, 85);

    // 3. Mini Aegean Map highlighting visited islands
    ResultsCardRenderer.drawMiniMap(ctx, sessionHitCounts);

    // 4. Session Stats Section
    const statsTop = 560;

    if (isNewRecord) {
      ctx.fillStyle = '#f1e05a';
      ctx.font = 'bold 15px monospace';
      ctx.fillText('★ NEW PERSONAL RECORD! ★', canvas.width / 2, statsTop);
    }

    // Final Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.fillText(run.finalScore.toLocaleString(), canvas.width / 2, statsTop + 55);

    ctx.fillStyle = '#8b949e';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(i18n.t('hud.score') || 'FINAL SCORE', canvas.width / 2, statsTop + 78);

    // Difficulty Badge
    const diffText = run.difficulty.toUpperCase();
    ctx.font = 'bold 13px monospace';
    const textWidth = ctx.measureText(diffText).width;
    const badgeW = textWidth + 24;
    const badgeH = 26;
    const badgeX = canvas.width / 2 - badgeW / 2;
    const badgeY = statsTop + 96;

    ctx.fillStyle = 'rgba(31, 111, 235, 0.25)';
    ctx.strokeStyle = '#388bfd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#79c0ff';
    ctx.fillText(diffText, canvas.width / 2, badgeY + 18);

    // Stats Grid
    const statBoxY = statsTop + 140;
    const boxW = canvas.width - 80;
    const boxX = 40;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, statBoxY, boxW, 140, 8);
    ctx.fill();
    ctx.stroke();

    const statRows = [
      [i18n.t('results.survivalTime') || 'SURVIVAL TIME', run.formattedDuration],
      [
        i18n.t('results.islandHits') || 'ISLAND HITS',
        `${run.totalIslandHits} (${run.distinctIslandsCount} ${i18n.t('results.distinct') || 'distinct'})`,
      ],
      [i18n.t('results.maxCombo') || 'MAX COMBO', `×${run.highestCombo}`],
    ];

    statRows.forEach(([lbl, val], idx) => {
      const y = statBoxY + 34 + idx * 40;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8b949e';
      ctx.font = '14px monospace';
      ctx.fillText(lbl ?? '', boxX + 20, y);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(val ?? '', boxX + boxW - 20, y);
    });

    // 5. Footer Branding
    ctx.textAlign = 'center';
    ctx.fillStyle = '#484f58';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Mobile-First Offline PWA • Authentic Aegean Geography', canvas.width / 2, 915);

    return canvas;
  }

  private static drawMiniMap(
    ctx: CanvasRenderingContext2D,
    sessionHitCounts: Record<string, number>,
  ): void {
    // Map bounding box within card
    const mapBox = {
      x: 35,
      y: 105,
      w: 470,
      h: 430,
    };

    // Dark water frame
    ctx.fillStyle = '#060c18';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mapBox.x, mapBox.y, mapBox.w, mapBox.h, 8);
    ctx.fill();
    ctx.stroke();

    // Coordinate scale factors from world to mini map
    const scaleX = mapBox.w / ARENA_CONFIG.worldWidth;
    const scaleY = mapBox.h / ARENA_CONFIG.worldHeight;

    const toMapX = (wx: number): number => mapBox.x + wx * scaleX;
    const toMapY = (wy: number): number => mapBox.y + wy * scaleY;

    const staticFeatures = getStaticFeatures();
    const crete = getCreteData();

    // 1. Draw Mainlands
    for (const f of staticFeatures) {
      if (!f.classification.includes('mainland')) continue;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      for (const poly of f.geometry.polygons) {
        const ring = poly.outerRing;
        if (ring.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
        for (let i = 1; i < ring.length; i++) {
          ctx.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 2. Draw Islands
    for (const f of staticFeatures) {
      if (f.classification.includes('mainland')) continue;

      const hitCount = sessionHitCounts[f.id] ?? 0;
      const isHit = hitCount > 0;

      if (isHit) {
        // Highlighted Visited Island: Golden glow!
        ctx.fillStyle = '#3a2e12';
        ctx.strokeStyle = '#f1e05a';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(241, 224, 90, 0.7)';
        ctx.shadowBlur = 8;
      } else {
        // Unvisited Island
        ctx.fillStyle = '#101c2e';
        ctx.strokeStyle = '#27384d';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      for (const poly of f.geometry.polygons) {
        const ring = poly.outerRing;
        if (ring.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
        for (let i = 1; i < ring.length; i++) {
          ctx.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 3. Draw Crete baseline silhouette
    ctx.fillStyle = '#1e3a5f';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;

    for (const poly of crete.geometry.polygons) {
      const ring = poly.outerRing;
      if (ring.length < 3) continue;

      ctx.beginPath();
      ctx.moveTo(toMapX(ring[0]!.x), toMapY(ring[0]!.y));
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(toMapX(ring[i]!.x), toMapY(ring[i]!.y));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  /**
   * Renders card directly to PNG Blob.
   */
  public static async renderToBlob(options: ResultCardOptions): Promise<Blob> {
    const canvas = await ResultsCardRenderer.renderCard(options);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate PNG blob from canvas'));
      }, 'image/png');
    });
  }
}
