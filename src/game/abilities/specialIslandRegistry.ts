import { SpecialAbilityType } from '../events/gameEventBus';

export interface SpecialIslandConfig {
  readonly islandId: string;
  readonly name: string;
  readonly ability: SpecialAbilityType;
  readonly cooldownMs: number;
  readonly durationMs: number;
  readonly parameter: number;
  readonly enabled: boolean;
}

export const DEFAULT_SPECIAL_ISLAND_CONFIGS: readonly SpecialIslandConfig[] = [
  {
    islandId: 'island-santorini',
    name: 'Santorini',
    ability: 'explosive_bumper',
    cooldownMs: 12000,
    durationMs: 0, // instantaneous impulse
    parameter: 1.35, // 1.35x outgoing velocity multiplier
    enabled: false,
  },
  {
    islandId: 'island-rhodes',
    name: 'Rhodes',
    ability: 'speed_boost',
    cooldownMs: 12000,
    durationMs: 5000, // 5s speed boost duration
    parameter: 250, // +250 u/s boost
    enabled: false,
  },
  {
    islandId: 'island-mykonos',
    name: 'Mykonos',
    ability: 'score_multiplier',
    cooldownMs: 12000,
    durationMs: 6000, // 6s score multiplier duration
    parameter: 2, // 2x score multiplier (preserves x5 combo cap)
    enabled: false,
  },
  {
    islandId: 'island-lesbos',
    name: 'Lesbos',
    ability: 'bonus_points',
    cooldownMs: 12000,
    durationMs: 0, // instantaneous bonus
    parameter: 1000, // +1000 points immediate award
    enabled: false,
  },
];

export class SpecialIslandRegistry {
  private configs: Map<string, SpecialIslandConfig> = new Map();

  constructor(customConfigs: readonly SpecialIslandConfig[] = DEFAULT_SPECIAL_ISLAND_CONFIGS) {
    this.resetToDefaults(customConfigs);
  }

  public resetToDefaults(
    defaults: readonly SpecialIslandConfig[] = DEFAULT_SPECIAL_ISLAND_CONFIGS,
  ): void {
    this.configs.clear();
    for (const cfg of defaults) {
      this.configs.set(cfg.islandId, { ...cfg });
    }
  }

  public get(islandId: string): SpecialIslandConfig | undefined {
    return this.configs.get(islandId);
  }

  public getAll(): SpecialIslandConfig[] {
    return Array.from(this.configs.values());
  }

  public isSpecialIsland(islandId: string): boolean {
    const cfg = this.configs.get(islandId);
    return !!cfg && cfg.enabled;
  }

  public updateConfig(islandId: string, updates: Partial<SpecialIslandConfig>): void {
    const existing = this.configs.get(islandId);
    if (!existing) return;
    this.configs.set(islandId, {
      ...existing,
      ...updates,
      islandId: existing.islandId, // Island ID is immutable
    });
  }
}
