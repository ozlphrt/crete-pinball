import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AchievementRegistry } from '../../src/progress/AchievementRegistry';
import { AchievementEvaluator } from '../../src/progress/AchievementEvaluator';
import { IslandProgressService } from '../../src/progress/IslandProgressService';
import { GameDatabase } from '../../src/persistence/GameDatabase';
import { GameEventBus } from '../../src/game/events/gameEventBus';
import { I18nManager } from '../../src/i18n';

describe('AchievementRegistry & AchievementEvaluator', () => {
  let db: GameDatabase;
  let eventBus: GameEventBus;
  let progressService: IslandProgressService;
  let i18n: I18nManager;
  let evaluator: AchievementEvaluator;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();

    eventBus = new GameEventBus();
    progressService = new IslandProgressService(db);
    i18n = new I18nManager('en');

    evaluator = new AchievementEvaluator(db, eventBus, progressService, i18n);
    await evaluator.init();
  });

  afterEach(() => {
    evaluator.destroy();
  });

  it('registers exactly 20 immutable achievements with valid metadata', () => {
    const achs = AchievementRegistry.getAll();
    expect(achs.length).toBe(20);

    const ids = new Set<string>();
    for (const ach of achs) {
      expect(ach.id).toBeTruthy();
      expect(ids.has(ach.id)).toBe(false);
      ids.add(ach.id);

      expect(ach.icon).toBeTruthy();
      expect(ach.titleKey).toContain('achievements.');
      expect(ach.descKey).toContain('achievements.');
      expect(['exploration', 'skill', 'abilities', 'survival']).toContain(ach.category);
    }
  });

  it('unlocks first_contact on first island hit and emits eventBus notification', async () => {
    let unlockedEventPayload: {
      achievementId: string;
      title: string;
      description: string;
      icon: string;
    } | null = null;
    eventBus.on('achievementUnlocked', (payload) => {
      unlockedEventPayload = payload;
    });

    expect(evaluator.isUnlocked('first_contact')).toBe(false);

    eventBus.emit('islandHit', {
      islandId: 'island-santorini',
      islandName: 'Santorini',
      points: 200,
      combo: 1,
      impactSpeed: 500,
      isSpecial: true,
      isTarget: false,
      impactPoint: { x: 100, y: 100 },
    });

    // Wait a tick for async unlock/db save
    await new Promise((r) => setTimeout(r, 10));

    expect(evaluator.isUnlocked('first_contact')).toBe(true);
    expect(unlockedEventPayload).not.toBeNull();
    expect(unlockedEventPayload!.achievementId).toBe('first_contact');
    expect(unlockedEventPayload!.title).toBeTruthy();
    expect(unlockedEventPayload!.icon).toBe('🌊');
  });

  it('guarantees unlocks are idempotent without duplicate toasts', async () => {
    let unlockEventsCount = 0;
    eventBus.on('achievementUnlocked', (payload) => {
      if (payload.achievementId === 'first_contact') {
        unlockEventsCount++;
      }
    });

    // Fire first hit
    eventBus.emit('islandHit', {
      islandId: 'island-santorini',
      islandName: 'Santorini',
      points: 200,
      combo: 1,
      impactSpeed: 500,
      isSpecial: true,
      isTarget: false,
      impactPoint: { x: 100, y: 100 },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(unlockEventsCount).toBe(1);

    // Fire second hit
    eventBus.emit('islandHit', {
      islandId: 'island-naxos',
      islandName: 'Naxos',
      points: 200,
      combo: 1,
      impactSpeed: 500,
      isSpecial: false,
      isTarget: false,
      impactPoint: { x: 200, y: 200 },
    });
    await new Promise((r) => setTimeout(r, 10));
    // Must remain 1
    expect(unlockEventsCount).toBe(1);
  });

  it('unlocks combo milestones sequentially as combo increases', async () => {
    eventBus.emit('comboIncreased', { combo: 2, points: 50 });
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('combo_starter')).toBe(true);
    expect(evaluator.isUnlocked('combo_apprentice')).toBe(false);

    eventBus.emit('comboIncreased', { combo: 3, points: 100 });
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('combo_apprentice')).toBe(true);
    expect(evaluator.isUnlocked('combo_master')).toBe(false);

    eventBus.emit('comboIncreased', { combo: 5, points: 250 });
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('combo_master')).toBe(true);
  });

  it('unlocks score and survival time milestones correctly', async () => {
    evaluator.updateSurvivalTime(65);
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('mariner_60')).toBe(true);
    expect(evaluator.isUnlocked('endurance_180')).toBe(false);

    evaluator.updateSurvivalTime(185);
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('endurance_180')).toBe(true);

    evaluator.updateScore(5500);
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('score_5k')).toBe(true);
    expect(evaluator.isUnlocked('score_15k')).toBe(false);

    evaluator.updateScore(16000);
    await new Promise((r) => setTimeout(r, 10));
    expect(evaluator.isUnlocked('score_15k')).toBe(true);
  });
});
