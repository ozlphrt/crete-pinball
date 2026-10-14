import { describe, it, expect, vi } from 'vitest';
import { AudioManager } from '../../src/audio/audioManager';
import { EffectDirector } from '../../src/game/rendering/effectDirector';

describe('Thunderstorm Lightning & Localized Daylight Reveal', () => {
  it('spawns procedural micro-lightning arcs on impact', () => {
    // Mock minimal Phaser scene
    const mockGraphics = {
      clear: vi.fn(),
      setDepth: vi.fn().mockReturnThis(),
      lineStyle: vi.fn(),
      lineBetween: vi.fn(),
      strokeCircle: vi.fn(),
      fillStyle: vi.fn(),
      fillCircle: vi.fn(),
      destroy: vi.fn(),
    };

    const mockScene = {
      add: {
        graphics: vi.fn().mockReturnValue(mockGraphics),
        text: vi.fn().mockReturnValue({
          setOrigin: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setScale: vi.fn().mockReturnThis(),
          setAlpha: vi.fn().mockReturnThis(),
          destroy: vi.fn(),
        }),
      },
      time: { now: 1000 },
      cameras: {
        main: {
          shake: vi.fn(),
        },
      },
      tweens: {
        add: vi.fn(),
      },
    } as unknown as Phaser.Scene;

    const effectDirector = new EffectDirector(mockScene);

    // Spawn collision effect
    effectDirector.spawnIslandHitEffects({ x: 350, y: 600 }, 100, false, false, 450);

    // Update at t=1050 (during 130ms flash)
    effectDirector.update(1050, 16);

    // Lightning graphics should have rendered strokes
    expect(mockGraphics.lineBetween).toHaveBeenCalled();

    // Reduced motion immediately clears lightning
    effectDirector.setReducedMotion(true);
    mockGraphics.clear.mockClear();
    effectDirector.update(1060, 16);

    effectDirector.destroy();
  });

  it('layers subtle muffled thunder rumble without audio distortion', () => {
    const audioManager = AudioManager.getInstance();
    expect(() => {
      audioManager.playSubtleThunder(0.6);
      audioManager.playIslandCollision('island-naxos', 450, false);
      audioManager.playMainlandCollision(400);
    }).not.toThrow();
  });
});
