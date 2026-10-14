import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SPECIAL_ISLAND_CONFIGS,
  SpecialIslandRegistry,
} from '../../src/game/abilities/specialIslandRegistry';
import { SpecialIslandSystem } from '../../src/game/abilities/specialIslandSystem';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('SpecialIslandSystem', () => {
  let registry: SpecialIslandRegistry;
  let system: SpecialIslandSystem;
  let eventBus: GameEventBus;

  beforeEach(() => {
    eventBus = new GameEventBus();
    const enabledConfigs = DEFAULT_SPECIAL_ISLAND_CONFIGS.map((c) => ({ ...c, enabled: true }));
    registry = new SpecialIslandRegistry(enabledConfigs);
    system = new SpecialIslandSystem(registry, eventBus);
  });

  it('maps stable Aegean geographic IDs to permanent abilities', () => {
    expect(registry.isSpecialIsland('island-santorini')).toBe(true);
    expect(registry.isSpecialIsland('island-rhodes')).toBe(true);
    expect(registry.isSpecialIsland('island-mykonos')).toBe(true);
    expect(registry.isSpecialIsland('island-lesbos')).toBe(true);

    // Mainlands and Crete are never special islands
    expect(registry.isSpecialIsland('mainland-greece')).toBe(false);
    expect(registry.isSpecialIsland('mainland-turkey')).toBe(false);
    expect(registry.isSpecialIsland('island-crete')).toBe(false);
    expect(registry.isSpecialIsland('islet-45')).toBe(false);
  });

  it('activates Santorini explosive bumper with outward impulse and starts cooldown', () => {
    let eventFired = false;
    eventBus.on('specialIslandActivated', (ev) => {
      if (ev.islandId === 'island-santorini') {
        eventFired = true;
        expect(ev.ability).toBe('explosive_bumper');
      }
    });

    const contactNormal = { x: 0, y: -1 };
    const incomingSpeed = 600;
    const res = system.handleContact(
      'island-santorini',
      { x: 450, y: 1200 },
      contactNormal,
      incomingSpeed,
    );

    expect(res.activated).toBe(true);
    expect(res.ability).toBe('explosive_bumper');
    expect(res.impulse).toBeDefined();
    // 600 * 1.35 = 810 outward
    expect(res.impulse?.y).toBeCloseTo(-810, 1);
    expect(eventFired).toBe(true);

    // Immediate second hit must be in cooldown
    const res2 = system.handleContact(
      'island-santorini',
      { x: 450, y: 1200 },
      contactNormal,
      incomingSpeed,
    );
    expect(res2.activated).toBe(false);

    const status = system.getStatus('island-santorini');
    expect(status?.state).toBe('cooldown');
    expect(status?.remainingMs).toBe(12000);
  });

  it('activates Rhodes speed boost for 5s then enters cooldown', () => {
    const res = system.handleContact('island-rhodes', { x: 800, y: 1100 }, { x: -1, y: 0 }, 500);
    expect(res.activated).toBe(true);
    expect(res.speedBoost).toBe(250);
    expect(system.getActiveSpeedBoost()).toBe(250);

    // While active (at 3s)
    system.update(3.0);
    expect(system.getActiveSpeedBoost()).toBe(250);
    expect(system.getStatus('island-rhodes')?.state).toBe('active');

    // After duration (at 5.1s)
    system.update(2.1);
    expect(system.getActiveSpeedBoost()).toBe(0);
    expect(system.getStatus('island-rhodes')?.state).toBe('cooldown');
    expect(system.getStatus('island-rhodes')?.remainingMs).toBeCloseTo(12000, -2);
  });

  it('activates Mykonos score multiplier without exceeding combo cap guardrail', () => {
    const res = system.handleContact('island-mykonos', { x: 500, y: 800 }, { x: 0, y: 1 }, 400);
    expect(res.activated).toBe(true);
    expect(res.ability).toBe('score_multiplier');
    expect(system.getActiveScoreMultiplier()).toBe(2);

    // Active for 6s
    system.update(4.0);
    expect(system.getActiveScoreMultiplier()).toBe(2);

    // Expires after 6s
    system.update(2.1);
    expect(system.getActiveScoreMultiplier()).toBe(1);
    expect(system.getStatus('island-mykonos')?.state).toBe('cooldown');
  });

  it('activates Lesbos bonus points immediately and starts cooldown', () => {
    const res = system.handleContact('island-lesbos', { x: 700, y: 400 }, { x: 0, y: 1 }, 350);
    expect(res.activated).toBe(true);
    expect(res.ability).toBe('bonus_points');
    expect(res.bonusPointsAwarded).toBe(1000);

    const status = system.getStatus('island-lesbos');
    expect(status?.state).toBe('cooldown');
    expect(status?.remainingMs).toBe(12000);
  });

  it('allows ordinary island scoring during cooldown and returns to ready when cooldown finishes', () => {
    system.handleContact('island-santorini', { x: 450, y: 1200 }, { x: 0, y: -1 }, 500);
    expect(system.getStatus('island-santorini')?.state).toBe('cooldown');

    // Advance 6 seconds: still cooling down
    system.update(6.0);
    expect(system.getStatus('island-santorini')?.state).toBe('cooldown');
    expect(system.getStatus('island-santorini')?.remainingMs).toBe(6000);

    // Advance another 6.1 seconds: cooldown complete, state is ready!
    system.update(6.1);
    expect(system.getStatus('island-santorini')?.state).toBe('ready');
    expect(system.getStatus('island-santorini')?.remainingMs).toBe(0);

    // Can be triggered again
    const res = system.handleContact('island-santorini', { x: 450, y: 1200 }, { x: 0, y: -1 }, 500);
    expect(res.activated).toBe(true);
  });

  it('freezes cooldown timers under pause (when delta is 0)', () => {
    system.handleContact('island-santorini', { x: 450, y: 1200 }, { x: 0, y: -1 }, 500);
    const beforeMs = system.getStatus('island-santorini')?.remainingMs;

    // Simulation is paused, delta is 0
    system.update(0);
    expect(system.getStatus('island-santorini')?.remainingMs).toBe(beforeMs);
  });

  it('exports and restores ability states cleanly', () => {
    system.handleContact('island-santorini', { x: 450, y: 1200 }, { x: 0, y: -1 }, 500);
    system.update(3.0); // 9000 ms left

    const exported = system.exportState();
    expect(exported['island-santorini']?.state).toBe('cooldown');
    expect(exported['island-santorini']?.remainingMs).toBe(9000);

    const newSystem = new SpecialIslandSystem(registry, eventBus);
    newSystem.restoreState(exported);

    expect(newSystem.getStatus('island-santorini')?.state).toBe('cooldown');
    expect(newSystem.getStatus('island-santorini')?.remainingMs).toBe(9000);
  });

  it('does not trigger special abilities when special islands are disabled', () => {
    const disabledRegistry = new SpecialIslandRegistry(); // default configs have enabled: false
    const disabledSystem = new SpecialIslandSystem(disabledRegistry, eventBus);
    const res = disabledSystem.handleContact(
      'island-santorini',
      { x: 450, y: 1200 },
      { x: 0, y: -1 },
      600,
    );
    expect(res.activated).toBe(false);
    expect(res.impulse).toBeUndefined();
  });
});
