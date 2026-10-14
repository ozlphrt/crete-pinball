export type AchievementCategory = 'exploration' | 'skill' | 'abilities' | 'survival';

export interface AchievementDefinition {
  readonly id: string;
  readonly icon: string;
  readonly titleKey: string;
  readonly descKey: string;
  readonly category: AchievementCategory;
  readonly maxProgress?: number;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_contact',
    icon: '🌊',
    titleKey: 'achievements.firstContact.title',
    descKey: 'achievements.firstContact.desc',
    category: 'exploration',
  },
  {
    id: 'combo_starter',
    icon: '⛵',
    titleKey: 'achievements.comboStarter.title',
    descKey: 'achievements.comboStarter.desc',
    category: 'skill',
  },
  {
    id: 'combo_apprentice',
    icon: '🌀',
    titleKey: 'achievements.comboApprentice.title',
    descKey: 'achievements.comboApprentice.desc',
    category: 'skill',
  },
  {
    id: 'combo_master',
    icon: '⚡',
    titleKey: 'achievements.comboMaster.title',
    descKey: 'achievements.comboMaster.desc',
    category: 'skill',
  },
  {
    id: 'mariner_60',
    icon: '⏱️',
    titleKey: 'achievements.mariner60.title',
    descKey: 'achievements.mariner60.desc',
    category: 'survival',
  },
  {
    id: 'endurance_180',
    icon: '🧭',
    titleKey: 'achievements.endurance180.title',
    descKey: 'achievements.endurance180.desc',
    category: 'survival',
  },
  {
    id: 'score_5k',
    icon: '🪙',
    titleKey: 'achievements.score5k.title',
    descKey: 'achievements.score5k.desc',
    category: 'skill',
  },
  {
    id: 'score_15k',
    icon: '💰',
    titleKey: 'achievements.score15k.title',
    descKey: 'achievements.score15k.desc',
    category: 'skill',
  },
  {
    id: 'score_30k',
    icon: '👑',
    titleKey: 'achievements.score30k.title',
    descKey: 'achievements.score30k.desc',
    category: 'skill',
  },
  {
    id: 'cyclades_explorer',
    icon: '🏝️',
    titleKey: 'achievements.cycladesExplorer.title',
    descKey: 'achievements.cycladesExplorer.desc',
    category: 'exploration',
    maxProgress: 5,
  },
  {
    id: 'dodecanese_voyager',
    icon: '🏛️',
    titleKey: 'achievements.dodecaneseVoyager.title',
    descKey: 'achievements.dodecaneseVoyager.desc',
    category: 'exploration',
    maxProgress: 2,
  },
  {
    id: 'north_outpost',
    icon: '⚓',
    titleKey: 'achievements.northOutpost.title',
    descKey: 'achievements.northOutpost.desc',
    category: 'exploration',
  },
  {
    id: 'santorini_eruption',
    icon: '🌋',
    titleKey: 'achievements.santoriniEruption.title',
    descKey: 'achievements.santoriniEruption.desc',
    category: 'abilities',
  },
  {
    id: 'rhodes_colossus',
    icon: '🛡️',
    titleKey: 'achievements.rhodesColossus.title',
    descKey: 'achievements.rhodesColossus.desc',
    category: 'abilities',
  },
  {
    id: 'mykonos_tempest',
    icon: '💨',
    titleKey: 'achievements.mykonosTempest.title',
    descKey: 'achievements.mykonosTempest.desc',
    category: 'abilities',
  },
  {
    id: 'multiball_storm',
    icon: '🎱',
    titleKey: 'achievements.multiballStorm.title',
    descKey: 'achievements.multiballStorm.desc',
    category: 'abilities',
  },
  {
    id: 'power_rebound',
    icon: '⚡',
    titleKey: 'achievements.powerRebound.title',
    descKey: 'achievements.powerRebound.desc',
    category: 'skill',
  },
  {
    id: 'island_cartographer',
    icon: '📜',
    titleKey: 'achievements.islandCartographer.title',
    descKey: 'achievements.islandCartographer.desc',
    category: 'exploration',
    maxProgress: 25,
  },
  {
    id: 'island_master',
    icon: '🗺️',
    titleKey: 'achievements.islandMaster.title',
    descKey: 'achievements.islandMaster.desc',
    category: 'exploration',
    maxProgress: 50,
  },
  {
    id: 'weather_survivor',
    icon: '🌬️',
    titleKey: 'achievements.weatherSurvivor.title',
    descKey: 'achievements.weatherSurvivor.desc',
    category: 'survival',
  },
] as const;

export class AchievementRegistry {
  private static readonly map = new Map<string, AchievementDefinition>(
    ACHIEVEMENTS.map((a) => [a.id, a]),
  );

  public static getAll(): readonly AchievementDefinition[] {
    return ACHIEVEMENTS;
  }

  public static get(id: string): AchievementDefinition | undefined {
    return AchievementRegistry.map.get(id);
  }

  public static exists(id: string): boolean {
    return AchievementRegistry.map.has(id);
  }
}
