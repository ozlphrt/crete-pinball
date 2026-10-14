import { PhysicsContactEvent } from '../physics/physicsWorld';
import { ComboSystem } from './comboSystem';
import { BonusTargetSystem } from './bonusTargetSystem';
import { LivesSystem } from './livesSystem';

export interface QualifiedScoreEvent {
  readonly featureId: string;
  readonly islandName: string;
  readonly basePoints: number;
  readonly multiplier: number;
  readonly comboPoints: number;
  readonly targetBonus: number;
  readonly specialBonus?: number;
  readonly specialAbilityName?: string;
  readonly totalPointsAwarded: number;
  readonly newTotalScore: number;
  readonly isRepeatHit: boolean;
  readonly isTargetHit: boolean;
  readonly extraLifeGranted: boolean;
}

export interface ScoringSystemConfig {
  readonly baseIslandPoints: number;
  readonly hitCooldownTicks: number; // minimum fixed ticks between scored hits on same feature
}

export const DEFAULT_SCORING_CONFIG: ScoringSystemConfig = {
  baseIslandPoints: 100,
  hitCooldownTicks: 15, // ~125ms at 120 Hz to prevent contact farming
};

export class ScoringSystem {
  private totalScore = 0;
  private totalIslandHits = 0;
  private targetHitsCount = 0;
  private readonly distinctIslandsHit = new Set<string>();
  private readonly lastHitTickByFeature = new Map<string, number>();
  private readonly config: ScoringSystemConfig;

  constructor(
    private readonly comboSystem: ComboSystem,
    private readonly targetSystem: BonusTargetSystem,
    private readonly livesSystem: LivesSystem,
    config: Partial<ScoringSystemConfig> = {},
  ) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  public get score(): number {
    return this.totalScore;
  }

  public get islandHits(): number {
    return this.totalIslandHits;
  }

  public get distinctIslandsCount(): number {
    return this.distinctIslandsHit.size;
  }

  public get distinctIslands(): ReadonlySet<string> {
    return this.distinctIslandsHit;
  }

  /**
   * Processes a raw physics contact event.
   * Filters out non-scoring contacts (mainlands, Crete, walls), applies contact deduplication,
   * evaluates combo multiplier, and grants points atomically.
   */
  public processContact(
    event: PhysicsContactEvent,
    currentTick: number,
    scoreMultiplierModifier = 1,
    specialBonus = 0,
    specialAbilityName?: string,
  ): QualifiedScoreEvent | null {
    const fid = event.featureId;

    // 1. Boundary walls award zero points and preserve combo
    if (event.isBoundaryHit) {
      this.comboSystem.preserveCombo();
      return null;
    }

    // 2. Crete paddle rebounds award zero points and preserve combo
    if (fid === 'island-crete' || fid.startsWith('crete')) {
      this.comboSystem.preserveCombo();
      return null;
    }

    // 3. Greek and Turkish mainlands award zero points and preserve combo
    if (fid.includes('mainland') || fid.startsWith('greece-') || fid.startsWith('turkey-')) {
      this.comboSystem.preserveCombo();
      return null;
    }

    // 4. Contact deduplication / debounce on the same island
    const lastTick = this.lastHitTickByFeature.get(fid);
    if (lastTick !== undefined && currentTick - lastTick < this.config.hitCooldownTicks) {
      // Jitter or persistent contact: suppress duplicate scoring
      return null;
    }
    this.lastHitTickByFeature.set(fid, currentTick);

    // 5. Evaluate combo progression
    const comboRes = this.comboSystem.recordIslandHit(fid);

    // 6. Calculate points
    // Base hit: 100 * pointsMultiplier * activeScoreMultiplier (e.g. Mykonos boost)
    const basePts = this.config.baseIslandPoints;
    const effectiveMult = Math.max(1, scoreMultiplierModifier);
    const comboPts = basePts * comboRes.pointsMultiplier * effectiveMult;

    // 7. Check bonus target hit
    const targetBonus = this.targetSystem.checkHit(fid);
    const isTargetHit = targetBonus > 0;

    const totalAwarded = comboPts + targetBonus + specialBonus;
    this.totalScore += totalAwarded;
    this.totalIslandHits++;
    this.distinctIslandsHit.add(fid);

    // 8. Check extra life milestones & target completion bonuses
    let extraLifeGranted = this.livesSystem.checkExtraLifeMilestones(this.totalScore);

    if (isTargetHit) {
      this.targetHitsCount++;
      if (this.targetHitsCount % 3 === 0) {
        if (this.livesSystem.addExtraLife()) {
          extraLifeGranted = true;
        }
      }
    }

    return {
      featureId: fid,
      islandName: this.targetSystem.getIslandName(fid),
      basePoints: basePts,
      multiplier: comboRes.newMultiplier,
      comboPoints: comboPts,
      targetBonus,
      specialBonus: specialBonus > 0 ? specialBonus : undefined,
      specialAbilityName,
      totalPointsAwarded: totalAwarded,
      newTotalScore: this.totalScore,
      isRepeatHit: !comboRes.isDistinct,
      isTargetHit,
      extraLifeGranted,
    };
  }

  /**
   * Resets scoring state for a new game run.
   */
  public reset(): void {
    this.totalScore = 0;
    this.totalIslandHits = 0;
    this.targetHitsCount = 0;
    this.distinctIslandsHit.clear();
    this.lastHitTickByFeature.clear();
  }

  /**
   * Restores state from a snapshot.
   */
  public restoreState(state: {
    totalScore: number;
    totalIslandHits: number;
    distinctIslands: string[];
  }): void {
    this.totalScore = state.totalScore;
    this.totalIslandHits = state.totalIslandHits;
    this.distinctIslandsHit.clear();
    for (const id of state.distinctIslands) {
      this.distinctIslandsHit.add(id);
    }
  }
}
