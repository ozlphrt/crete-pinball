export interface LivesConfig {
  readonly initialLives: number;
  readonly maxLives: number;
  readonly extraLifeMilestones: readonly number[];
}

export const DEFAULT_LIVES_CONFIG: LivesConfig = {
  initialLives: 1,
  maxLives: 5,
  extraLifeMilestones: [5000, 15000, 30000, 60000, 120000],
};

export class LivesSystem {
  private lives: number;
  private extraLivesEarnedCount = 0;
  private readonly awardedMilestones = new Set<number>();
  private readonly config: LivesConfig;

  constructor(config: Partial<LivesConfig> = {}) {
    this.config = { ...DEFAULT_LIVES_CONFIG, ...config };
    this.lives = this.config.initialLives;
  }

  public get currentLives(): number {
    return this.lives;
  }

  public get maxLives(): number {
    return this.config.maxLives;
  }

  public get extraLivesEarned(): number {
    return this.extraLivesEarnedCount;
  }

  public get isGameOver(): boolean {
    return this.lives <= 0;
  }

  /**
   * Deducts one life when a ball completely escapes through the southern drain.
   * Decrements only once per southern loss event.
   */
  public loseLife(): { remainingLives: number; isGameOver: boolean } {
    if (this.lives > 0) {
      this.lives--;
    }
    return {
      remainingLives: this.lives,
      isGameOver: this.isGameOver,
    };
  }

  /**
   * Directly grants an extra ball/life (e.g. from bonus targets or special abilities),
   * capped at maxLives.
   */
  public addExtraLife(): boolean {
    if (this.lives < this.config.maxLives) {
      this.lives++;
      this.extraLivesEarnedCount++;
      return true;
    }
    return false;
  }

  /**
   * Checks whether the new score crosses any unearned extra life milestones.
   * Extra lives are capped at maxLives to prevent infinite farming.
   */
  public checkExtraLifeMilestones(score: number): boolean {
    let granted = false;

    for (const milestone of this.config.extraLifeMilestones) {
      if (score >= milestone && !this.awardedMilestones.has(milestone)) {
        this.awardedMilestones.add(milestone);
        if (this.lives < this.config.maxLives) {
          this.lives++;
          this.extraLivesEarnedCount++;
          granted = true;
        }
      }
    }

    return granted;
  }

  /**
   * Resets lives state for a new game run.
   */
  public reset(): void {
    this.lives = this.config.initialLives;
    this.extraLivesEarnedCount = 0;
    this.awardedMilestones.clear();
  }

  /**
   * Restores lives state from snapshot.
   */
  public restoreState(state: {
    lives: number;
    extraLivesEarned: number;
    awardedMilestones: number[];
  }): void {
    this.lives = state.lives;
    this.extraLivesEarnedCount = state.extraLivesEarned;
    this.awardedMilestones.clear();
    for (const m of state.awardedMilestones) {
      this.awardedMilestones.add(m);
    }
  }

  public getAwardedMilestones(): number[] {
    return Array.from(this.awardedMilestones);
  }
}
