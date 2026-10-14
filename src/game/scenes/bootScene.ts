import Phaser from 'phaser';
import { LocalStorageAdapter } from '../../persistence/storageAdapter';
import { VISUAL_ASSETS } from '../../assets/visuals';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    const fillEl = document.getElementById('loading-progress-fill');
    const pctEl = document.getElementById('loading-percentage');
    const statusEl = document.getElementById('loading-status-text');

    this.load.on('progress', (value: number) => {
      const pct = Math.min(100, Math.round(value * 100));
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      if (statusEl) {
        if (file.key === 'aegean_background') {
          statusEl.textContent = 'Loading Mediterranean sea basin...';
        } else if (file.key === 'aegean_terrain') {
          statusEl.textContent = 'Loading Aegean DEM satellite terrain...';
        } else if (file.key === 'aegean_terrain_daylight') {
          statusEl.textContent = 'Loading daylight lighting model...';
        } else if (file.key === 'aegean_terrain_normal') {
          statusEl.textContent = 'Loading mountain elevation normals...';
        } else if (file.key === 'crete_paddle') {
          statusEl.textContent = 'Loading Crete paddle dynamics...';
        }
      }
    });

    this.load.on('complete', () => {
      if (fillEl) fillEl.style.width = '100%';
      if (pctEl) pctEl.textContent = '100%';
      if (statusEl) statusEl.textContent = 'Aegean Sea Ready!';

      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        window.setTimeout(() => {
          overlay.classList.add('fade-out');
          window.setTimeout(() => {
            overlay.remove();
          }, 450);
        }, 220);
      }
    });

    this.load.image('aegean_background', VISUAL_ASSETS.aegean_background);
    this.load.image('aegean_terrain', VISUAL_ASSETS.aegean_terrain);
    this.load.image('aegean_terrain_daylight', VISUAL_ASSETS.aegean_terrain_daylight);
    this.load.image('aegean_terrain_normal', VISUAL_ASSETS.aegean_terrain_normal);
    this.load.image('crete_paddle', VISUAL_ASSETS.crete_paddle);
  }

  public create(): void {
    const storageAdapter = new LocalStorageAdapter();
    const active = storageAdapter.getActiveSessionSync();
    const canResume = !!(active && active.snapshot && active.snapshot.lives.currentLives > 0);

    this.scene.start('GamePlaceholderScene', {
      storageAdapter,
      difficulty: canResume && active ? active.snapshot.difficulty : 'normal',
      restoreSession: canResume,
    });
  }
}
