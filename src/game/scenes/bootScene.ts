import Phaser from 'phaser';
import { LocalStorageAdapter } from '../../persistence/storageAdapter';
import { VISUAL_ASSETS } from '../../assets/visuals';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
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
