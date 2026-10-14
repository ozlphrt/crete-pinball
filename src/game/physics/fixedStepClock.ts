/**
 * FixedStepClock decouples physics and simulation updates from the rendering framerate.
 * It accumulates real elapsed time and dispatches fixed simulation ticks.
 */
export class FixedStepClock {
  private readonly stepDeltaMs: number;
  private readonly maxCatchUpSteps: number;
  private accumulatorMs = 0;
  private tickCount = 0;
  private isPaused = false;
  private totalSimulatedTimeMs = 0;

  constructor(stepFrequencyHz = 120, maxCatchUpSteps = 8) {
    if (stepFrequencyHz <= 0) {
      throw new Error('stepFrequencyHz must be greater than 0');
    }
    this.stepDeltaMs = 1000 / stepFrequencyHz;
    this.maxCatchUpSteps = maxCatchUpSteps;
  }

  public get fixedDeltaMs(): number {
    return this.stepDeltaMs;
  }

  public get ticks(): number {
    return this.tickCount;
  }

  public get simulatedTimeMs(): number {
    return this.totalSimulatedTimeMs;
  }

  public get paused(): boolean {
    return this.isPaused;
  }

  public pause(): void {
    this.isPaused = true;
    // Discard any residual accumulator so resume does not cause a sudden burst of ticks
    this.accumulatorMs = 0;
  }

  public resume(): void {
    this.isPaused = false;
    this.accumulatorMs = 0;
  }

  public reset(): void {
    this.accumulatorMs = 0;
    this.tickCount = 0;
    this.totalSimulatedTimeMs = 0;
    this.isPaused = false;
  }

  /**
   * Advances the clock by the given elapsed real-time delta (in milliseconds).
   * Calls onTick for each consumed fixed timestep.
   * Returns the number of fixed ticks executed.
   */
  public update(
    elapsedMs: number,
    onTick: (fixedDeltaMs: number, currentTick: number) => void,
  ): number {
    if (this.isPaused) {
      return 0;
    }

    // Ignore negative or non-finite deltas
    if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
      return 0;
    }

    this.accumulatorMs += elapsedMs;

    // Prevent spiral of death: cap maximum accumulated time
    const maxAccumulatedMs = this.stepDeltaMs * this.maxCatchUpSteps;
    if (this.accumulatorMs > maxAccumulatedMs) {
      this.accumulatorMs = maxAccumulatedMs;
    }

    let executedSteps = 0;
    const epsilon = 1e-5;
    while (this.accumulatorMs >= this.stepDeltaMs - epsilon) {
      this.accumulatorMs = Math.max(0, this.accumulatorMs - this.stepDeltaMs);
      this.tickCount += 1;
      this.totalSimulatedTimeMs += this.stepDeltaMs;
      onTick(this.stepDeltaMs, this.tickCount);
      executedSteps += 1;
    }

    return executedSteps;
  }

  /**
   * Alpha value [0, 1) representing the interpolation progress between the
   * previous fixed state and the next fixed state for smooth rendering.
   */
  public get interpolationAlpha(): number {
    if (this.isPaused || this.stepDeltaMs <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, this.accumulatorMs / this.stepDeltaMs));
  }
}
