import Phaser from 'phaser';
import { ARENA_CONFIG } from '../../config';

export class ResumeCountdown {
  private container: Phaser.GameObjects.Container;
  private countdownText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private spawnReticle: Phaser.GameObjects.Graphics;
  private onTapCallback?: () => void;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0).setDepth(450);
    this.container.setVisible(false);

    const cx = ARENA_CONFIG.worldWidth / 2;
    const cy = ARENA_CONFIG.worldHeight / 2 - 50;

    // Dim background (semi-transparent so Aegean geography and ball remain clearly visible)
    const bg = scene.add
      .rectangle(
        cx,
        ARENA_CONFIG.worldHeight / 2,
        ARENA_CONFIG.worldWidth,
        ARENA_CONFIG.worldHeight,
        0x050b14,
        0.55,
      )
      .setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.onTapCallback?.();
    });
    this.container.add(bg);

    this.spawnReticle = scene.add.graphics();
    this.container.add(this.spawnReticle);

    this.countdownText = scene.add
      .text(cx, cy, '3', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '140px',
        fontStyle: 'bold',
        color: '#58a6ff',
      })
      .setOrigin(0.5);

    this.subtitleText = scene.add
      .text(cx, cy + 110, 'RESUMING...', {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#8b949e',
        align: 'center',
      })
      .setOrigin(0.5);

    this.hintText = scene.add
      .text(cx, cy + 160, '(TAP SCREEN OR PRESS SPACE TO LAUNCH NOW)', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd166',
        align: 'center',
      })
      .setOrigin(0.5);

    this.container.add([this.countdownText, this.subtitleText, this.hintText]);
  }

  public show(
    secondsLeft: number,
    subtitle = 'RESUMING...',
    spawnPoint?: { x: number; y: number },
  ): void {
    this.countdownText.setText(secondsLeft > 0 ? `${secondsLeft}` : 'GO!');
    this.countdownText.setColor(secondsLeft > 0 ? '#58a6ff' : '#39d353');
    this.subtitleText.setText(subtitle);

    this.spawnReticle.clear();
    if (spawnPoint) {
      const sx = spawnPoint.x;
      const sy = spawnPoint.y;

      // Draw beacon rings around northern spawn point
      this.spawnReticle.lineStyle(3, 0x39d353, 0.9);
      this.spawnReticle.strokeCircle(sx, sy, 32);

      this.spawnReticle.lineStyle(1.5, 0x7ee787, 0.5);
      this.spawnReticle.strokeCircle(sx, sy, 48);

      // Downward direction arrows
      this.spawnReticle.fillStyle(0x39d353, 0.85);
      this.spawnReticle.fillTriangle(sx - 10, sy + 38, sx + 10, sy + 38, sx, sy + 54);
    }

    this.container.setVisible(true);
  }

  public onTap(callback: () => void): void {
    this.onTapCallback = callback;
  }

  public hide(): void {
    this.spawnReticle.clear();
    this.container.setVisible(false);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
