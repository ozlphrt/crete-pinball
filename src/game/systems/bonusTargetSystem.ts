import { Point2D, SupportedLocale } from '../../types';
import { getStaticFeatures } from '../../geography/aegeanData';
import { IslandFeature, LocalizedNames } from '../../geography/contracts';
import { SeededRandom } from '../physics/seededRandom';

export interface BonusTarget {
  readonly id: string;
  readonly islandId: string;
  readonly name: string;
  readonly center: Point2D;
  readonly bonusPoints: number;
}

export interface BonusTargetConfig {
  readonly bonusPoints: number;
  readonly initialSeed: number;
}

export const DEFAULT_TARGET_CONFIG: BonusTargetConfig = {
  bonusPoints: 500,
  initialSeed: 424242,
};

export class BonusTargetSystem {
  private readonly eligibleIslands: readonly IslandFeature[];
  private readonly featureNameMap = new Map<string, string>();
  private readonly featureNamesMap = new Map<string, LocalizedNames>();
  private readonly featureCenterMap = new Map<string, Point2D>();
  private rng: SeededRandom;
  private currentBonusTarget!: BonusTarget;
  private readonly config: BonusTargetConfig;

  constructor(config: Partial<BonusTargetConfig> = {}) {
    this.config = { ...DEFAULT_TARGET_CONFIG, ...config };
    this.rng = new SeededRandom(this.config.initialSeed);

    // Build eligible collidable islands pool (excluding mainlands, Crete, and unnamed islets)
    const allFeatures = getStaticFeatures();
    const eligible: IslandFeature[] = [];

    for (const f of allFeatures) {
      this.featureNameMap.set(f.id, f.names.en);
      this.featureNamesMap.set(f.id, f.names);
      this.featureCenterMap.set(f.id, f.centroid);

      // Only choose authentic named Aegean islands (e.g. Rhodes, Santorini, Mykonos, Naxos, etc.)
      if (
        !f.classification.includes('mainland') &&
        f.isCollidable &&
        f.id !== 'island-crete' &&
        f.id.startsWith('island-')
      ) {
        eligible.push(f);
      }
    }

    this.eligibleIslands = eligible;
    this.selectNextTarget();
  }

  public get currentTarget(): BonusTarget {
    return this.currentBonusTarget;
  }

  public getIslandName(id: string, locale?: SupportedLocale): string {
    const names = this.featureNamesMap.get(id);
    if (names && locale) {
      return names[locale] ?? names.en ?? id;
    }
    return this.featureNameMap.get(id) ?? id;
  }

  public getIslandCenter(id: string): Point2D | null {
    return this.featureCenterMap.get(id) ?? null;
  }

  /**
   * Checks whether the hit island matches the current bonus target.
   * If matched, returns bonus points and immediately rotates to next target.
   */
  public checkHit(featureId: string): number {
    if (this.currentBonusTarget && featureId === this.currentBonusTarget.id) {
      const awarded = this.currentBonusTarget.bonusPoints;
      this.selectNextTarget(this.currentBonusTarget.id);
      return awarded;
    }
    return 0;
  }

  /**
   * Selects a random eligible island as the new bonus target.
   */
  public selectNextTarget(excludeId?: string): BonusTarget {
    if (this.eligibleIslands.length === 0) {
      this.currentBonusTarget = {
        id: 'island-naxos',
        islandId: 'island-naxos',
        name: 'Naxos',
        center: { x: 450, y: 800 },
        bonusPoints: this.config.bonusPoints,
      };
      return this.currentBonusTarget;
    }

    // Pick candidate not equal to excludeId if possible
    let candidate: IslandFeature = this.eligibleIslands[0]!;
    for (let attempts = 0; attempts < 10; attempts++) {
      const idx = this.rng.nextInt(0, this.eligibleIslands.length - 1);
      const picked = this.eligibleIslands[idx];
      if (picked) {
        candidate = picked;
        if (!excludeId || candidate.id !== excludeId) {
          break;
        }
      }
    }

    const center = this.featureCenterMap.get(candidate.id) ?? candidate.centroid;

    this.currentBonusTarget = {
      id: candidate.id,
      islandId: candidate.id,
      name: candidate.names.en,
      center,
      bonusPoints: this.config.bonusPoints,
    };

    return this.currentBonusTarget;
  }

  /**
   * Resets target selection with an optional seed.
   */
  public reset(seed: number = this.config.initialSeed): void {
    this.rng = new SeededRandom(seed);
    this.selectNextTarget();
  }

  /**
   * Restores state from snapshot.
   */
  public restoreState(state: { targetId: string; bonusPoints: number }): void {
    const center = this.featureCenterMap.get(state.targetId) ?? { x: 450, y: 800 };
    const name = this.featureNameMap.get(state.targetId) ?? state.targetId;

    this.currentBonusTarget = {
      id: state.targetId,
      islandId: state.targetId,
      name,
      center,
      bonusPoints: state.bonusPoints,
    };
  }
}
