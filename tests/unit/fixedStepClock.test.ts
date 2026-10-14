import { describe, it, expect } from 'vitest';
import { FixedStepClock } from '../../src/game/physics/fixedStepClock';

describe('FixedStepClock', () => {
  it('advances in exact fixed timesteps regardless of elapsed frame delta', () => {
    // 120 Hz -> fixedDeltaMs = 8.333333 ms
    const clock = new FixedStepClock(120);
    const deltasReceived: number[] = [];

    // Simulate 30 FPS display frame delta (1000 / 30 ms)
    // (1000 / 30) / (1000 / 120) = exactly 4 steps
    const steps = clock.update(1000 / 30, (dt) => {
      deltasReceived.push(dt);
    });

    expect(steps).toBe(4);
    expect(deltasReceived.length).toBe(4);
    deltasReceived.forEach((dt) => {
      expect(dt).toBeCloseTo(1000 / 120, 5);
    });
  });

  it('caps maximum catch-up steps to prevent death spiral during lag spike', () => {
    // maxCatchUpSteps = 5
    const clock = new FixedStepClock(120, 5);
    let stepCount = 0;

    // Simulate a massive 500ms lag spike
    const steps = clock.update(500, () => {
      stepCount++;
    });

    expect(steps).toBe(5);
    expect(stepCount).toBe(5);
  });

  it('clears accumulator on pause so resume does not burst ticks', () => {
    const clock = new FixedStepClock(120);

    // Accumulate half a step
    clock.update(4.0, () => {});
    expect(clock.ticks).toBe(0);

    // Pause the clock
    clock.pause();
    expect(clock.paused).toBe(true);

    // Any updates while paused must produce 0 ticks
    const pausedSteps = clock.update(100, () => {});
    expect(pausedSteps).toBe(0);

    // Resume
    clock.resume();
    expect(clock.paused).toBe(false);

    // Next small update should only account for new time, not previous accumulated time
    const postResumeSteps = clock.update(4.0, () => {});
    expect(postResumeSteps).toBe(0);
  });

  it('tracks total simulated time and ticks accurately', () => {
    const clock = new FixedStepClock(100, 15); // 10ms per step, up to 15 catchup steps
    clock.update(100, () => {});

    expect(clock.ticks).toBe(10);
    expect(clock.simulatedTimeMs).toBeCloseTo(100, 5);
  });
});
