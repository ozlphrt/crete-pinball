import { describe, it, expect, beforeEach } from 'vitest';
import { TimeDilationController } from '../../src/game/environment/timeDilationController';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('TimeDilationController', () => {
  let controller: TimeDilationController;
  let eventBus: GameEventBus;

  beforeEach(() => {
    eventBus = new GameEventBus();
    controller = new TimeDilationController(
      {
        dilationFactor: 0.6,
        durationSeconds: 1.2,
        cooldownSeconds: 10.0,
        criticalZoneMinY: 1300,
        criticalZoneMaxY: 1420,
        minTriggerSpeedVy: 400,
        enabled: true,
      },
      eventBus,
    );
  });

  it('triggers 60% slow motion when fast ball enters critical danger zone', () => {
    let slowMoEventFired = false;
    eventBus.on('slowMotionChanged', (ev) => {
      if (ev.active) {
        slowMoEventFired = true;
        expect(ev.factor).toBe(0.6);
      }
    });

    // Too high above danger zone
    expect(controller.checkCriticalApproach(1100, 500)).toBe(false);

    // In danger zone but too slow
    expect(controller.checkCriticalApproach(1350, 300)).toBe(false);

    // In danger zone and fast downward approach: triggers!
    expect(controller.checkCriticalApproach(1350, 450)).toBe(true);
    expect(controller.currentState).toBe('active');
    expect(controller.timeScale).toBe(0.6);
    expect(slowMoEventFired).toBe(true);
  });

  it('transitions from active to cooldown, then back to ready', () => {
    controller.checkCriticalApproach(1350, 450);
    expect(controller.currentState).toBe('active');

    // Advance duration (1.2s)
    controller.update(1.25);
    expect(controller.currentState).toBe('cooldown');
    expect(controller.timeScale).toBe(1.0); // Normal speed restored

    // While cooling down, cannot re-trigger
    expect(controller.checkCriticalApproach(1350, 450)).toBe(false);

    // Advance cooldown (10s)
    controller.update(10.1);
    expect(controller.currentState).toBe('ready');

    // Can trigger again
    expect(controller.checkCriticalApproach(1350, 450)).toBe(true);
  });

  it('respects Reduced Motion preference by keeping normal 1.0 time scale', () => {
    controller.setReducedMotion(true);

    expect(controller.checkCriticalApproach(1350, 450)).toBe(false);
    expect(controller.timeScale).toBe(1.0);
  });

  it('exports and restores slow motion state cleanly', () => {
    controller.checkCriticalApproach(1350, 450);
    const exported = controller.exportState();
    expect(exported.state).toBe('active');

    const newController = new TimeDilationController(controller.getConfig(), eventBus);
    newController.restoreState(exported);
    expect(newController.currentState).toBe('active');
    expect(newController.timeScale).toBe(0.6);
  });
});
