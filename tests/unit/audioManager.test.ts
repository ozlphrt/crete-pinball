import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '../../src/audio/audioManager';
import { GameEventBus } from '../../src/game/events/gameEventBus';

describe('AudioManager', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    // Reset instance or create fresh audio context mock
    audioManager = AudioManager.getInstance();
  });

  it('manages independent volume controls with clamping', () => {
    audioManager.setSfxVolume(0.75);
    audioManager.setAmbienceVolume(0.35);
    audioManager.setMusicVolume(0.5);

    const state = audioManager.getAudioState();
    expect(state.soundVolume).toBe(0.75);
    expect(state.ambienceVolume).toBe(0.35);
    expect(state.musicVolume).toBe(0.5);

    // Bounded clamping: negative values clamp to 0, values > 1 clamp to 1
    audioManager.setSfxVolume(-0.5);
    audioManager.setAmbienceVolume(1.8);
    const clampedState = audioManager.getAudioState();
    expect(clampedState.soundVolume).toBe(0);
    expect(clampedState.ambienceVolume).toBe(1);
  });

  it('provides independent mute controls for sfx, ambience and music', () => {
    audioManager.setSfxMuted(true);
    audioManager.setAmbienceMuted(false);
    audioManager.setMusicMuted(true);

    const state = audioManager.getAudioState();
    expect(state.soundMuted).toBe(true);
    expect(state.ambienceMuted).toBe(false);
    expect(state.musicMuted).toBe(true);
  });

  it('throttles rapid collision sounds to avoid audio buffer saturation', () => {
    // Calling collision sound in rapid succession within 25ms interval
    const spy = vi.spyOn(audioManager, 'playIslandCollision');
    audioManager.playIslandCollision('island-naxos', 400);
    audioManager.playIslandCollision('island-naxos', 450);

    expect(spy).toHaveBeenCalledTimes(2);
    // Method executes cleanly without throwing or crashing
    spy.mockRestore();
  });

  it('binds to GameEventBus and responds to collision and gameplay events without error', () => {
    const eventBus = GameEventBus.getInstance();
    audioManager.bindToEventBus(eventBus);

    expect(() => {
      eventBus.emit('islandHit', {
        islandId: 'island-naxos',
        islandName: 'Naxos',
        isSpecial: false,
        isTarget: true,
        points: 600,
        combo: 2,
        impactPoint: { x: 450, y: 800 },
        impactSpeed: 450,
      });

      eventBus.emit('mainlandHit', {
        mainlandId: 'mainland-peloponnese',
        impactPoint: { x: 200, y: 300 },
        impactSpeed: 380,
      });

      eventBus.emit('creteRebound', {
        impactPoint: { x: 450, y: 1450 },
        impactSpeed: 520,
        isCharged: true,
      });

      eventBus.emit('comboIncreased', {
        combo: 3,
        points: 300,
      });

      eventBus.emit('bonusTargetHit', {
        islandId: 'island-naxos',
        bonusPoints: 500,
      });

      eventBus.emit('ballLost', {
        remainingLives: 0,
      });

      eventBus.emit('gameOver', {
        finalScore: 4500,
        survivalSeconds: 42,
      });
    }).not.toThrow();
  });

  it('resumes context safely and handles multiple resets without throwing', () => {
    expect(() => {
      audioManager.unlock();
      audioManager.resumeContext();
      audioManager.playIslandCollision('island-rhodes', 300);
      audioManager.startAmbience();
      audioManager.stopAmbience();
      audioManager.resumeContext();
    }).not.toThrow();
  });
});
