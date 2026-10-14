import { getStaticFeatures } from '../geography/aegeanData';
import { GameEventBus } from '../game/events/gameEventBus';
import { GameDatabase } from '../persistence/GameDatabase';
import { AchievementRegistry } from './AchievementRegistry';
import { IslandProgressService } from './IslandProgressService';
import { I18nManager, type TranslationKey } from '../i18n';

export class AchievementEvaluator {
  private static instance: AchievementEvaluator | null = null;

  private readonly db: GameDatabase;
  private readonly eventBus: GameEventBus;
  private readonly progressService: IslandProgressService;
  private readonly i18n: I18nManager;

  private unlockedCache: Set<string> = new Set();
  private unregisterFns: (() => void)[] = [];

  // Session trackers
  private sessionCycladesHit: Set<string> = new Set();
  private sessionDodecaneseHit: Set<string> = new Set();
  private sessionWeatherActive = false;
  private sessionBallLostDuringWeather = false;
  private sessionMaxCombo = 1;

  public static getInstance(
    db?: GameDatabase,
    eventBus?: GameEventBus,
    progressService?: IslandProgressService,
    i18n?: I18nManager,
  ): AchievementEvaluator {
    if (!AchievementEvaluator.instance) {
      AchievementEvaluator.instance = new AchievementEvaluator(db, eventBus, progressService, i18n);
    }
    return AchievementEvaluator.instance;
  }

  constructor(
    db?: GameDatabase,
    eventBus?: GameEventBus,
    progressService?: IslandProgressService,
    i18n?: I18nManager,
  ) {
    this.db = db ?? GameDatabase.getInstance();
    this.eventBus = eventBus ?? GameEventBus.getInstance();
    this.progressService = progressService ?? IslandProgressService.getInstance(this.db);
    this.i18n = i18n ?? new I18nManager('en');

    this.init();
  }

  public async init(): Promise<void> {
    await this.db.init();
    const achs = await this.db.getAchievements();
    this.unlockedCache = new Set(Object.keys(achs.unlocked));
    this.attachEventListeners();
  }

  public resetSession(): void {
    this.sessionCycladesHit.clear();
    this.sessionDodecaneseHit.clear();
    this.sessionWeatherActive = false;
    this.sessionBallLostDuringWeather = false;
    this.sessionMaxCombo = 1;
  }

  public isUnlocked(achievementId: string): boolean {
    return this.unlockedCache.has(achievementId);
  }

  public getUnlockedIds(): ReadonlySet<string> {
    return this.unlockedCache;
  }

  public getUnlockedCount(): number {
    return this.unlockedCache.size;
  }

  public getTotalCount(): number {
    return AchievementRegistry.getAll().length;
  }

  public updateSurvivalTime(seconds: number): void {
    if (seconds >= 60) {
      this.tryUnlock('mariner_60');
    }
    if (seconds >= 180) {
      this.tryUnlock('endurance_180');
    }
  }

  public updateScore(score: number): void {
    if (score >= 5000) {
      this.tryUnlock('score_5k');
    }
    if (score >= 15000) {
      this.tryUnlock('score_15k');
    }
    if (score >= 30000) {
      this.tryUnlock('score_30k');
    }
  }

  private attachEventListeners(): void {
    // Unregister existing if any
    for (const unreg of this.unregisterFns) {
      unreg();
    }
    this.unregisterFns = [];

    // 1. Island Hit
    const unregIslandHit = this.eventBus.on('islandHit', (evt) => {
      this.tryUnlock('first_contact');

      // Lifetime discovery milestones
      const discoveredCount = this.progressService.getDiscoveredCount();
      if (discoveredCount >= 25) {
        this.tryUnlock('island_cartographer');
      }
      if (discoveredCount >= 50) {
        this.tryUnlock('island_master');
      }

      // Check group associations
      const feature = getStaticFeatures().find((f) => f.id === evt.islandId);
      if (feature) {
        if (feature.group === 'cyclades') {
          this.sessionCycladesHit.add(evt.islandId);
          if (this.sessionCycladesHit.size >= 5) {
            this.tryUnlock('cyclades_explorer');
          }
        } else if (feature.group === 'dodecanese') {
          if (evt.islandId === 'island-rhodes' || evt.islandId === 'island-kos') {
            this.sessionDodecaneseHit.add(evt.islandId);
            if (this.sessionDodecaneseHit.size >= 2) {
              this.tryUnlock('dodecanese_voyager');
            }
          }
        } else if (feature.group === 'north_aegean') {
          if (
            evt.islandId === 'island-thasos' ||
            evt.islandId === 'island-samothrace' ||
            evt.islandId === 'island-lemnos'
          ) {
            this.tryUnlock('north_outpost');
          }
        }
      }
    });
    this.unregisterFns.push(unregIslandHit);

    // 2. Combo
    const unregCombo = this.eventBus.on('comboIncreased', (evt) => {
      if (evt.combo > this.sessionMaxCombo) {
        this.sessionMaxCombo = evt.combo;
      }
      if (evt.combo >= 2) {
        this.tryUnlock('combo_starter');
      }
      if (evt.combo >= 3) {
        this.tryUnlock('combo_apprentice');
      }
      if (evt.combo >= 5) {
        this.tryUnlock('combo_master');
      }
    });
    this.unregisterFns.push(unregCombo);

    // 3. Special Islands
    const unregSpecial = this.eventBus.on('specialIslandActivated', (evt) => {
      if (evt.islandId === 'island-santorini') {
        this.tryUnlock('santorini_eruption');
      } else if (evt.islandId === 'island-rhodes') {
        this.tryUnlock('rhodes_colossus');
      } else if (evt.islandId === 'island-mykonos') {
        this.tryUnlock('mykonos_tempest');
      }
    });
    this.unregisterFns.push(unregSpecial);

    // 4. Multiball
    const unregMulti = this.eventBus.on('multiballStarted', () => {
      this.tryUnlock('multiball_storm');
    });
    this.unregisterFns.push(unregMulti);

    // 5. Power Bounce
    const unregPower = this.eventBus.on('powerBounceFired', () => {
      this.tryUnlock('power_rebound');
    });
    this.unregisterFns.push(unregPower);

    // 6. Weather & Survival
    const unregWeather = this.eventBus.on('weatherChanged', (evt) => {
      if (evt.type === 'meltemi' && evt.intensity > 0) {
        this.sessionWeatherActive = true;
        this.sessionBallLostDuringWeather = false;
      } else if (evt.type === 'none' || evt.type === 'calm') {
        if (this.sessionWeatherActive && !this.sessionBallLostDuringWeather) {
          this.tryUnlock('weather_survivor');
        }
        this.sessionWeatherActive = false;
      }
    });
    this.unregisterFns.push(unregWeather);

    // 7. Ball Lost
    const unregBall = this.eventBus.on('ballLost', () => {
      if (this.sessionWeatherActive) {
        this.sessionBallLostDuringWeather = true;
      }
    });
    this.unregisterFns.push(unregBall);

    // 8. Game Over
    const unregGameOver = this.eventBus.on('gameOver', (evt) => {
      this.updateScore(evt.finalScore);
      this.updateSurvivalTime(evt.survivalSeconds);
    });
    this.unregisterFns.push(unregGameOver);
  }

  public async tryUnlock(achievementId: string): Promise<boolean> {
    if (this.unlockedCache.has(achievementId)) {
      return false;
    }

    const def = AchievementRegistry.get(achievementId);
    if (!def) {
      return false;
    }

    this.unlockedCache.add(achievementId);

    // Persist to storage
    const achs = await this.db.getAchievements();
    const updated = {
      unlocked: {
        ...achs.unlocked,
        [achievementId]: {
          achievementId,
          unlockedAtIso: new Date().toISOString(),
        },
      },
    };
    await this.db.saveAchievements(updated);

    // Fire event for UI toast
    const title = this.i18n.t(def.titleKey as TranslationKey) || def.id;
    const description = this.i18n.t(def.descKey as TranslationKey) || '';

    this.eventBus.emit('achievementUnlocked', {
      achievementId,
      title,
      description,
      icon: def.icon,
    });

    return true;
  }

  public destroy(): void {
    for (const unreg of this.unregisterFns) {
      unreg();
    }
    this.unregisterFns = [];
  }
}
