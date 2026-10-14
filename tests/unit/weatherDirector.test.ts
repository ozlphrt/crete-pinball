import { describe, it, expect, beforeEach } from 'vitest';
import { WeatherDirector } from '../../src/game/environment/weatherDirector';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('WeatherDirector', () => {
  let director: WeatherDirector;
  let eventBus: GameEventBus;

  beforeEach(() => {
    eventBus = new GameEventBus();
    director = new WeatherDirector(
      {
        intervalSeconds: 20,
        eventDurationSeconds: 10,
        meltemiStrength: 100,
        crosswindStrength: 80,
        calmReduction: 70,
        enabled: true,
      },
      12345,
      eventBus,
    );
  });

  it('triggers Meltemi with additive southward force', () => {
    let eventReceived = false;
    eventBus.on('weatherChanged', (ev) => {
      if (ev.type === 'meltemi') {
        eventReceived = true;
        expect(ev.intensity).toBe(100);
        expect(ev.headingDegrees).toBe(180);
      }
    });

    director.triggerEvent('meltemi');
    expect(director.activeType).toBe('meltemi');
    expect(director.activeForce).toEqual({ x: 0, y: 100 });
    expect(director.durationRemaining).toBe(10);
    expect(eventReceived).toBe(true);
  });

  it('triggers Crosswind with bounded horizontal force in given direction', () => {
    director.triggerEvent('crosswind', 'west');
    expect(director.activeType).toBe('crosswind');
    expect(director.activeForce).toEqual({ x: -80, y: 0 });

    director.triggerEvent('crosswind', 'east');
    expect(director.activeForce).toEqual({ x: 80, y: 0 });
  });

  it('triggers Calm seas with bounded negative southward force', () => {
    director.triggerEvent('calm');
    expect(director.activeType).toBe('calm');
    expect(director.activeForce).toEqual({ x: 0, y: -70 });
  });

  it('automatically clears force and restores zero acceleration when event expires', () => {
    director.triggerEvent('meltemi');
    expect(director.activeForce.y).toBe(100);

    // Advance 6s: still active
    director.update(6);
    expect(director.activeForce.y).toBe(100);

    // Advance remaining 4.1s: expired, cleanly returns to none with zero force
    director.update(4.1);
    expect(director.activeType).toBe('none');
    expect(director.activeForce).toEqual({ x: 0, y: 0 });
  });

  it('triggers scheduled weather deterministically with a seeded RNG', () => {
    expect(director.activeType).toBe('none');

    // Advance 20.1s past the interval
    director.update(20.1);
    expect(director.activeType).not.toBe('none');
    expect(director.durationRemaining).toBe(10);
  });

  it('exports and restores weather state cleanly', () => {
    director.triggerEvent('crosswind', 'east');
    director.update(3);

    const exported = director.exportState();
    expect(exported.type).toBe('crosswind');
    expect(exported.forceX).toBe(80);
    expect(exported.remainingDurationSeconds).toBe(7);

    const newDirector = new WeatherDirector(director.getConfig(), 99, eventBus);
    newDirector.restoreState(exported);
    expect(newDirector.activeType).toBe('crosswind');
    expect(newDirector.activeForce).toEqual({ x: 80, y: 0 });
    expect(newDirector.durationRemaining).toBe(7);
  });
});
