import { describe, it, expect, beforeEach } from 'vitest';
import { CreteEnergySystem } from '../../src/game/abilities/creteEnergySystem';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('CreteEnergySystem', () => {
  let system: CreteEnergySystem;
  let eventBus: GameEventBus;

  beforeEach(() => {
    eventBus = new GameEventBus();
    system = new CreteEnergySystem(
      { chargePerComboHit: 0.25, boostMultiplier: 1.45, enabled: true },
      eventBus,
    );
  });

  it('accumulates charge only from distinct combo hits up to 100%', () => {
    expect(system.charge).toBe(0);
    expect(system.isFull).toBe(false);

    system.addComboCharge();
    expect(system.charge).toBeCloseTo(0.25, 2);

    system.addComboCharge();
    expect(system.charge).toBeCloseTo(0.5, 2);

    system.addComboCharge();
    expect(system.charge).toBeCloseTo(0.75, 2);

    system.addComboCharge();
    expect(system.charge).toBeCloseTo(1.0, 2);
    expect(system.isFull).toBe(true);

    // Extra hits do not exceed 100%
    system.addComboCharge();
    expect(system.charge).toBe(1.0);
  });

  it('cannot be armed before 100% full', () => {
    system.addComboCharge();
    system.addComboCharge();
    expect(system.isFull).toBe(false);

    const armed = system.arm();
    expect(armed).toBe(false);
    expect(system.isArmed).toBe(false);
  });

  it('arms on double-tap when 100% full and emits event', () => {
    let armEventFired = false;
    eventBus.on('powerBounceArmed', (ev) => {
      if (ev.armed) armEventFired = true;
    });

    for (let i = 0; i < 4; i++) system.addComboCharge();
    expect(system.isFull).toBe(true);

    const armed = system.arm();
    expect(armed).toBe(true);
    expect(system.isArmed).toBe(true);
    expect(armEventFired).toBe(true);
  });

  it('consumes armed charge exactly once at northern paddle hit and resets to zero', () => {
    let fireEventFired = false;
    eventBus.on('powerBounceFired', (ev) => {
      fireEventFired = true;
      expect(ev.outgoingSpeed).toBe(950);
    });

    for (let i = 0; i < 4; i++) system.addComboCharge();
    system.arm();
    expect(system.isArmed).toBe(true);

    const consumed = system.consumeArmedCharge({ x: 450, y: 1460 }, 950);
    expect(consumed).toBe(true);
    expect(system.isArmed).toBe(false);
    expect(system.charge).toBe(0);
    expect(fireEventFired).toBe(true);

    // Second hit cannot consume again
    const secondConsumed = system.consumeArmedCharge({ x: 450, y: 1460 }, 900);
    expect(secondConsumed).toBe(false);
  });

  it('resets armed and charge state when life is lost', () => {
    for (let i = 0; i < 4; i++) system.addComboCharge();
    system.arm();
    expect(system.isArmed).toBe(true);

    system.onLifeLost();
    expect(system.isArmed).toBe(false);
    expect(system.charge).toBe(0);
  });

  it('exports and restores power bounce state cleanly', () => {
    for (let i = 0; i < 4; i++) system.addComboCharge();
    system.arm();

    const exported = system.exportState();
    expect(exported.charge).toBe(1.0);
    expect(exported.isArmed).toBe(true);

    const newSys = new CreteEnergySystem(
      { chargePerComboHit: 0.25, boostMultiplier: 1.45, enabled: true },
      eventBus,
    );
    newSys.restoreState(exported);
    expect(newSys.charge).toBe(1.0);
    expect(newSys.isArmed).toBe(true);
  });
});
