import Phaser from 'phaser';
import { LocalStorageAdapter } from '../../persistence/storageAdapter';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this.load.image('aegean_background', '/assets/visuals/aegean_background.png');
    this.load.image('aegean_terrain', '/assets/visuals/aegean_terrain.png');
    this.load.image('aegean_terrain_daylight', '/assets/visuals/aegean_terrain_daylight.png');
    this.load.image('aegean_terrain_normal', '/assets/visuals/aegean_terrain_normal.png');
    this.load.image('crete_paddle', '/assets/visuals/crete_paddle.png');
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
