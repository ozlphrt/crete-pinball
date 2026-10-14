import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveQualityController } from '../../src/game/rendering/adaptiveQuality';
import { LocalStorageAdapter } from '../../src/persistence/storageAdapter';
import { GraphicsQuality, UserPreferences } from '../../src/persistence/contracts';

describe('Phase 05 — Presentation and Player Experience', () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    storage = new LocalStorageAdapter();
  });

  describe('AdaptiveQualityController', () => {
    it('supports all quality tiers: high, medium, low, auto', () => {
      const controller = new AdaptiveQualityController('high');
      expect(controller.getPreference()).toBe('high');
      expect(controller.getEffectiveQuality()).toBe('high');

      controller.setPreference('medium');
      expect(controller.getEffectiveQuality()).toBe('medium');

      controller.setPreference('low');
      expect(controller.getEffectiveQuality()).toBe('low');

      controller.setPreference('auto');
      expect(controller.getPreference()).toBe('auto');
      // Auto initial fallback is high
      expect(controller.getEffectiveQuality()).toBe('high');
    });

    it('adapts quality downward when low frame rate persists', () => {
      const controller = new AdaptiveQualityController('auto');
      let changedQuality: GraphicsQuality | null = null;
      controller.onQualityChanged((q) => {
        changedQuality = q;
      });

      // Simulate sustained low FPS (~25 FPS -> 40ms frame delta)
      for (let i = 0; i < 150; i++) {
        controller.update(i * 40, 40);
      }

      // Hysteresis triggers downward adjustment
      expect(['medium', 'low']).toContain(controller.getEffectiveQuality());
      expect(changedQuality).not.toBeNull();
    });
  });

  describe('Preference Persistence', () => {
    it('persists and restores all Phase 05 accessibility and audio preferences', () => {
      const initial = storage.getPreferencesSync();
      const updated: UserPreferences = {
        ...initial,
        soundVolume: 0.9,
        ambienceVolume: 0.25,
        musicVolume: 0.35,
        soundMuted: false,
        ambienceMuted: true,
        musicMuted: true,
        reducedMotion: true,
        highContrast: true,
        graphicsQuality: 'medium',
        tutorialCompleted: true,
        locale: 'tr',
      };

      storage.savePreferencesSync(updated);

      const reloaded = storage.getPreferencesSync();
      expect(reloaded.soundVolume).toBe(0.9);
      expect(reloaded.ambienceVolume).toBe(0.25);
      expect(reloaded.musicVolume).toBe(0.35);
      expect(reloaded.ambienceMuted).toBe(true);
      expect(reloaded.musicMuted).toBe(true);
      expect(reloaded.reducedMotion).toBe(true);
      expect(reloaded.highContrast).toBe(true);
      expect(reloaded.graphicsQuality).toBe('medium');
      expect(reloaded.tutorialCompleted).toBe(true);
      expect(reloaded.locale).toBe('tr');
    });
  });
});
