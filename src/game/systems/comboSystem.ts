export interface ComboHitResult {
  readonly isDistinct: boolean;
  readonly newMultiplier: number;
  readonly pointsMultiplier: number;
}

export class ComboSystem {
  private multiplier = 1;
  private consecutiveDistinctCount = 0;
  private highestMultiplierReached = 1;
  private lastDistinctIslandId: string | null = null;
  private lastHitIslandId: string | null = null;

  public get currentMultiplier(): number {
    return this.multiplier;
  }

  public get consecutiveDistinctIslands(): number {
    return this.consecutiveDistinctCount;
  }

  public get highestMultiplier(): number {
    return this.highestMultiplierReached;
  }

  public get lastHitId(): string | null {
    return this.lastHitIslandId;
  }

  public get lastDistinctId(): string | null {
    return this.lastDistinctIslandId;
  }

  /**
   * Records a valid island hit and computes combo multiplier progression.
   *
   * Rules (GAME_DESIGN.md & PHASE_03.md):
   * 1. 1st distinct island: x1 multiplier
   * 2. Consecutive DIFFERENT island: advances multiplier up to x5 cap
   * 3. Consecutive SAME island: earns base points, does NOT advance multiplier, does NOT break chain
   * 4. Next distinct island after a repeat compares against last distinct chain island
   */
  public recordIslandHit(islandId: string): ComboHitResult {
    const isRepeat = this.lastHitIslandId === islandId;

    if (isRepeat) {
      // Repeat hit on same island: does not advance combo multiplier
      // Award base points only (pointsMultiplier = 1)
      return {
        isDistinct: false,
        newMultiplier: this.multiplier,
        pointsMultiplier: 1,
      };
    }

    // Distinct island hit from the immediate previous hit
    const isDistinctFromChain = this.lastDistinctIslandId !== islandId;

    if (isDistinctFromChain) {
      this.consecutiveDistinctCount++;
      // Multiplier progression: 1st distinct = 1, 2nd = 2, 3rd = 3, 4th = 4, 5th+ = 5
      this.multiplier = Math.min(5, Math.max(1, this.consecutiveDistinctCount));
      this.lastDistinctIslandId = islandId;
      if (this.multiplier > this.highestMultiplierReached) {
        this.highestMultiplierReached = this.multiplier;
      }
    }

    this.lastHitIslandId = islandId;

    return {
      isDistinct: true,
      newMultiplier: this.multiplier,
      pointsMultiplier: this.multiplier,
    };
  }

  /**
   * Crete paddle rebounds, mainland coastlines, and arena boundary bounces
   * preserve the current combo without advancing or resetting it.
   */
  public preserveCombo(): void {
    // Intentionally keep current multiplier and chain intact
  }

  /**
   * Ball loss (draining south) resets the combo chain for the next life.
   */
  public resetCombo(): void {
    this.multiplier = 1;
    this.consecutiveDistinctCount = 0;
    this.lastDistinctIslandId = null;
    this.lastHitIslandId = null;
  }

  /**
   * Resets entire combo tracking for a brand new run.
   */
  public resetAll(): void {
    this.resetCombo();
    this.highestMultiplierReached = 1;
  }

  /**
   * Restores state from a snapshot (for pause/resume).
   */
  public restoreState(state: {
    multiplier: number;
    consecutiveDistinctCount: number;
    highestMultiplierReached: number;
    lastDistinctIslandId: string | null;
    lastHitIslandId: string | null;
  }): void {
    this.multiplier = state.multiplier;
    this.consecutiveDistinctCount = state.consecutiveDistinctCount;
    this.highestMultiplierReached = state.highestMultiplierReached;
    this.lastDistinctIslandId = state.lastDistinctIslandId;
    this.lastHitIslandId = state.lastHitIslandId;
  }
}
