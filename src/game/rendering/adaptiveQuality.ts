import { GraphicsQuality } from '../../persistence/contracts';

export interface AdaptiveQualityListener {
  (effectiveQuality: GraphicsQuality, fps: number): void;
}

export class AdaptiveQualityController {
  private userPreference: GraphicsQuality = 'auto';
  private effectiveQuality: GraphicsQuality = 'high';

  private frameTimes: number[] = [];
  private lastEvaluationTime = 0;
  private readonly EVALUATION_INTERVAL_MS = 2500;

  // Hysteresis counters
  private lowFpsCounter = 0;
  private highFpsCounter = 0;

  private listeners: AdaptiveQualityListener[] = [];

  constructor(initialPreference: GraphicsQuality = 'auto') {
    this.setPreference(initialPreference);
  }

  public setPreference(pref: GraphicsQuality): void {
    this.userPreference = pref;
    if (pref !== 'auto') {
      this.effectiveQuality = pref;
    } else {
      // Auto defaults to high or current evaluated tier
      this.effectiveQuality = 'high';
    }
    this.notifyListeners(60);
  }

  public getPreference(): GraphicsQuality {
    return this.userPreference;
  }

  public getEffectiveQuality(): GraphicsQuality {
    return this.effectiveQuality;
  }

  public onQualityChanged(listener: AdaptiveQualityListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  /**
   * Called on every animation frame with the frame duration delta (in ms).
   */
  public update(now: number, deltaMs: number): void {
    if (this.userPreference !== 'auto') return;

    this.frameTimes.push(deltaMs);

    if (now - this.lastEvaluationTime >= this.EVALUATION_INTERVAL_MS) {
      this.evaluate(now);
    }
  }

  private evaluate(now: number): void {
    this.lastEvaluationTime = now;
    if (this.frameTimes.length === 0) return;

    const avgDelta = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes = [];

    const fps = Math.min(120, Math.round(1000 / (avgDelta || 16.6)));

    // Adaptive hysteresis logic
    if (fps < 38) {
      this.lowFpsCounter++;
      this.highFpsCounter = 0;
      if (this.lowFpsCounter >= 2) {
        if (this.effectiveQuality === 'high') {
          this.effectiveQuality = 'medium';
          this.notifyListeners(fps);
        } else if (this.effectiveQuality === 'medium') {
          this.effectiveQuality = 'low';
          this.notifyListeners(fps);
        }
        this.lowFpsCounter = 0;
      }
    } else if (fps >= 55) {
      this.highFpsCounter++;
      this.lowFpsCounter = 0;
      if (this.highFpsCounter >= 3) {
        if (this.effectiveQuality === 'low') {
          this.effectiveQuality = 'medium';
          this.notifyListeners(fps);
        } else if (this.effectiveQuality === 'medium') {
          this.effectiveQuality = 'high';
          this.notifyListeners(fps);
        }
        this.highFpsCounter = 0;
      }
    } else {
      // Stable mid-range: reset streak counters
      this.lowFpsCounter = 0;
      this.highFpsCounter = 0;
    }
  }

  private notifyListeners(fps: number): void {
    for (const l of this.listeners) {
      l(this.effectiveQuality, fps);
    }
  }
}
