import { describe, it, expect, beforeEach } from 'vitest';
import { MultiballSystem } from '../../src/game/abilities/multiballSystem';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('MultiballSystem', () => {
  let system: MultiballSystem;
  let eventBus: GameEventBus;

  beforeEach(() => {
    eventBus = new GameEventBus();
    system = new MultiballSystem(
      { triggerComboMultiplier: 4, durationMs: 20000, maxSimultaneousBalls: 3, enabled: true },
      eventBus,
    );
  });

  it('triggers 3-ball multiball when combo multiplier reaches trigger threshold (x4)', () => {
    let spawnCalled = false;
    system.onSpawnBonusBalls(() => {
      spawnCalled = true;
    });

    expect(system.isActive).toBe(false);

    // Below threshold
    expect(system.checkComboTrigger(2)).toBe(false);
    expect(system.checkComboTrigger(3)).toBe(false);
    expect(system.isActive).toBe(false);

    // Reaching x4 triggers multiball!
    expect(system.checkComboTrigger(4)).toBe(true);
    expect(system.isActive).toBe(true);
    expect(system.activeBalls.length).toBe(3);
    expect(spawnCalled).toBe(true);

    // Does not trigger recursively while active
    expect(system.checkComboTrigger(5)).toBe(false);
  });

  it('does not deduct life when a bonus ball exits south, only the final active ball deducts life', () => {
    system.triggerMultiball();
    expect(system.activeBalls.length).toBe(3);

    // First ball exits: bonus exit, no life lost!
    const exit1 = system.handleBallExit('ball-bonus-1');
    expect(exit1.isBonusExit).toBe(true);
    expect(exit1.isFinalDrain).toBe(false);
    expect(system.activeBalls.length).toBe(2);
    expect(system.isActive).toBe(true);

    // Second ball exits: bonus exit, no life lost, multiball naturally ends with 1 survivor
    const exit2 = system.handleBallExit('ball-bonus-2');
    expect(exit2.isBonusExit).toBe(true);
    expect(exit2.isFinalDrain).toBe(false);
    expect(system.activeBalls.length).toBe(1);
    expect(system.isActive).toBe(false); // Returns to normal single-ball mode

    // Final ball exits: this IS a real drain and deducts life!
    const exit3 = system.handleBallExit('ball-primary');
    expect(exit3.isBonusExit).toBe(false);
    expect(exit3.isFinalDrain).toBe(true);
  });

  it('deterministically keeps one surviving ball when multiball duration expires without life loss', () => {
    let retireCalled = false;
    system.onRetireBonusBalls(() => {
      retireCalled = true;
    });

    system.triggerMultiball();
    expect(system.isActive).toBe(true);

    // Advance 10s: still active
    system.update(10);
    expect(system.isActive).toBe(true);

    // Advance remaining 10.1s: expires
    system.update(10.1);
    expect(system.isActive).toBe(false);
    expect(retireCalled).toBe(true);
    expect(system.activeBalls).toEqual(['ball-primary']);
  });

  it('exports and restores multiball state', () => {
    system.triggerMultiball();
    system.update(5);

    const exported = system.exportState();
    expect(exported.isActive).toBe(true);
    expect(exported.remainingMs).toBe(15000);
    expect(exported.activeBallIds.length).toBe(3);

    const newSys = new MultiballSystem(
      { triggerComboMultiplier: 4, durationMs: 20000, maxSimultaneousBalls: 3, enabled: true },
      eventBus,
    );
    newSys.restoreState(exported);
    expect(newSys.isActive).toBe(true);
    expect(newSys.durationRemaining).toBe(15000);
    expect(newSys.activeBalls.length).toBe(3);
  });
});
