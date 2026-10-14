import { GameState } from '../../types';

export type StateChangeCallback = (newState: GameState, oldState: GameState) => void;

/**
 * Valid state transitions for Crete Pinball:
 * boot -> menu
 * menu -> tutorial | ready | exploration | settings | achievements
 * tutorial -> ready
 * ready -> playing
 * playing -> paused | lifeLost | gameOver
 * paused -> resumeCountdown
 * resumeCountdown -> playing
 * lifeLost -> ready | gameOver
 * gameOver -> menu | ready
 * exploration -> menu
 * settings -> menu
 * achievements -> menu
 */
const PERMITTED_TRANSITIONS: Record<GameState, readonly GameState[]> = {
  boot: ['menu'],
  menu: ['tutorial', 'ready', 'exploration', 'settings', 'achievements'],
  tutorial: ['ready', 'menu'],
  ready: ['playing', 'menu', 'paused'],
  playing: ['paused', 'lifeLost', 'gameOver', 'menu'],
  paused: ['resumeCountdown', 'playing', 'menu', 'ready'],
  resumeCountdown: ['playing', 'paused'],
  lifeLost: ['ready', 'gameOver'],
  gameOver: ['menu', 'ready'],
  exploration: ['menu'],
  settings: ['menu'],
  achievements: ['menu'],
};

export class GameStateManager {
  private currentState: GameState = 'boot';
  private listeners: StateChangeCallback[] = [];

  constructor(initialState: GameState = 'boot') {
    this.currentState = initialState;
  }

  public forceState(targetState: GameState): void {
    const oldState = this.currentState;
    this.currentState = targetState;
    for (const listener of this.listeners) {
      listener(targetState, oldState);
    }
  }

  public getState(): GameState {
    return this.currentState;
  }

  public canTransitionTo(targetState: GameState): boolean {
    const allowed = PERMITTED_TRANSITIONS[this.currentState];
    return allowed ? allowed.includes(targetState) : false;
  }

  public transitionTo(targetState: GameState): boolean {
    if (this.currentState === targetState) {
      return true;
    }

    if (!this.canTransitionTo(targetState)) {
      throw new Error(
        `Invalid game state transition: cannot transition from '${this.currentState}' to '${targetState}'`,
      );
    }

    const oldState = this.currentState;
    this.currentState = targetState;

    for (const listener of this.listeners) {
      listener(targetState, oldState);
    }

    return true;
  }

  public onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  public isSimulating(): boolean {
    return this.currentState === 'playing';
  }

  public isPaused(): boolean {
    return this.currentState === 'paused' || this.currentState === 'resumeCountdown';
  }
}
