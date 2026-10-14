import Phaser from 'phaser';
import { ARENA_CONFIG } from '../config';
import { BootScene } from '../game/scenes/bootScene';
import { GamePlaceholderScene } from '../game/scenes/gamePlaceholderScene';
import { ExploreScene } from '../game/scenes/exploreScene';
import { OrientationHandler } from '../ui/orientationHandler';
import { I18nManager } from '../i18n';
import { LocalStorageAdapter } from '../persistence/storageAdapter';

export class GameApp {
  private game: Phaser.Game | null = null;
  private orientationHandler: OrientationHandler | null = null;
  private readonly i18n: I18nManager;
  private readonly storage: LocalStorageAdapter;

  constructor() {
    this.i18n = new I18nManager('en');
    this.storage = new LocalStorageAdapter();
  }

  public async start(containerId = 'game-container'): Promise<Phaser.Game> {
    await this.storage.init();
    const prefs = await this.storage.getPreferences();
    this.i18n.setLocale(prefs.locale);

    this.orientationHandler = new OrientationHandler(this.i18n);

    const screenWidth = typeof window !== 'undefined' ? (window.innerWidth || 390) : 390;
    const screenHeight = typeof window !== 'undefined' ? (window.innerHeight || 844) : 844;
    const aspect = screenHeight / screenWidth;
    // On portrait screens taller than 9:16 (1.7778), dynamically extend the world height
    // so the Aegean sea map extends seamlessly to the very bottom under the target banner.
    const arenaHeight = Math.max(
      ARENA_CONFIG.worldHeight,
      Math.round(ARENA_CONFIG.worldWidth * aspect),
    );

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerId,
      width: ARENA_CONFIG.worldWidth,
      height: arenaHeight,
      backgroundColor: '#061328',
      transparent: true,
      render: {
        antialias: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
        width: ARENA_CONFIG.worldWidth,
        height: arenaHeight,
      },
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: 0.2 },
          debug: false,
        },
      },
      scene: [BootScene, GamePlaceholderScene, ExploreScene],
      input: {
        activePointers: 2,
        touch: {
          capture: true,
        },
        keyboard: {
          target: window,
        },
      },
      audio: {
        noAudio: true,
      },
    };

    this.game = new Phaser.Game(config);
    if (typeof window !== 'undefined') {
      (window as unknown as { game?: Phaser.Game }).game = this.game;
    }
    this.attachLifecycleListeners();

    return this.game;
  }

  private attachLifecycleListeners(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Automatically pause when tab is backgrounded
        this.game?.events.emit('app_backgrounded');
      } else {
        this.game?.events.emit('app_foregrounded');
      }
    });

    window.addEventListener('resize', () => {
      if (!this.game) return;
      const w = window.innerWidth || 390;
      const h = window.innerHeight || 844;
      const curAspect = h / w;
      const newArenaH = Math.max(
        ARENA_CONFIG.worldHeight,
        Math.round(ARENA_CONFIG.worldWidth * curAspect),
      );
      this.game.scale.resize(ARENA_CONFIG.worldWidth, newArenaH);
    });
  }

  public destroy(): void {
    this.orientationHandler?.destroy();
    this.game?.destroy(true);
    this.game = null;
  }
}
