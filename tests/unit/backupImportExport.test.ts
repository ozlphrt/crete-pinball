import { describe, it, expect, beforeEach } from 'vitest';
import { BackupValidator } from '../../src/persistence/BackupValidator';
import { ImportExportService } from '../../src/persistence/ImportExportService';
import { GameDatabase } from '../../src/persistence/GameDatabase';
import { SCHEMA_VERSION } from '../../src/config';
import { FullBackupPayload } from '../../src/persistence/contracts';
import { makeIslandId } from '../../src/types';

describe('BackupValidator & ImportExportService', () => {
  let db: GameDatabase;
  let service: ImportExportService;

  beforeEach(async () => {
    db = new GameDatabase();
    await db.init();
    await db.clearAll();
    service = new ImportExportService(db);
  });

  describe('BackupValidator', () => {
    it('validates authentic complete backup payload', async () => {
      const validPayload: FullBackupPayload = {
        metadata: {
          schemaVersion: SCHEMA_VERSION,
          createdAtIso: new Date().toISOString(),
          lastModifiedIso: new Date().toISOString(),
        },
        preferences: {
          locale: 'tr',
          theme: 'dark-nautical',
          defaultDifficulty: 'normal',
          soundVolume: 0.8,
          ambienceVolume: 0.5,
          musicVolume: 0.5,
          soundMuted: false,
          ambienceMuted: false,
          musicMuted: false,
          hapticsEnabled: true,
          reducedMotion: false,
          highContrast: false,
          graphicsQuality: 'high',
          tutorialCompleted: true,
          analyticsEnabled: true,
          developerMode: false,
        },
        highScores: {
          easy: {
            highScore: 5000,
            longestSurvivalSeconds: 60,
            highestCombo: 3,
            dateAchievedIso: '',
          },
          normal: {
            highScore: 15000,
            longestSurvivalSeconds: 120,
            highestCombo: 5,
            dateAchievedIso: '',
          },
          hard: {
            highScore: 25000,
            longestSurvivalSeconds: 180,
            highestCombo: 8,
            dateAchievedIso: '',
          },
        },
        islandProgress: {
          discoveredIslands: {
            'island-santorini': {
              islandId: makeIslandId('island-santorini'),
              firstHitDateIso: new Date().toISOString(),
              lastHitDateIso: new Date().toISOString(),
              totalHitCount: 5,
              totalPointsContributed: 1250,
            },
          },
        },
        achievements: {
          unlocked: {
            first_contact: {
              achievementId: 'first_contact',
              unlockedAtIso: new Date().toISOString(),
            },
          },
        },
        activeSession: null,
      };

      const result = BackupValidator.validate(JSON.stringify(validPayload));
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.payload?.preferences.locale).toBe('tr');
    });

    it('rejects payload exceeding 2 MB size limit', () => {
      const largeString = 'a'.repeat(2 * 1024 * 1024 + 10);
      const result = BackupValidator.validate(largeString);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('rejects malformed JSON string', () => {
      const result = BackupValidator.validate('{ invalid_json: 123');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Malformed JSON');
    });

    it('defends against prototype pollution attempts', () => {
      const maliciousJson =
        '{"metadata":{"schemaVersion":1},"__proto__":{"isAdmin":true},"preferences":{}}';

      const result = BackupValidator.validate(maliciousJson);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Security check failed');
    });

    it('rejects payload missing required metadata or invalid schema version', () => {
      const missingMeta = {
        preferences: {},
      };
      const resultMissing = BackupValidator.validate(missingMeta);
      expect(resultMissing.isValid).toBe(false);
      expect(resultMissing.errors[0]).toContain('Missing required "metadata" object');

      const invalidVersion = {
        metadata: { schemaVersion: -1 },
      };
      const resultInvalid = BackupValidator.validate(invalidVersion);
      expect(resultInvalid.isValid).toBe(false);
      expect(resultInvalid.errors[0]).toContain('Invalid metadata.schemaVersion');
    });
  });

  describe('ImportExportService', () => {
    it('exports database state to valid JSON string', async () => {
      const json = await service.exportBackupJson();
      const parsed = JSON.parse(json);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.preferences).toBeDefined();
      expect(parsed.highScores).toBeDefined();
      expect(parsed.islandProgress).toBeDefined();
      expect(parsed.achievements).toBeDefined();
    });

    it('imports backup in REPLACE mode to completely overwrite current state', async () => {
      // Setup current database state
      await db.saveHighScores({
        easy: { highScore: 1000, longestSurvivalSeconds: 30, highestCombo: 2, dateAchievedIso: '' },
        normal: {
          highScore: 2000,
          longestSurvivalSeconds: 40,
          highestCombo: 3,
          dateAchievedIso: '',
        },
        hard: { highScore: 3000, longestSurvivalSeconds: 50, highestCombo: 4, dateAchievedIso: '' },
      });

      const newBackup: FullBackupPayload = {
        metadata: { schemaVersion: 1, createdAtIso: '', lastModifiedIso: '' },
        preferences: {
          locale: 'el',
          theme: 'vintage-chart',
          defaultDifficulty: 'hard',
          soundVolume: 0.9,
          ambienceVolume: 0.6,
          musicVolume: 0.6,
          soundMuted: false,
          ambienceMuted: false,
          musicMuted: false,
          hapticsEnabled: true,
          reducedMotion: true,
          highContrast: false,
          graphicsQuality: 'medium',
          tutorialCompleted: true,
          analyticsEnabled: false,
          developerMode: false,
        },
        highScores: {
          easy: {
            highScore: 9000,
            longestSurvivalSeconds: 90,
            highestCombo: 5,
            dateAchievedIso: '',
          },
          normal: {
            highScore: 12000,
            longestSurvivalSeconds: 110,
            highestCombo: 6,
            dateAchievedIso: '',
          },
          hard: {
            highScore: 15000,
            longestSurvivalSeconds: 140,
            highestCombo: 7,
            dateAchievedIso: '',
          },
        },
        islandProgress: {
          discoveredIslands: {
            'island-naxos': {
              islandId: makeIslandId('island-naxos'),
              firstHitDateIso: '',
              lastHitDateIso: '',
              totalHitCount: 3,
              totalPointsContributed: 600,
            },
          },
        },
        achievements: {
          unlocked: {
            first_contact: { achievementId: 'first_contact', unlockedAtIso: '' },
          },
        },
        activeSession: null,
      };

      const report = await service.importBackup(newBackup, 'replace');

      expect(report.success).toBe(true);
      expect(report.mode).toBe('replace');
      expect(report.newDiscoveriesCount).toBe(1);

      const prefs = await db.getPreferences();
      expect(prefs.locale).toBe('el');
      expect(prefs.theme).toBe('vintage-chart');

      const scores = await db.getHighScores();
      expect(scores.hard.highScore).toBe(15000);
    });

    it('imports backup in MERGE mode unioning progress and preserving best scores', async () => {
      // Current DB has island-santorini and high score on normal = 15000
      await db.saveHighScores({
        easy: { highScore: 1000, longestSurvivalSeconds: 20, highestCombo: 1, dateAchievedIso: '' },
        normal: {
          highScore: 15000,
          longestSurvivalSeconds: 120,
          highestCombo: 6,
          dateAchievedIso: '',
        },
        hard: { highScore: 2000, longestSurvivalSeconds: 30, highestCombo: 2, dateAchievedIso: '' },
      });
      await db.saveIslandProgress({
        discoveredIslands: {
          'island-santorini': {
            islandId: makeIslandId('island-santorini'),
            firstHitDateIso: '',
            lastHitDateIso: '',
            totalHitCount: 2,
            totalPointsContributed: 400,
          },
        },
      });

      // Import payload has island-rhodes and higher easy score (5000), but lower normal score (10000)
      const importPayload: FullBackupPayload = {
        metadata: { schemaVersion: 1, createdAtIso: '', lastModifiedIso: '' },
        preferences: {
          locale: 'en',
          theme: 'dark-nautical',
          defaultDifficulty: 'normal',
          soundVolume: 0.8,
          ambienceVolume: 0.5,
          musicVolume: 0.5,
          soundMuted: false,
          ambienceMuted: false,
          musicMuted: false,
          hapticsEnabled: true,
          reducedMotion: false,
          highContrast: false,
          graphicsQuality: 'high',
          tutorialCompleted: true,
          analyticsEnabled: true,
          developerMode: false,
        },
        highScores: {
          easy: {
            highScore: 5000,
            longestSurvivalSeconds: 70,
            highestCombo: 4,
            dateAchievedIso: '',
          },
          normal: {
            highScore: 10000,
            longestSurvivalSeconds: 80,
            highestCombo: 3,
            dateAchievedIso: '',
          },
          hard: {
            highScore: 2000,
            longestSurvivalSeconds: 30,
            highestCombo: 2,
            dateAchievedIso: '',
          },
        },
        islandProgress: {
          discoveredIslands: {
            'island-rhodes': {
              islandId: makeIslandId('island-rhodes'),
              firstHitDateIso: '',
              lastHitDateIso: '',
              totalHitCount: 4,
              totalPointsContributed: 800,
            },
          },
        },
        achievements: {
          unlocked: {
            combo_starter: { achievementId: 'combo_starter', unlockedAtIso: '' },
          },
        },
        activeSession: null,
      };

      const report = await service.importBackup(importPayload, 'merge');

      expect(report.success).toBe(true);
      expect(report.mode).toBe('merge');
      expect(report.updatedHighScores).toContain('easy');
      expect(report.updatedHighScores).not.toContain('normal');
      expect(report.newDiscoveriesCount).toBe(1);

      // Verify merged state
      const islands = await db.getIslandProgress();
      expect(Object.keys(islands.discoveredIslands)).toContain('island-santorini');
      expect(Object.keys(islands.discoveredIslands)).toContain('island-rhodes');

      const scores = await db.getHighScores();
      expect(scores.easy.highScore).toBe(5000);
      expect(scores.normal.highScore).toBe(15000); // Kept higher original!
    });
  });
});
