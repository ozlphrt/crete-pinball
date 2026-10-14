export class SessionClock {
  private activeElapsedSeconds = 0;

  public get elapsedSeconds(): number {
    return this.activeElapsedSeconds;
  }

  public get elapsedMilliseconds(): number {
    return Math.round(this.activeElapsedSeconds * 1000);
  }

  public get formattedDuration(): string {
    const totalSecs = Math.floor(this.activeElapsedSeconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Advances active simulation clock by delta seconds.
   * Only called during active gameplay simulation.
   */
  public advance(deltaSeconds: number): void {
    if (deltaSeconds > 0) {
      this.activeElapsedSeconds += deltaSeconds;
    }
  }

  public reset(): void {
    this.activeElapsedSeconds = 0;
  }

  public restore(seconds: number): void {
    this.activeElapsedSeconds = Math.max(0, seconds);
  }
}
