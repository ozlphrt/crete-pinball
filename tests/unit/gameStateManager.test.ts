import { describe, it, expect, vi } from 'vitest';
import { GameStateManager } from '../../src/game/systems/gameStateManager';

describe('GameStateManager', () => {
  it('initializes to boot state and transitions through valid lifecycle', () => {
    const fsm = new GameStateManager('boot');
    expect(fsm.getState()).toBe('boot');

    expect(fsm.transitionTo('menu')).toBe(true);
    expect(fsm.getState()).toBe('menu');

    expect(fsm.transitionTo('ready')).toBe(true);
    expect(fsm.getState()).toBe('ready');

    expect(fsm.transitionTo('playing')).toBe(true);
    expect(fsm.getState()).toBe('playing');
    expect(fsm.isSimulating()).toBe(true);

    expect(fsm.transitionTo('paused')).toBe(true);
    expect(fsm.isPaused()).toBe(true);
    expect(fsm.isSimulating()).toBe(false);

    expect(fsm.transitionTo('resumeCountdown')).toBe(true);
    expect(fsm.isPaused()).toBe(true);

    expect(fsm.transitionTo('playing')).toBe(true);
    expect(fsm.isPaused()).toBe(false);

    expect(fsm.transitionTo('gameOver')).toBe(true);
    expect(fsm.transitionTo('menu')).toBe(true);
    expect(fsm.getState()).toBe('menu');
  });

  it('rejects invalid state transitions with a descriptive error', () => {
    const fsm = new GameStateManager('boot');

    // Cannot transition directly from boot to playing
    expect(() => fsm.transitionTo('playing')).toThrow(
      "Invalid game state transition: cannot transition from 'boot' to 'playing'",
    );

    fsm.transitionTo('menu');
    // Cannot transition directly from menu to paused
    expect(() => fsm.transitionTo('paused')).toThrow(
      "Invalid game state transition: cannot transition from 'menu' to 'paused'",
    );
  });

  it('notifies listeners upon state transition', () => {
    const fsm = new GameStateManager('boot');
    const listener = vi.fn();

    const unsubscribe = fsm.onStateChange(listener);
    fsm.transitionTo('menu');

    expect(listener).toHaveBeenCalledWith('menu', 'boot');

    unsubscribe();
    fsm.transitionTo('ready');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
